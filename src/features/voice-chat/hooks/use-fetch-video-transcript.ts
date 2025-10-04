import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChatStore } from '../store/voice-chat-store';

export const useFetchVideoTranscript = () => {
  const { toast } = useToast();
  const {
    videoUrl,
    setIsLoading,
    setTranscript,
    setHasTranscript,
    setMessages
  } = useVoiceChatStore();

  const fetchTranscript = useCallback(async () => {
    if (!videoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube URL',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);
    setMessages([]);
    setTranscript('');
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
            "Voice agent is ready! You can now speak and I'll respond with voice in your selected language."
        }
      ]);

      toast({
        title: 'Success',
        description:
          'Voice Agent Ready. Click the microphone to start speaking!',
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
    setTranscript,
    setHasTranscript,
    setMessages
  ]);

  return { fetchTranscript };
};
