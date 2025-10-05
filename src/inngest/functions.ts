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
