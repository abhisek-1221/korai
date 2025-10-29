import { inngest } from '@/lib/inngest';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

interface ClipData {
  start: string | number;
  end: string | number;
  title: string;
  summary: string;
  virality_score: string | number;
  related_topics: string[];
  transcript: string;
}

interface IdentifyClipsResponse {
  identified_clips: ClipData[];
  total_clips: string | number;
  video_duration: string | number;
  detected_language: string;
  s3_path: string;
  original_video_s3_key: string;
  youtube_url: string;
}

interface ProcessClipData {
  start: number;
  end: number;
}

interface ProcessClipsPayload {
  s3_key: string;
  clips: ProcessClipData[];
  prompt: string;
  target_language: string | null;
  aspect_ratio: string;
  subtitles: boolean;
  subtitle_customization: {
    enabled: boolean;
    position: string;
    font_size: number;
    font_family: string;
    font_color: string;
    outline_color: string;
    outline_width: number;
    background_color: string | null;
    background_opacity: number;
    shadow_enabled: boolean;
    shadow_color: string;
    shadow_offset: number;
    max_words_per_line: number;
    margin_horizontal: number;
    margin_vertical: number;
    fade_in_duration: number;
    fade_out_duration: number;
    karaoke_enabled: boolean;
    karaoke_highlight_color: string;
    karaoke_popup_scale: number;
  };
}

interface ProcessedClipResponse {
  start: number;
  end: number;
  s3_key: string;
}

interface ProcessClipsResponse {
  processed_clips: ProcessedClipResponse[];
}

interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface TranscriptionResponse {
  transcription: TranscriptionSegment[];
}

