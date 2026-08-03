# REMOTE OS — Async Video Standups MVP

**Tech:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4  
**Feature:** WebRTC-based async video standup recording

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features (MVP v0.1.0)

- 🎥 **WebRTC Recording** — 90-second max, live preview
- ⏱️ **Countdown Timer** — visual badge during recording
- ⏯️ **Play / Pause / Resume / Stop** controls
- 📥 **Download** recorded video locally
- 🌑 **Dark Theme** — consistent with Pipeline Studio brand

## Project Structure

```
src/
  app/
    layout.tsx       # Root layout (dark theme)
    page.tsx         # Standup page
    globals.css      # Tailwind + custom vars
  components/
    VideoRecorder.tsx   # Core WebRTC component
```

## Next Steps (Post-MVP)

- Whisper API transcription on upload
- OpenAI GPT summary generation
- Upload to backend / S3
- User auth & team dashboard

---

REMOTE OS · MEDINA OS · Stark Team
