import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChatStore } from '../store/chat-store';

export const useChatActions = () => {
  const { toast } = useToast();
  const { threads, setThreadsModalOpen } = useChatStore();

  const copyThreadsToClipboard = useCallback(() => {
    const threadText = threads
      .map((thread) => `${thread.post}/${thread.total} ${thread.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(threadText);
    toast({
      title: 'Copied!',
      description: 'Threads copied to clipboard'
    });
  }, [threads, toast]);

  const shareToTwitter = useCallback(() => {
    const threadText = threads
      .map((thread) => `${thread.post}/${thread.total} ${thread.content}`)
      .join('\n\n');

    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(threadText)}`;
    window.open(tweetUrl, '_blank');
  }, [threads]);

  const closeThreadsModal = useCallback(() => {
    setThreadsModalOpen(false);
  }, [setThreadsModalOpen]);

  return {
    copyThreadsToClipboard,
    shareToTwitter,
    closeThreadsModal
  };
};
