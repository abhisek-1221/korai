import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { inngest } from '@/lib/inngest';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptionId } = await params;

    // Verify transcription belongs to user
    const transcription = await prisma.transcription.findUnique({
      where: {
        id: transcriptionId,
        userId
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Trigger Inngest function
    await inngest.send({
      name: 'transcription/generate.mindmap',
      data: {
        transcriptionId,
        userId
      }
    });

    return NextResponse.json({
      message: 'Mindmap generation started',
      transcriptionId
    });
  } catch (error) {
    console.error('Error triggering mindmap generation:', error);
    return NextResponse.json(
      { error: 'Failed to start mindmap generation' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: transcriptionId } = await params;

    // Verify transcription belongs to user
    const transcription = await prisma.transcription.findUnique({
      where: {
        id: transcriptionId,
        userId
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Fetch mindmap data
    const mindmap = await prisma.mindmap.findUnique({
      where: { transcriptionId }
    });

    if (!mindmap) {
      return NextResponse.json({
        status: 'not_started',
        mindmap: null
      });
    }

    return NextResponse.json({
      status: mindmap.status,
      mindmap: mindmap.status === 'completed' ? mindmap.data : null
    });
  } catch (error) {
    console.error('Error fetching mindmap:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mindmap status' },
      { status: 500 }
    );
  }
}
