'use client';

import React, { useState, useEffect } from 'react';

interface PushManagerState {
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}

async function subscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BEl62iM4Uq5Lf9RdB9k3uR0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Qf5R0uXq5Q='
    ) as BufferSource,
  });
  await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager() {
  const [state, setState] = useState<PushManagerState>({
    supported: false,
    permission: null,
    subscribed: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setState((s) => ({
      ...s,
      supported,
      permission: supported ? Notification.permission : null,
    }));

    if (!supported) return;

    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setState((s) => ({ ...s, subscribed: !!sub }));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const requestPermission = async () => {
    const perm = await Notification.requestPermission();
    setState((s) => ({ ...s, permission: perm }));
    if (perm === 'granted') {
      await subscribePush();
      setState((s) => ({ ...s, subscribed: true }));
    }
  };

  const toggleSubscription = async () => {
    if (state.subscribed) {
      await unsubscribePush();
      setState((s) => ({ ...s, subscribed: false }));
    } else {
      if (state.permission !== 'granted') {
        await requestPermission();
        return;
      }
      await subscribePush();
      setState((s) => ({ ...s, subscribed: true }));
    }
  };

  if (!state.supported) {
    return (
      <div className="rounded-xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-4 text-sm text-[#6B7280]">
        Push notifications are not supported on this device.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A6FBB]/10 bg-[#1A1D2E] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#F9F7F2]">Push Notifications</h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            state.subscribed
              ? 'bg-[#5A7D3F]/10 text-[#5A7D3F] border-[#5A7D3F]/20'
              : 'bg-[#E8634B]/10 text-[#E8634B] border-[#E8634B]/20'
          }`}
        >
          {state.subscribed ? 'On' : 'Off'}
        </span>
      </div>
      <p className="text-xs text-[#6B7280] mb-4">
        Get notified when teammates post standups or when focus sessions complete.
      </p>

      {state.permission !== 'granted' ? (
        <button
          onClick={requestPermission}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2A6FBB] text-white text-sm font-medium hover:bg-[#1f5a9c] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Enable Notifications
        </button>
      ) : (
        <button
          onClick={toggleSubscription}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            state.subscribed
              ? 'bg-[#E8634B]/10 text-[#E8634B] border border-[#E8634B]/20 hover:bg-[#E8634B]/20'
              : 'bg-[#5A7D3F]/10 text-[#5A7D3F] border border-[#5A7D3F]/20 hover:bg-[#5A7D3F]/20'
          }`}
        >
          {state.subscribed ? 'Unsubscribe' : 'Subscribe'}
        </button>
      )}
    </div>
  );
}
