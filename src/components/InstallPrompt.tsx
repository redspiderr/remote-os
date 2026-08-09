'use client';

import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };
    checkInstalled();

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    setIsSafari(isSafariBrowser);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  // iOS Safari — show manual instructions
  if (isIOS && isSafari) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2A6FBB]/15 bg-[#13151f]/95 backdrop-blur-md p-4 pb-safe">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-[#F9F7F2] mb-1">Add to Home Screen</p>
            <p className="text-xs text-[#6B7280]">
              Tap <strong className="text-[#F9F7F2]">Share</strong> then <strong className="text-[#F9F7F2]">Add to Home Screen</strong>.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg bg-[#2A6FBB]/10 text-[#2A6FBB] text-xs font-medium hover:bg-[#2A6FBB]/20 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  // Standard install prompt
  if (!deferredPrompt) return null;

  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2A6FBB]/15 bg-[#13151f]/95 backdrop-blur-md p-4 pb-safe">
      <div className="max-w-lg mx-auto flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#2A6FBB]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#F9F7F2]">Install REMOTE OS</p>
          <p className="text-xs text-[#6B7280]">Add to home screen for quick standups.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="px-4 py-2 rounded-lg bg-[#2A6FBB] text-white text-xs font-semibold hover:bg-[#1f5a9c] transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-2 rounded-lg text-[#6B7280] text-xs font-medium hover:text-[#F9F7F2] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
