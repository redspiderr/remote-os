import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob: number;
  no_speech_prob: number;
}

interface WhisperVerboseResponse {
  text: string;
  language: string;
  duration: number;
  segments: WhisperSegment[];
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY FIX: Add authentication check
    const session = await auth();
    if (!session?.user?.id) {
      await logSecurityEvent({
        eventType: 'auth_failure',
        severity: 'warning',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/transcribe',
        method: 'POST',
        statusCode: 401,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const standupId = formData.get('standup_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Expected multipart/form-data field named "file".' },
        { status: 400 }
      );
    }

    // Validate size (soft limit ~25MB to avoid blowing up memory / API limits)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Max 25MB.' },
        { status: 413 }
      );
    }

    // SECURITY FIX: Verify standup ownership before transcribing
    if (standupId) {
      const client = await db.pool.connect();
      try {
        const ownershipRes = await client.query(
          'SELECT user_id FROM standups WHERE id = $1',
          [standupId]
        );
        if (ownershipRes.rows.length === 0) {
          return NextResponse.json({ error: 'Standup not found' }, { status: 404 });
        }
        if (ownershipRes.rows[0].user_id !== session.user.id) {
          await logSecurityEvent({
            eventType: 'unauthorized_access',
            severity: 'warning',
            user_id: session.user.id,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            endpoint: '/api/transcribe',
            method: 'POST',
            statusCode: 403,
          });
          return NextResponse.json({ error: 'Forbidden — not your standup' }, { status: 403 });
        }
      } finally {
        client.release();
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const openaiForm = new FormData();
    const blob = new Blob([buffer], { type: file.type || 'video/webm' });
    openaiForm.append('file', blob, file.name || 'recording.webm');
    openaiForm.append('model', 'whisper-1');
    openaiForm.append('response_format', 'verbose_json');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: OPENAI_API_KEY is not set.' },
        { status: 500 }
      );
    }

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openaiForm,
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error('Whisper API error:', openaiRes.status, errorText);
      return NextResponse.json(
        { error: 'Whisper API error' },
        { status: openaiRes.status }
      );
    }

    const whisperData = (await openaiRes.json()) as WhisperVerboseResponse;

    const transcript = whisperData.text || '';
    const language = whisperData.language || 'unknown';
    const duration = typeof whisperData.duration === 'number' ? whisperData.duration : 0;

    // Approximate confidence from avg_logprob across segments (closer to 0 is better)
    let confidence: number | null = null;
    if (whisperData.segments && whisperData.segments.length > 0) {
      const avgLogprob =
        whisperData.segments.reduce((sum, seg) => sum + (seg.avg_logprob || 0), 0) /
        whisperData.segments.length;
      // Map [-1, 0] roughly to [0, 1]. Values below -1 are clamped.
      confidence = Math.min(1, Math.max(0, 1 + avgLogprob));
    }

    // Update standup with transcript if standupId provided
    if (standupId) {
      const client = await db.pool.connect();
      try {
        await client.query(
          `UPDATE standups
           SET transcript = $1,
               status = 'transcribed'
           WHERE id = $2`,
          [transcript, standupId]
        );
      } finally {
        client.release();
      }
    }

    return NextResponse.json({
      transcript,
      language,
      duration,
      confidence,
      segments: whisperData.segments || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Transcription route error:', message);
    // SECURITY FIX: Generic error message
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
