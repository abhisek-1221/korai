import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuizStore } from '../store/quiz-store';
import { useGenerateQuiz } from './use-generate-quiz';

export const useFetchVideoAndTranscript = () => {
  const { toast } = useToast();
  const { videoUrl, setVideoDetails, setIsLoading, setIsSuccess } =
    useQuizStore();
  const { generateQuiz } = useGenerateQuiz();

  const fetchVideoAndTranscript = useCallback(
    async (abortSignal?: AbortSignal) => {
      if (!videoUrl) {
        toast({
          title: 'Error',
          description: 'Please enter a YouTube video URL',
          variant: 'destructive'
        });
        return false;
      }

      setIsLoading(true);
      setVideoDetails(null);

      try {
        // Fetch video details
        const videoResponse = await fetch('/api/videoDetail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl }),
          signal: abortSignal
        });

        const videoData = await videoResponse.json();

        if (!videoResponse.ok) {
          throw new Error(videoData.error || 'Failed to fetch video details');
        }

        if (videoData.video) {
          setVideoDetails(videoData.video);
        }

        // Fetch transcript
        const transcriptResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl }),
          signal: abortSignal
        });

        const transcriptData = await transcriptResponse.json();

        if (!transcriptResponse.ok) {
          throw new Error(transcriptData.error || 'Failed to fetch transcript');
        }

        if (!transcriptData?.transcript?.fullTranscript) {
          throw new Error(
            transcriptData?.error ||
              'No transcript data available for this video'
          );
        }

        const fullTranscript = transcriptData.transcript.fullTranscript.trim();

        if (fullTranscript.length < 50) {
          throw new Error(
            'Transcript is too short to generate a meaningful quiz'
          );
        }

        setIsLoading(false);

        // Generate quiz with transcript
        const success = await generateQuiz(fullTranscript, abortSignal);

        if (success) {
          setIsSuccess(true);
          setTimeout(() => setIsSuccess(false), 4000);
        }

        return success;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          return false;
        }

        console.error('Error fetching video/transcript:', error);

        let errorMessage = error.message || 'Failed to process video';
        let errorTitle = 'Error';

        // Provide user-friendly error messages
        if (
          error.message?.includes('No transcript available') ||
          error.message?.includes('Transcripts are disabled')
        ) {
          errorTitle = 'No Transcript Available';
          errorMessage =
            'This video does not have captions/transcripts available. Please try a video that has captions enabled.';
        } else if (
          error.message?.includes('private') ||
          error.message?.includes('unavailable')
        ) {
          errorTitle = 'Video Unavailable';
          errorMessage =
            'This video is private or unavailable. Please try a public video.';
        }

        toast({
          title: errorTitle,
          description: errorMessage,
          variant: 'destructive'
        });

        setVideoDetails(null);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [videoUrl, toast, setVideoDetails, setIsLoading, setIsSuccess, generateQuiz]
  );

  return { fetchVideoAndTranscript };
};
