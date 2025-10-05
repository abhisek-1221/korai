import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { videoId, s3Key, selectedClips, targetLanguage, aspectRatio } = body;

    if (!videoId || !s3Key || !selectedClips || !aspectRatio) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send event to Inngest
    await inngest.send({
      name: 'clips/process',
      data: {
        videoId,
        s3Key,
        selectedClips,
        targetLanguage: targetLanguage || null,
        aspectRatio,
        userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Clip processing started'
    });
  } catch (error) {
    console.error('Error starting clip processing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
