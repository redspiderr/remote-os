'use client';

import React from 'react';
import InstallPrompt from './InstallPrompt';
import PushManager from './PushManager';
import MobileLayout from './MobileLayout';

interface PWAProviderProps {
  children: React.ReactNode;
}

export default function PWAProvider({ children }: PWAProviderProps) {
  return (
    <>
      {children}
      <MobileLayout />
      <InstallPrompt />
    </>
  );
}