export const transcribeWithSpeakers = inngest.createFunction(
  {
    id: 'transcribe-with-speakers',
    name: 'Transcribe Video with Speaker Diarization'
  },
  { event: 'video/transcribe.with.speakers' },
  async ({ event, step }) => {
    const { youtubeUrl, userId } = event.data;

    // Step 1: Create initial transcription record
    const transcriptionData = await step.run(
      'create-transcription-record',
      async () => {
        const transcription = await prisma.transcription.create({
          data: {
            userId,
            youtubeUrl,
            status: 'processing'
          }
        });

        return { transcription };
      }
    );

    // Step 2: Call the backend API for transcription
    const transcriptionResponse = await step.run(
      'call-transcription-api',
      async () => {
        const apiUrl = process.env.TRANSCRIPTION_API_URL;

        if (!apiUrl) {
          throw new Error(
            'TRANSCRIPTION_API_URL environment variable is not set'
          );
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CLIPS_API_TOKEN}`
          },
          body: JSON.stringify({
            youtube_url: youtubeUrl
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: TranscriptionResponse = await response.json();
        return data;
      }
    );

    // Step 3: Save transcription segments to database
    await step.run('save-transcription-segments', async () => {
      if (
        transcriptionResponse.transcription &&
        transcriptionResponse.transcription.length > 0
      ) {
        await prisma.transcriptionSegment.createMany({
          data: transcriptionResponse.transcription.map((segment) => ({
            transcriptionId: transcriptionData.transcription.id,
            start: segment.start,
            end: segment.end,
            text: segment.text,
            speaker: segment.speaker,
            speakerName: null
          }))
        });

        // Update transcription status to completed
        await prisma.transcription.update({
          where: { id: transcriptionData.transcription.id },
          data: { status: 'completed' }
        });
      }
    });

    return {
      transcriptionId: transcriptionData.transcription.id,
      segmentCount: transcriptionResponse.transcription.length
    };
  }
);

export const identifyClips = inngest.createFunction(
  { id: 'identify-clips', name: 'Identify Viral Clips from YouTube Video' },
  { event: 'video/identify.clips' },
  async ({ event, step }) => {
    const { youtubeUrl, prompt, userId } = event.data;

    // Step 1: Generate UUID and create initial video record
    const videoData = await step.run('create-video-record', async () => {
      const videoUuid = uuidv4();
      const s3Key = `youtube-videos/${videoUuid}/yt`;

      const video = await prisma.video.create({
        data: {
          userId,
          youtubeUrl,
          s3Key,
          prompt: prompt || ''
        }
      });

      return { video, s3Key };
    });

    // Step 2: Call the backend API to identify clips
    const clipsResponse = await step.run(
      'call-identify-clips-api',
      async () => {
        const apiUrl = process.env.CLIPS_API_URL;

        if (!apiUrl) {
          throw new Error('CLIPS_API_URL environment variable is not set');
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CLIPS_API_TOKEN}`
          },
          body: JSON.stringify({
            youtube_url: youtubeUrl,
            s3_key_yt: videoData.s3Key,
            prompt: prompt || ''
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: IdentifyClipsResponse = await response.json();
        return data;
      }
    );

    // Step 3: Update video record with response data and create clips
    await step.run('save-clips-to-database', async () => {
      // Update video with metadata
      await prisma.video.update({
        where: { id: videoData.video.id },
        data: {
          totalClips:
            typeof clipsResponse.total_clips === 'number'
              ? clipsResponse.total_clips
              : parseInt(clipsResponse.total_clips) || 0,
          videoDuration: clipsResponse.video_duration?.toString() || null,
          detectedLanguage: clipsResponse.detected_language,
          s3Path: clipsResponse.s3_path
        }
      });

      // Create clips
      if (
        clipsResponse.identified_clips &&
        clipsResponse.identified_clips.length > 0
      ) {
        await prisma.clip.createMany({
          data: clipsResponse.identified_clips.map((clip) => ({
            videoId: videoData.video.id,
            start: clip.start.toString(),
            end: clip.end.toString(),
            title: clip.title,
            summary: clip.summary,
            viralityScore: clip.virality_score.toString(),
            relatedTopics: clip.related_topics,
            transcript: clip.transcript
          }))
        });
      }
    });

    return {
      videoId: videoData.video.id,
      s3Key: videoData.s3Key,
      totalClips: clipsResponse.total_clips
    };
  }
);

export const generateMindmap = inngest.createFunction(
  {
    id: 'generate-mindmap',
    name: 'Generate Mindmap from Transcription'
  },
  { event: 'transcription/generate.mindmap' },
  async ({ event, step }) => {
    const { transcriptionId, userId } = event.data;

    // Step 1: Create initial mindmap record
    const mindmapData = await step.run('create-mindmap-record', async () => {
      // Check if mindmap already exists
      const existingMindmap = await prisma.mindmap.findUnique({
        where: { transcriptionId }
      });

      if (existingMindmap) {
        // Update existing to processing
        const mindmap = await prisma.mindmap.update({
          where: { id: existingMindmap.id },
          data: { status: 'processing', data: undefined }
        });
        return { mindmap };
      }

      // Create new mindmap record
      const mindmap = await prisma.mindmap.create({
        data: {
          transcriptionId,
          title: 'Mindmap',
          status: 'processing'
        }
      });

      return { mindmap };
    });

    // Step 2: Fetch transcription data
    const transcriptionData = await step.run(
      'fetch-transcription-data',
      async () => {
        const transcription = await prisma.transcription.findUnique({
          where: { id: transcriptionId, userId },
          include: {
            segments: {
              orderBy: { start: 'asc' }
            }
          }
        });

        if (!transcription) {
          throw new Error('Transcription not found');
        }

        return { transcription };
      }
    );

    // Step 3: Generate mindmap using AI
    const mindmapResult = await step.run('generate-mindmap-ai', async () => {
      const { generateObject } = await import('ai');
      const { getModel, DEFAULT_MODEL } = await import('@/lib/providers');
      const { z } = await import('zod');

      // Combine all segments into a full transcript
      const fullTranscript = transcriptionData.transcription.segments
        .map((seg) => {
          const speaker = seg.speakerName || seg.speaker;
          return `${speaker}: ${seg.text}`;
        })
        .join('\n');

      // Truncate if too long
      const maxLength = 15000;
      const truncatedTranscript =
        fullTranscript.length > maxLength
          ? fullTranscript.substring(0, maxLength) + '...[truncated]'
          : fullTranscript;

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

      const selectedModel = getModel(DEFAULT_MODEL);

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

      return result.object;
    });

    // Step 4: Save mindmap data to database
    await step.run('save-mindmap-data', async () => {
      await prisma.mindmap.update({
        where: { id: mindmapData.mindmap.id },
        data: {
          title: mindmapResult.title,
          status: 'completed',
          data: mindmapResult as any
        }
      });
    });

    return {
      mindmapId: mindmapData.mindmap.id,
      transcriptionId,
      status: 'completed'
    };
  }
);

export const processClips = inngest.createFunction(
  { id: 'process-clips', name: 'Process and Export Viral Clips' },
  { event: 'clips/process' },
  async ({ event, step }) => {
    const {
      videoId,
      s3Key,
      selectedClips,
      targetLanguage,
      aspectRatio,
      userId
    } = event.data;

    // Step 1: Call the backend API to process clips
    const processedResponse = await step.run(
      'call-process-clips-api',
      async () => {
        const apiUrl = process.env.PROCESS_CLIPS_API_URL;

        if (!apiUrl) {
          throw new Error(
            'PROCESS_CLIPS_API_URL environment variable is not set'
          );
        }

        const payload: ProcessClipsPayload = {
          s3_key: s3Key,
          clips: selectedClips.map((clip: { start: string; end: string }) => ({
            start: parseFloat(clip.start),
            end: parseFloat(clip.end)
          })),
          prompt: '',
          target_language: targetLanguage,
          aspect_ratio: aspectRatio,
          subtitles: true,
          subtitle_customization: {
            enabled: true,
            position: 'middle',
            font_size: 120,
            font_family: 'Anton',
            font_color: '#FFFFFF',
            outline_color: '#000000',
            outline_width: 2.5,
            background_color: null,
            background_opacity: 0.0,
            shadow_enabled: true,
            shadow_color: '#808080',
            shadow_offset: 3.0,
            max_words_per_line: 3,
            margin_horizontal: 60,
            margin_vertical: 180,
            fade_in_duration: 0,
            fade_out_duration: 0,
            karaoke_enabled: true,
            karaoke_highlight_color: '#0DE050',
            karaoke_popup_scale: 1.25
          }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CLIPS_API_TOKEN}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data: ProcessClipsResponse = await response.json();
        return data;
      }
    );

    // Step 2: Save exported clips to database
    await step.run('save-exported-clips-to-database', async () => {
      if (
        processedResponse.processed_clips &&
        processedResponse.processed_clips.length > 0
      ) {
        await prisma.exportedClip.createMany({
          data: processedResponse.processed_clips.map((clip) => ({
            videoId,
            start: clip.start.toString(),
            end: clip.end.toString(),
            s3Key: clip.s3_key,
            aspectRatio,
            targetLanguage
          }))
        });
      }
    });

    return {
      videoId,
      processedClips: processedResponse.processed_clips.length
    };
  }
);
