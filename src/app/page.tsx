'use client';

import { useState } from "react";
import { useSession } from "next-auth/react";
import VideoRecorder from "@/components/VideoRecorder";
import StandupDashboard from "@/components/StandupDashboard";
import LoginForm from "@/components/LoginForm";
import SignupForm from "@/components/SignupForm";

type Tab = "record" | "dashboard";

function UserBar() {
  const { data: session, status } = useSession();
  if (status !== "authenticated" || !session?.user) return null;
  return (
    <div className="w-full max-w-5xl mb-6 flex items-center justify-end gap-3">
      {session.user.image && (
        <img
          src={session.user.image}
          alt={session.user.name || ""}
          className="w-8 h-8 rounded-full border border-[#2A6FBB]/20 object-cover"
        />
      )}
      <span className="text-sm text-[#F9F7F2] font-medium">{session.user.name}</span>
      <a
        href="/api/auth/signout"
        className="text-xs text-[#6B7280] hover:text-[#E8634B] transition-colors"
      >
        Sign out
      </a>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("record");
  const [showSignup, setShowSignup] = useState(false);

  const isAuth = status === "authenticated";

  return (
    <div className="flex flex-col flex-1 items-center justify-start py-10 px-4 sm:px-6 lg:px-8 min-h-full">
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 text-center">
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
                  onClick={() => setActiveTab("record")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
            {activeTab === "record" ? <VideoRecorder /> : <StandupDashboard />}
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
