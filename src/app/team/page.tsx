import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeamOverview from '@/components/TeamOverview';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REMOTE OS — Team Dashboard",
  description: "Manager team dashboard for REMOTE OS.",
};

function isAdminEmail(email?: string | null): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.length > 0 && admins.includes((email ?? '').toLowerCase());
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  // Must be admin or manager/owner of at least one team
  let canAccess = isAdminEmail(session.user.email);
  if (!canAccess) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT 1 FROM team_members WHERE user_id = $1 AND role IN ('owner','manager') LIMIT 1`,
        [session.user.id]
      );
      canAccess = res.rows.length > 0;
    } finally {
      client.release();
    }
  }

  if (!canAccess) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen">
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TeamOverview />
        </div>
      </main>
    </div>
  );
}
