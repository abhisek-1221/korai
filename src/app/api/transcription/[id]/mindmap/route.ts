import { generateObject } from 'ai';
import { NextResponse } from 'next/server';
import { getModel, DEFAULT_MODEL } from '@/lib/providers';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

// Schema for mindmap nodes
const MindmapNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  category: z.enum(['main', 'topic', 'subtopic', 'detail'])
});

const MindmapEdgeSchema = z.object({
  source: z.string(),
  target: z.string()
});

const MindmapSchema = z.object({
  title: z.string(),
  nodes: z.array(MindmapNodeSchema),
  edges: z.array(MindmapEdgeSchema)
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const transcriptionId = params.id;

    // Fetch the transcription with segments
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptionId, userId },
      include: {
        segments: {
          orderBy: { start: 'asc' }
        }
      }
    });

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Combine all segments into a full transcript
    const fullTranscript = transcription.segments
      .map((seg) => {
        const speaker = seg.speakerName || seg.speaker;
        return `${speaker}: ${seg.text}`;
      })
      .join('\n');

    // Truncate if too long (to stay within token limits)
    const maxLength = 15000;
    const truncatedTranscript =
      fullTranscript.length > maxLength
        ? fullTranscript.substring(0, maxLength) + '...[truncated]'
        : fullTranscript;

    const selectedModel = getModel(DEFAULT_MODEL);

    // Generate mindmap structure using AI
    const result = await generateObject({
      model: selectedModel as any,
      schema: MindmapSchema,
      system: `You are an expert at analyzing transcripts and creating hierarchical mindmaps.
Create a comprehensive mindmap that captures the key concepts, topics, and relationships from the transcript.

Guidelines:
- Create a central main node representing the overall topic
- Create topic nodes for major themes or sections
- Create subtopic nodes for supporting ideas
- Create detail nodes for specific points or examples
- Use clear, concise labels (max 6-8 words)
- Ensure proper hierarchical relationships (main -> topic -> subtopic -> detail)
- Assign appropriate categories to each node
- Create edges that show the logical flow and relationships`,
      prompt: `Analyze this transcript and create a detailed mindmap structure:

${truncatedTranscript}

Create a mindmap with:
1. One main central node (id: "main") representing the core topic
2. Multiple topic nodes branching from main
3. Subtopic nodes branching from topics
4. Detail nodes with specific information
5. Clear hierarchical edges connecting them

Return a structured mindmap with nodes and edges.`
    });

    return NextResponse.json({
      mindmap: result.object,
      transcriptionTitle: `Mindmap for ${transcription.youtubeUrl}`
    });
  } catch (error) {
    console.error('Error generating mindmap:', error);
    return NextResponse.json(
      { error: 'Failed to generate mindmap' },
      { status: 500 }
    );
  }
}
