import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/rate-limit";
import { logSecurityEvent, logApiAccess } from "@/lib/security-logger";
import { recordApiBurst, recordOffHoursAccess, shouldThrottle } from "@/lib/intrusion-detection";

const PUBLIC_PATHS = ["/api/auth", "/api/health", "/_next", "/favicon.ico", "/images", "/public", "/blog", "/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';

  // Intrusion Detection: auto-throttle suspicious IPs
  if (shouldThrottle(ip)) {
    logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'critical',
      ip,
      endpoint: pathname,
      method: request.method,
      details: { reason: 'auto_throttle_suspicious_ip' },
    });
    return NextResponse.json(
      { error: 'Request blocked due to suspicious activity.' },
      { status: 403 }
    );
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse) {
      logSecurityEvent({
        eventType: 'rate_limit_hit',
        severity: 'warning',
        ip,
        endpoint: pathname,
        method: request.method,
        statusCode: 429,
        details: { reason: 'rate_limit_exceeded' },
      });
      recordApiBurst({ ip, endpoint: pathname, method: request.method });
      return rateLimitResponse;
    }
  }

  // Off-hours anomaly detection
  recordOffHoursAccess({ ip, endpoint: pathname });

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    logSecurityEvent({
      eventType: 'auth_failure',
      severity: 'warning',
      ip,
      endpoint: pathname,
      method: request.method,
      statusCode: 401,
      details: { reason: 'unauthenticated_access_attempt' },
    });
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Log successful API access for authenticated users
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next();
    // Fire-and-forget logging
    logApiAccess({
      request: {
        headers: request.headers,
        url: request.url,
        method: request.method,
      },
      userId: session.user.id,
      email: session.user.email,
      statusCode: 200,
    }).catch(() => {});
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
