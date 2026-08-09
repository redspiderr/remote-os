'use client';

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import VideoRecorder from "@/components/VideoRecorder";
import StandupDashboard from "@/components/StandupDashboard";
import MobileDashboard from "@/components/MobileDashboard";
import OfflineRecorder from "@/components/OfflineRecorder";
import LoginForm from "@/components/LoginForm";
import SignupForm from "@/components/SignupForm";
import TutorialOverlay, { hasSeenTutorial } from "@/components/TutorialOverlay";
import { isOnboardingComplete } from "@/components/Onboarding";

type Tab = "record" | "dashboard";

function UserBar() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) return null;
  return (
    <div className="w-full max-w-5xl mb-6 flex items-center justify-end gap-3">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name || "User avatar"}
          width={32}
          height={32}
          className="rounded-full border border-[#2A6FBB]/20 object-cover"
        />
      )}
      <span className="text-sm text-[#F9F7F2] font-medium">{session.user.name}</span>
      <a
        href="/api/auth/signout"
        aria-label="Sign out"
        className="text-xs text-[#6B7280] hover:text-[#E8634B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40 rounded"
      >
        Sign out
      </a>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [showSignup, setShowSignup] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const isAuth = status === "authenticated";

  useEffect(() => {
    if (status === "loading") return;
    if (isAuth && !isOnboardingComplete()) {
      router.replace("/onboarding");
      return;
    }
    if (isAuth && !hasSeenTutorial("remote-os-home-tutorial")) {
      // small delay so UI renders before attaching overlays
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, [status, isAuth, router]);

  const tutorialSteps = [
    {
      targetId: "tab-record",
      title: "Record Standups",
      content: "Switch to the Record tab to capture your daily 90-second video update. It auto-transcribes and summarizes with AI.",
      placement: "bottom" as const,
    },
    {
      targetId: "tab-dashboard",
      title: "Team Dashboard",
      content: "Browse your team's standups here. Filter by today, this week, or search transcripts and summaries.",
      placement: "bottom" as const,
    },
    {
      targetId: "header-badge",
      title: "Health at a Glance",
      content: "Track team participation, average duration, and submission trends without a single meeting.",
      placement: "bottom" as const,
    },
  ];

  return (
    <div className="flex flex-col flex-1 items-center justify-start py-10 px-4 sm:px-6 lg:px-8 min-h-full">
      {isAuth && showTutorial && (
        <TutorialOverlay
          steps={tutorialSteps}
          storageKey="remote-os-home-tutorial"
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}

      {/* Header */}
      <header id="header-badge" className="w-full max-w-5xl mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 text-[#2A6FBB] text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-[#5A7D3F] animate-pulse" />
          MVP v0.5.0
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F9F7F2] mb-3">
          Async Video Standups
        </h1>
        <p className="text-[#6B7280] text-base max-w-lg mx-auto leading-relaxed">
          Record your daily standup in 90 seconds. No meetings, no timezones, just context.
        </p>
      </header>

      {isAuth && <UserBar />}

      {isAuth ? (
        <>
          {/* Tabs */}
          <div className="w-full max-w-5xl mb-8">
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#1A1D2E] border border-[#2A6FBB]/10">
                <button
                  id="tab-record"
                  onClick={() => setActiveTab("record")}
                  aria-label="Switch to Record tab"
                  aria-pressed={activeTab === "record"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40 ${
                    activeTab === "record"
                      ? "bg-[#2A6FBB] text-white shadow-lg shadow-[#2A6FBB]/20"
                      : "text-[#6B7280] hover:text-[#F9F7F2]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Record
                </button>
                <button
                  id="tab-dashboard"
                  onClick={() => setActiveTab("dashboard")}
                  aria-label="Switch to Dashboard tab"
                  aria-pressed={activeTab === "dashboard"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40 ${
                    activeTab === "dashboard"
                      ? "bg-[#2A6FBB] text-white shadow-lg shadow-[#2A6FBB]/20"
                      : "text-[#6B7280] hover:text-[#F9F7F2]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="w-full max-w-5xl">
            {activeTab === "record" ? (
              <>
                <div className="hidden md:block"><VideoRecorder /></div>
                <div className="md:hidden"><OfflineRecorder /></div>
              </>
            ) : (
              <>
                <div className="hidden md:block"><StandupDashboard /></div>
                <div className="md:hidden">
                  <MobileDashboard standups={[]} onPlay={(s) => console.log('play', s)} />
                </div>
              </>
            )}
          </main>
        </>
      ) : (
        <>
          {showSignup ? (
            <SignupForm
              onToggle={() => setShowSignup(false)}
              onSuccess={() => {
                setShowSignup(false);
                window.location.reload();
              }}
            />
          ) : (
            <LoginForm onToggle={() => setShowSignup(true)} />
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-[#6B7280] text-xs">
          REMOTE OS · MEDINA OS · Stark Team
        </p>
      </footer>
    </div>
  );
}
