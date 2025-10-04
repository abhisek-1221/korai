import { useToast } from '@/hooks/use-toast';
import { useTranscribeStore } from '../store/transcribe-store';
import type { TranscriptSegment } from '../store/transcribe-store';

interface TranscriptResponse {
  transcript: {
    segments?: Array<{
      text: string;
      startTime: string;
      endTime: string;
    }>;
    fullTranscript?: string;
  };
}

export const useFetchTranscript = () => {
  const { toast } = useToast();
  const {
    videoUrl,
    setVideoDetails,
    setTranscriptData,
    setIsLoading,
    setIsSuccess
  } = useTranscribeStore();

  const fetchTranscript = async () => {
    if (!videoUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube video URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      // Fetch video details
      const videoResponse = await fetch('/api/videoDetail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
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
        body: JSON.stringify({ videoUrl })
      });

      if (transcriptResponse.status === 429) {
        const data = await transcriptResponse.json();
        toast({
          title: 'Rate Limit Exceeded',
          description: `Too many requests. Please try again in ${Math.ceil((data.reset - Date.now()) / 1000)} seconds.`,
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      if (!transcriptResponse.ok) {
        const errorData = await transcriptResponse.json();
        throw new Error(errorData.error || 'Failed to fetch transcript');
      }

      const transcriptData: TranscriptResponse =
        await transcriptResponse.json();
      processTranscriptData(transcriptData.transcript);

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setTranscriptData([]);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transcript',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processTranscriptData = (transcript: any) => {
    if (!transcript) return;

    let formattedTranscript: TranscriptSegment[] = [];

    if (transcript.segments) {
      formattedTranscript = transcript.segments.map((segment: any) => ({
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime
      }));
    } else if (transcript.fullTranscript) {
      formattedTranscript = [
        {
          text: transcript.fullTranscript,
          startTime: '0:00',
          endTime: '0:00'
        }
      ];
    }

    setTranscriptData(formattedTranscript);
  };

  return { fetchTranscript };
};
