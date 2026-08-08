import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminAnalytics from '@/components/AdminAnalytics';
import Image from 'next/image';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REMOTE OS — Admin Console",
  description: "Analytics and administration for REMOTE OS.",
};

function isAdmin(user: { email?: string | null }): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.length > 0 && admins.includes((user.email ?? '').toLowerCase());
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user)) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-[#2A6FBB]/10 bg-[#0f1220] hidden md:flex flex-col">
        <div className="px-5 py-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#2A6FBB] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.75m0 0l-.5 1.5m.75-9l3-3 2.148 2.147A11.96 11.96 0 0118 10.5c-2.162 0-4.188.585-5.93 1.605L7.5 15.75m0 0l3 3" />
              </svg>
            </div>
            <span className="font-bold text-sm text-[#F9F7F2]">REMOTE OS</span>
          </div>
          <p className="text-[10px] text-[#6B7280]">Admin Console</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <a
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#2A6FBB]/10 border border-[#2A6FBB]/15 text-[#2A6FBB] text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Analytics
          </a>

          <a
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#6B7280] hover:text-[#F9F7F2] hover:bg-[#1A1D2E] text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Standups
          </a>
        </nav>

        <div className="px-5 py-4 border-t border-[#2A6FBB]/10">
          <div className="flex items-center gap-2">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? 'Admin'}
                width={28}
                height={28}
                className="rounded-full border border-[#2A6FBB]/20 object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#F9F7F2] truncate">{session.user.name ?? 'Admin'}</p>
              <p className="text-[10px] text-[#6B7280] truncate">{session.user.email ?? ''}</p>
            </div>
          </div>
          <a
            href="/api/auth/signout"
            aria-label="Sign out"
            className="mt-3 block text-center text-xs text-[#6B7280] hover:text-[#E8634B] transition-colors py-1.5 rounded-lg border border-[#2A6FBB]/10 hover:border-[#E8634B]/20 focus:outline-none focus:ring-2 focus:ring-[#2A6FBB]/40"
          >
            Sign out
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AdminAnalytics />
        </div>
      </main>
    </div>
  );
}
