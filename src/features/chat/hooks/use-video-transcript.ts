import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVideoChatStore } from '../store/video-chat-store';
import { extractVideoId } from '@/lib/ythelper';

export const useVideoTranscript = () => {
  const { toast } = useToast();
  const { videoUrl, setTranscript, setHasTranscript, setIsLoadingTranscript } =
    useVideoChatStore();

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

    setIsLoadingTranscript(true);

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

      toast({
        title: 'Success',
        description: 'Video loaded! You can now start chatting.',
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
      setIsLoadingTranscript(false);
    }
  }, [
    videoUrl,
    toast,
    setTranscript,
    setHasTranscript,
    setIsLoadingTranscript
  ]);

  return { fetchTranscript };
};
