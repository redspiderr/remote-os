import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalendarSettings from '@/components/CalendarSettings';
import AvailabilityView from '@/components/AvailabilityView';
import UpcomingEvents from '@/components/UpcomingEvents';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REMOTE OS — Calendar",
  description: "Manage calendar integrations, schedule standups, and view team availability.",
};

export default async function CalendarPage() {
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
              <h1 className="text-2xl font-bold text-[#F9F7F2] tracking-tight">Calendar</h1>
              <p className="text-sm text-[#6B7280] mt-1">Integrations, scheduling, and team availability</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CalendarSettings />
              <AvailabilityView />
            </div>
            <div className="lg:col-span-1">
              <UpcomingEvents />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
