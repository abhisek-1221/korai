import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest';
import { z } from 'zod';

const identifyClipsSchema = z.object({
  youtubeUrl: z.string().url(),
  prompt: z.string().optional().default('')
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = identifyClipsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { youtubeUrl, prompt } = validation.data;

    // Trigger the Inngest function
    await inngest.send({
      name: 'video/identify.clips',
      data: {
        youtubeUrl,
        prompt,
        userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Video processing started'
    });
  } catch (error) {
    console.error('Error identifying clips:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
