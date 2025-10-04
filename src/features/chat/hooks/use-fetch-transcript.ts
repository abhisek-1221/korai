import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '../store/chat-store';
import { extractVideoId } from '@/lib/ythelper';

export const useFetchTranscript = () => {
  const { toast } = useToast();
  const {
    videoUrl,
    setIsLoading,
    setVideoId,
    setTranscript,
    setHasTranscript,
    setMessages
  } = useChatStore();

  const fetchTranscript = useCallback(async () => {
    if (!videoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube URL',
        variant: 'destructive'
      });
      return false;
    }

    const extractedVideoId = extractVideoId(videoUrl.trim());
    if (!extractedVideoId) {
      toast({
        title: 'Error',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);
    setMessages([]);
    setTranscript('');
    setVideoId(extractedVideoId);
    setHasTranscript(false);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transcript');
      }

      if (!data?.transcript?.fullTranscript) {
        throw new Error('No transcript available for this video');
      }

      setTranscript(data.transcript.fullTranscript);
      setHasTranscript(true);

      // Add initial system message
      setMessages([
        {
          id: Date.now().toString(),
          role: 'system',
          content:
            'Agent is ready! You can now ask questions about the video content.'
        }
      ]);

      toast({
        title: 'Success',
        description: 'Agent Ready. You can now start chatting!',
        variant: 'default'
      });

      return true;
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transcript',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [
    videoUrl,
    toast,
    setIsLoading,
    setVideoId,
    setTranscript,
    setHasTranscript,
    setMessages
  ]);

  return { fetchTranscript };
};
