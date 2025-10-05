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
