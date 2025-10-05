import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSignedUrlForObject } from '@/lib/aws-s3';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { s3Key } = await req.json();

    if (!s3Key) {
      return NextResponse.json({ error: 's3Key is required' }, { status: 400 });
    }

    // Generate signed URL that expires in 1 hour
    const signedUrl = await getSignedUrlForObject(s3Key, 3600);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
