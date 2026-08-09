'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/focus', label: 'Focus' },
  { href: '/teams', label: 'Teams' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/ai-coach', label: 'AI Coach' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/admin', label: 'Admin' },
];

export default function Navbar() {
  const { status } = useSession();
  const pathname = usePathname();
  const isAuth = status === 'authenticated';

  if (!isAuth) return null;

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 border-b border-[#2A6FBB]/10 bg-[#0B0D17]/80 backdrop-blur"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar">
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className="w-6 h-6 rounded-md bg-[#2A6FBB] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.75m0 0l-.5 1.5m.75-9l3-3 2.148 2.147A11.96 11.96 0 0118 10.5c-2.162 0-4.188.585-5.93 1.605L7.5 15.75m0 0l3 3" />
              </svg>
            </div>
            <span className="text-xs font-bold text-[#F9F7F2] tracking-wide">REMOTE OS</span>
          </div>

          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <a
                key={link.href}
                href={link.href}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#2A6FBB]/10 text-[#2A6FBB] border border-[#2A6FBB]/20'
                    : 'text-[#6B7280] hover:text-[#F9F7F2] hover:bg-[#1A1D2E]'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
