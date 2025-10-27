import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSpeakerSchema = z.object({
  speakerMappings: z.record(z.string(), z.string()) // { "SPEAKER_00": "John Doe", ... }
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const transcription = await prisma.transcription.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validation = updateSpeakerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { speakerMappings } = validation.data;

    // Update speaker names in bulk
    const updatePromises = Object.entries(speakerMappings).map(
      ([speaker, speakerName]) =>
        prisma.transcriptionSegment.updateMany({
          where: {
            transcriptionId: id,
            speaker
          },
          data: {
            speakerName
          }
        })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating speaker names:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
