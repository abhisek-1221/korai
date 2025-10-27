import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';

const transcribeVideoSchema = z.object({
  youtubeUrl: z.string().url()
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = transcribeVideoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { youtubeUrl } = validation.data;

    // Trigger the Inngest function
    await inngest.send({
      name: 'video/transcribe.with.speakers',
      data: {
        youtubeUrl,
        userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Transcription started'
    });
  } catch (error) {
    console.error('Error starting transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
