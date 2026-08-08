'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0B0D17] px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2A6FBB]/20 bg-[#1A1D2E] p-8 text-center shadow-lg">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2A6FBB]/10">
                <svg
                  className="h-8 w-8 text-[#2A6FBB]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.994-1.85L21 12a9 9 0 10-18 0l.05 3.15c.076 1.034.94 1.85 1.994 1.85z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-[#F9F7F2]">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-[#F9F7F2]/60">
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-32 overflow-auto rounded-lg bg-[#0B0D17] p-3 text-left text-xs text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center rounded-lg bg-[#2A6FBB] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2A6FBB]/80 focus:outline-none focus:ring-2 focus:ring-[#2A6FBB] focus:ring-offset-2 focus:ring-offset-[#0B0D17]"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
