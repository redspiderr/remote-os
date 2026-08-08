'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  isOpen?: boolean;
  storageKey?: string;
}

export function hasSeenTutorial(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function markTutorialSeen(key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, 'true');
  }
}

export default function TutorialOverlay({
  steps,
  onComplete,
  onSkip,
  isOpen = true,
  storageKey = 'remote-os-tutorial-seen',
}: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [targetFound, setTargetFound] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const step = steps[currentStep];

  const computePosition = useCallback(() => {
    if (!step) return;
    const target = document.getElementById(step.targetId);
    if (!target) {
      setTargetFound(false);
      return;
    }
    setTargetFound(true);
    const rect = target.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });

    const placement = step.placement || 'bottom';
    const tooltipWidth = 280;
    const tooltipHeight = 140;
    const gap = 12;
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top + window.scrollY - tooltipHeight - gap;
        left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + window.scrollY + gap;
        left = rect.left + window.scrollX + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.left + window.scrollX - tooltipWidth - gap;
        break;
      case 'right':
        top = rect.top + window.scrollY + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + window.scrollX + gap;
        break;
    }

    // viewport clamp
    const pad = 16;
    top = Math.max(pad, Math.min(top, window.innerHeight + window.scrollY - tooltipHeight - pad));
    left = Math.max(pad, Math.min(left, window.innerWidth + window.scrollX - tooltipWidth - pad));

    setTooltipPos({ top, left });
  }, [step]);

  useEffect(() => {
    if (!isOpen || steps.length === 0) return;
    setVisible(false);
    const t = setTimeout(() => {
      computePosition();
      setVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [isOpen, currentStep, steps, computePosition]);

  useEffect(() => {
    const handle = () => computePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [computePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setVisible(false);
      setTimeout(() => setCurrentStep((s) => s + 1), 250);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    markTutorialSeen(storageKey);
    setExiting(true);
    setTimeout(() => {
      onComplete?.();
    }, 400);
  };

  const handleSkip = () => {
    markTutorialSeen(storageKey);
    setExiting(true);
    setTimeout(() => {
      onSkip?.();
    }, 400);
  };

  if (!isOpen || steps.length === 0) return null;

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
        exiting ? 'opacity-0 pointer-events-none' : visible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={!visible}
    >
      {/* Dark backdrop with cutout */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetFound && (
              <rect
                x={position.left - 8}
                y={position.top - 8}
                width={position.width + 16}
                height={position.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(11,13,23,0.85)" mask="url(#tutorial-mask)" />
      </svg>

      {/* Spotlight ring around target */}
      {targetFound && (
        <div
          className="absolute rounded-xl border-2 border-[#2A6FBB]/60 shadow-[0_0_0_4px_rgba(42,111,187,0.15)] pointer-events-none transition-all duration-300"
          style={{
            top: position.top - 8,
            left: position.left - 8,
            width: position.width + 16,
            height: position.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute z-[101] w-[280px] rounded-2xl border border-[#2A6FBB]/20 bg-[#1A1D2E] shadow-2xl shadow-black/40 p-5 transition-all duration-300"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Arrow */}
        <div
          className="absolute w-3 h-3 bg-[#1A1D2E] border-l border-t border-[#2A6FBB]/20 rotate-45"
          style={{
            top:
              step?.placement === 'bottom' || !step?.placement
                ? '-7px'
                : step.placement === 'top'
                ? 'calc(100% - 5px)'
                : '50%',
            left:
              step?.placement === 'right'
                ? '-7px'
                : step?.placement === 'left'
                ? 'calc(100% - 5px)'
                : '50%',
            transform:
              step?.placement === 'left' || step?.placement === 'right'
                ? 'translateY(-50%) rotate(45deg)'
                : 'translateX(-50%) rotate(45deg)',
          }}
        />

        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2A6FBB]">
            Tip {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-[10px] text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
          >
            Skip
          </button>
        </div>

        <h3 className="text-sm font-semibold text-[#F9F7F2] mb-1">{step?.title}</h3>
        <p className="text-xs text-[#6B7280] leading-relaxed mb-4">{step?.content}</p>

        {/* Progress */}
        <div className="h-1 w-full rounded-full bg-[#0B0D17] overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-[#2A6FBB] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-[#6B7280] hover:text-[#F9F7F2] transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A6FBB] text-white text-xs font-semibold hover:bg-[#1f5a9c] transition-colors shadow-md shadow-[#2A6FBB]/20"
          >
            {currentStep === steps.length - 1 ? 'Finish' : 'Next tip'}
            {currentStep < steps.length - 1 && (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
