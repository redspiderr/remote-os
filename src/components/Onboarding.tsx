'use client';

import React, { useState, useEffect, useCallback } from 'react';
import VideoRecorder from './VideoRecorder';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface OnboardingData {
  teamEmails: string[];
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface OnboardingProps {
  onComplete?: () => void;
}

const STEPS = 5;

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('remote-os-onboarding-complete') === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingComplete() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('remote-os-onboarding-complete', 'true');
  }
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [data, setData] = useLocalStorage<OnboardingData>('remote-os-onboarding-data', {
    teamEmails: [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    emailNotifications: true,
    pushNotifications: false,
  });
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [showConfetti, setShowConfetti] = useState(false);

  const goNext = useCallback(() => {
    if (step < STEPS) {
      setDirection('forward');
      setStep((s) => (s + 1) as OnboardingStep);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setDirection('back');
      setStep((s) => (s - 1) as OnboardingStep);
    }
  }, [step]);

  const addEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (data.teamEmails.includes(trimmed)) {
      setEmailError('This email is already added.');
      return;
    }
    setEmailError('');
    setData((prev) => ({ ...prev, teamEmails: [...prev.teamEmails, trimmed] }));
    setEmailInput('');
  };

  const removeEmail = (email: string) => {
    setData((prev) => ({ ...prev, teamEmails: prev.teamEmails.filter((e) => e !== email) }));
  };

  const handleFinish = () => {
    markOnboardingComplete();
    setShowConfetti(true);
    setTimeout(() => {
      onComplete?.();
    }, 2500);
  };

  const progressPct = ((step - 1) / (STEPS - 1)) * 100;

  return (
    <div className="min-h-screen w-full bg-[#0B0D17] text-[#F9F7F2] flex flex-col items-center justify-center px-4 py-10">
      {/* Progress bar */}
      <div className="w-full max-w-xl mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#2A6FBB] uppercase tracking-wider">
            Step {step} of {STEPS}
          </span>
          <span className="text-xs text-[#6B7280]">{Math.round(progressPct)}% complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#1A1D2E] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2A6FBB] to-[#5A7D3F] transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-xl">
        <div
          key={step}
          className={`transition-all duration-500 ease-out ${
            direction === 'forward' ? 'animate-slideInRight' : 'animate-slideInLeft'
          }`}
        >
          {step === 1 && <StepWelcome onNext={goNext} />}
          {step === 2 && <StepRecordStandup onNext={goNext} onBack={goBack} />}
          {step === 3 && (
            <StepInviteTeam
              emails={data.teamEmails}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              emailError={emailError}
              onAddEmail={addEmail}
              onRemoveEmail={removeEmail}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 4 && (
            <StepPreferences
              timezone={data.timezone}
              onTimezoneChange={(tz) => setData((prev) => ({ ...prev, timezone: tz }))}
              emailNotifications={data.emailNotifications}
              onToggleEmail={() => setData((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
              pushNotifications={data.pushNotifications}
              onTogglePush={() => setData((prev) => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
              onNext={goNext}
              onBack={goBack}
            />
          )}
          {step === 5 && <StepCelebration onFinish={handleFinish} showConfetti={showConfetti} />}
        </div>
      </div>

      {/* Global styles for onboarding animations */}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.5s ease-out forwards;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes pop {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-pop {
          animation: pop 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Step 1: Welcome ────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2A6FBB]/20 to-[#5A7D3F]/20 border border-[#2A6FBB]/20 flex items-center justify-center mb-8 animate-float shadow-xl shadow-[#2A6FBB]/10">
        <svg className="w-12 h-12 text-[#2A6FBB]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38V19m0-2v-2m2.95-5.11a6 6 0 00-5.84-7.38v1.63m0 2v2m5.84 7.38V19m0-2v-2m-2.95-5.11a6 6 0 015.84-7.38v1.63m0 2v2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
        Welcome to <span className="text-[#2A6FBB]">REMOTE OS</span>
      </h2>
      <p className="text-[#6B7280] text-base max-w-md leading-relaxed mb-2">
        The async video standup platform built for remote teams. Record updates, stay in sync, and reclaim your calendar.
      </p>
      <ul className="text-sm text-[#F9F7F2]/70 space-y-2 mt-6 mb-10 text-left inline-block">
        <li className="flex items-start gap-2">
          <span className="text-[#5A7D3F] mt-0.5">✓</span>
          <span>90-second video standups — no meetings required</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#5A7D3F] mt-0.5">✓</span>
          <span>Auto-transcribe & AI summaries powered by Whisper + GPT</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-[#5A7D3F] mt-0.5">✓</span>
          <span>Team dashboard with health metrics & search</span>
        </li>
      </ul>

      <button
        onClick={onNext}
        className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2A6FBB] text-white font-semibold text-sm hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20 animate-pop"
      >
        Get Started
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}

// ─── Step 2: Record First Standup ───────────────────────────────────

function StepRecordStandup({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [doneRecording, setDoneRecording] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Record Your First Standup</h2>
        <p className="text-[#6B7280] text-sm max-w-md mx-auto">
          Try it out! Click Start Recording, say a quick hello, then stop and save. No pressure.
        </p>
      </div>

      <div className="w-full max-w-2xl mb-6">
        <VideoRecorder />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl border border-[#6B7280]/30 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] hover:border-[#F9F7F2]/30 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            setDoneRecording(true);
            onNext();
          }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
      {doneRecording && (
        <p className="text-xs text-[#5A7D3F] mt-3">Nice work! Standup recorded.</p>
      )}
    </div>
  );
}

// ─── Step 3: Invite Team ────────────────────────────────────────────

function StepInviteTeam({
  emails,
  emailInput,
  setEmailInput,
  emailError,
  onAddEmail,
  onRemoveEmail,
  onNext,
  onBack,
}: {
  emails: string[];
  emailInput: string;
  setEmailInput: (v: string) => void;
  emailError: string;
  onAddEmail: () => void;
  onRemoveEmail: (email: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 mb-4">
          <svg className="w-8 h-8 text-[#2A6FBB]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5 2.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m11.31-1.88a3 3 0 01-3.99-2.68m-11.31 1.88a3 3 0 01-3.99-2.68M12 15a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Invite Your Team</h2>
        <p className="text-[#6B7280] text-sm max-w-sm mx-auto">
          Add teammates by email. They&apos;ll get an invite link when REMOTE OS launches team invites.
        </p>
      </div>

      <div className="w-full max-w-md mb-6">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddEmail();
              }
            }}
            placeholder="colleague@company.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/15 text-sm text-[#F9F7F2] placeholder:text-[#6B7280] focus:outline-none focus:border-[#2A6FBB]/40 focus:ring-1 focus:ring-[#2A6FBB]/20 transition-all"
          />
          <button
            onClick={onAddEmail}
            className="px-4 py-2.5 rounded-xl bg-[#5A7D3F] text-white text-sm font-semibold hover:bg-[#4c6b35] transition-colors"
          >
            Add
          </button>
        </div>
        {emailError && <p className="text-xs text-[#E8634B] mt-1">{emailError}</p>}

        <div className="mt-4 space-y-2">
          {emails.length === 0 && (
            <p className="text-xs text-[#6B7280] italic">No emails added yet. You can skip this step.</p>
          )}
          {emails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1A1D2E] border border-[#2A6FBB]/10 text-sm text-[#F9F7F2]"
            >
              <span>{email}</span>
              <button
                onClick={() => onRemoveEmail(email)}
                className="text-[#6B7280] hover:text-[#E8634B] transition-colors"
                aria-label={`Remove ${email}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl border border-[#6B7280]/30 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] hover:border-[#F9F7F2]/30 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Preferences ──────────────────────────────────────────

function StepPreferences({
  timezone,
  onTimezoneChange,
  emailNotifications,
  onToggleEmail,
  pushNotifications,
  onTogglePush,
  onNext,
  onBack,
}: {
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  emailNotifications: boolean;
  onToggleEmail: () => void;
  pushNotifications: boolean;
  onTogglePush: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const Toggle = ({
    label,
    description,
    checked,
    onChange,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium text-[#F9F7F2]">{label}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-[#5A7D3F]' : 'bg-[#6B7280]/30'
        }`}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 mb-4">
          <svg className="w-8 h-8 text-[#2A6FBB]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.1.2-.17.33-.22a1 1 0 01.66 0c.12.05.23.12.33.22l6.7 6.7a1 1 0 01-1.42 1.41l-5.28-5.28v8.44a1 1 0 11-2 0V6.77l-5.28 5.28a1 1 0 01-1.42-1.41l6.7-6.7z" />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Set Your Preferences</h2>
        <p className="text-[#6B7280] text-sm max-w-sm mx-auto">
          Configure how REMOTE OS works for you. You can always change these later.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-[#2A6FBB]/10 bg-[#1A1D2E] px-5 mb-8">
        <div className="py-4 border-b border-[#2A6FBB]/10">
          <label className="block text-sm font-medium text-[#F9F7F2] mb-2">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#0B0D17] border border-[#2A6FBB]/15 text-sm text-[#F9F7F2] focus:outline-none focus:border-[#2A6FBB]/40 transition-all"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <Toggle
          label="Email Notifications"
          description="Receive daily standup summaries and team updates via email."
          checked={emailNotifications}
          onChange={onToggleEmail}
        />
        <Toggle
          label="Push Notifications"
          description="Browser push alerts when teammates submit standups."
          checked={pushNotifications}
          onChange={onTogglePush}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl border border-[#6B7280]/30 text-[#6B7280] text-sm font-medium hover:text-[#F9F7F2] hover:border-[#F9F7F2]/30 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#1f5a9c] transition-colors shadow-lg shadow-[#2A6FBB]/20"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Celebration ────────────────────────────────────────────

function StepCelebration({ onFinish, showConfetti }: { onFinish: () => void; showConfetti: boolean }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!showConfetti) return;
    let animationId: number;

    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#2A6FBB', '#5A7D3F', '#E8634B', '#F9F7F2', '#6B7280'];
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.5 + 0.5,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.05; // gravity

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.vy = Math.random() * 4 + 2;
        }
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();
    setStarted(true);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [showConfetti]);

  return (
    <div className="flex flex-col items-center text-center relative">
      {showConfetti && (
        <canvas
          id="confetti-canvas"
          className="fixed inset-0 pointer-events-none z-50"
          style={{ width: '100%', height: '100%' }}
        />
      )}

      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5A7D3F]/20 to-[#2A6FBB]/20 border border-[#5A7D3F]/20 flex items-center justify-center mb-6 animate-pop shadow-xl shadow-[#5A7D3F]/10">
        <svg className="w-12 h-12 text-[#5A7D3F]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        You&apos;re Ready!
      </h2>
      <p className="text-[#6B7280] text-base max-w-sm mx-auto leading-relaxed mb-8">
        Your account is set up and your first standup is in the system. Start recording daily updates and keep your team in sync.
      </p>

      <button
        onClick={onFinish}
        disabled={!started}
        className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${
          started
            ? 'bg-[#5A7D3F] text-white hover:bg-[#4c6b35] shadow-[#5A7D3F]/20 cursor-pointer'
            : 'bg-[#6B7280]/30 text-[#6B7280] cursor-not-allowed'
        }`}
      >
        Go to Dashboard
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
