import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the video belongs to the user and fetch exported clips
    const video = await prisma.video.findFirst({
      where: {
        id,
        userId
      },
      include: {
        exportedClips: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ exportedClips: video.exportedClips });
  } catch (error) {
    console.error('Error fetching exported clips:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
