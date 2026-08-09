'use client';

import React, { Suspense, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { SkeletonPage } from './LoadingSkeleton';

export default function RootProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent fail — PWA enhancements are best-effort
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
