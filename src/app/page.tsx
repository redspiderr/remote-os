import VideoRecorder from "@/components/VideoRecorder";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-start py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="w-full max-w-3xl mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 text-[#2A6FBB] text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-[#5A7D3F] animate-pulse" />
          MVP v0.1.0
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F9F7F2] mb-3">
          Async Video Standups
        </h1>
        <p className="text-[#6B7280] text-base max-w-lg mx-auto leading-relaxed">
          Record your daily standup in 90 seconds. No meetings, no timezones, just context.
        </p>
      </header>

      {/* Recorder */}
      <main className="w-full max-w-3xl">
        <VideoRecorder />
      </main>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-[#6B7280] text-xs">
          REMOTE OS · MEDINA OS · Stark Team
        </p>
      </footer>
    </div>
  );
}
