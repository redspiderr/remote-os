import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Storage configuration
// In production, use AWS S3 or Cloudflare R2
// For now, store in local filesystem or return signed URL

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Validate file type
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: webm, mp4, mov' },
        { status: 400 }
      );
    }

    // Validate size (max 100MB for videos)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 100MB.' },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if S3 is configured
    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
    const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;

    let videoUrl: string;

    if (s3Bucket && s3Endpoint && s3AccessKey && s3SecretKey) {
      // Upload to S3/R2
      videoUrl = await uploadToS3(buffer, file.name, file.type, s3Bucket, s3Endpoint, s3AccessKey, s3SecretKey);
    } else {
      // Fallback: Save to local filesystem (for development)
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const fileName = `${Date.now()}-${file.name || 'recording.webm'}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      
      videoUrl = `/uploads/videos/${fileName}`;
      console.log(`Video saved locally: ${filePath}`);
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      size: file.size,
      type: file.type,
      storage: s3Bucket ? 's3' : 'local',
    }, { status: 201 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Upload error:', message);
    return NextResponse.json(
      { error: 'Upload failed', message },
      { status: 500 }
    );
  }
}

async function uploadToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string,
  bucket: string,
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string
): Promise<string> {
  // S3 upload implementation using AWS SDK v3
  // For production, install @aws-sdk/client-s3
  
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  
  const s3Client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  const key = `videos/${Date.now()}-${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    })
  );

  // Return public URL
  const publicUrl = `${endpoint}/${bucket}/${key}`;
  console.log(`Video uploaded to S3: ${publicUrl}`);
  
  return publicUrl;
}
