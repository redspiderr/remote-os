import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
// In production: use Redis (e.g., Upstash Redis)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  if (!store[identifier] || store[identifier].resetTime < now) {
    store[identifier] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return { allowed: true, remaining: maxRequests - 1, reset: store[identifier].resetTime };
  }
  
  store[identifier].count++;
  const remaining = Math.max(0, maxRequests - store[identifier].count);
  
  if (store[identifier].count > maxRequests) {
    return { allowed: false, remaining: 0, reset: store[identifier].resetTime };
  }
  
  return { allowed: true, remaining, reset: store[identifier].resetTime };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

// Middleware for API routes
export async function rateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
  const path = request.nextUrl.pathname;
  
  // Different limits for different endpoints
  let maxRequests = 60;
  let windowSeconds = 60;
  
  if (path.includes('/api/auth')) {
    maxRequests = 10;  // Stricter for auth
    windowSeconds = 60;
  } else if (path.includes('/api/transcribe') || path.includes('/api/summarize')) {
    maxRequests = 30;  // AI endpoints
    windowSeconds = 60;
  }
  
  const identifier = `${ip}:${path}`;
  const result = rateLimit(identifier, maxRequests, windowSeconds);
  
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.reset),
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      }
    );
  }
  
  return null;
}
