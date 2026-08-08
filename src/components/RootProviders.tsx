'use client';

import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { SkeletonPage } from './LoadingSkeleton';

export default function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SkeletonPage />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
