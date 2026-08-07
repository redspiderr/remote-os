import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, stat, mkdir } from 'fs/promises';
import { join } from 'path';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPLOAD_DIR = join('/tmp', 'standups');

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.name?.split('.').pop() || 'webm';
    const filename = `${session.user.id}-${Date.now()}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(arrayBuffer));

    const videoUrl = `/api/upload/video?f=${encodeURIComponent(filename)}`;

    return NextResponse.json({ video_url: videoUrl }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Upload error:', message);
    return NextResponse.json({ error: 'Upload failed', message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('f');

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    // Security: sanitize filename to prevent directory traversal
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeName) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filepath = join(UPLOAD_DIR, safeName);
    const stats = await stat(filepath);

    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await readFile(filepath);

    // Infer content type from extension
    const ext = safeName.split('.').pop()?.toLowerCase() || 'webm';
    const contentTypeMap: Record<string, string> = {
      webm: 'video/webm',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stats.size),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Video serve error:', message);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
