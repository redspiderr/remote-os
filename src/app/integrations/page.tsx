import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import IntegrationsPanel from '@/components/IntegrationsPanel';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REMOTE OS — Integrations",
  description: "Connect Slack, Discord, Notion, GitHub, and more.",
};

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-[#0B0D17]">
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">Integrations</h1>
              <p className="text-sm text-[#6B7280] mt-1">Connect your team tools to REMOTE OS.</p>
            </div>
          </div>

          <IntegrationsPanel />
        </div>
      </main>
    </div>
  );
}
