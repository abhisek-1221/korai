import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChatStore, type ThreadData } from '../store/chat-store';

export const useGenerateThreads = () => {
  const { toast } = useToast();
  const {
    transcript,
    videoId,
    hasTranscript,
    selectedLLM,
    setThreads,
    setGeneratingThreads,
    setThreadsModalOpen
  } = useChatStore();

  const generateThreads = useCallback(async () => {
    if (!hasTranscript || !transcript) {
      toast({
        title: 'Error',
        description: 'No transcript available. Please load a video first.',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingThreads(true);
    setThreads([]);
    setThreadsModalOpen(true);

    try {
      const threadsPrompt = `Create a compelling X (Twitter) thread from this video content. Write a thread that tells the full story with engaging hooks and insights.

REQUIREMENTS:
- Start with a strong hook (e.g., "Here's the full story..." or "🧵 This will change how you think about...")
- Each post should be 200-250 characters (engaging but not too short)
- Generate 6-12 posts depending on content depth
- End with a strong conclusion and call-to-action
- Use emojis strategically
- Do not use hashtags in the thread

FORMAT: Write each post on a new line starting with "1:", "2:", etc.

Video content: ${transcript}

Write the complete thread now:`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: threadsPrompt
            }
          ],
          model: selectedLLM
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate threads');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('0:')) {
              const content = JSON.parse(line.slice(2));
              accumulated += content;
            }
          }
        }
      }

      console.log('Generated threads text:', accumulated);

      const threadPosts: ThreadData[] = [];
      const lines = accumulated.split('\n').filter((line) => line.trim());

      // Dynamic parsing - find all numbered posts
      for (let i = 1; i <= 20; i++) {
        const threadLine = lines.find((line) => line.startsWith(`${i}:`));
        if (threadLine) {
          const content = threadLine.substring(2).trim();
          if (content.length > 0) {
            threadPosts.push({
              post: i,
              content: content,
              total: 0 // Will be updated after we know the total
            });
          }
        } else {
          break; // No more posts found
        }
      }

      // Update total count for all posts
      const totalPosts = threadPosts.length;
      threadPosts.forEach((post) => {
        post.total = totalPosts;
      });

      // Add thumbnail to first post
      if (threadPosts.length > 0 && videoId) {
        threadPosts[0].thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      if (threadPosts.length > 0) {
        setThreads(threadPosts);
        toast({
          title: 'Success',
          description: `Generated ${threadPosts.length} thread posts!`
        });
      } else {
        throw new Error('No thread posts were generated');
      }
    } catch (error: any) {
      console.error('Error generating threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate threads. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingThreads(false);
    }
  }, [
    hasTranscript,
    transcript,
    videoId,
    selectedLLM,
    toast,
    setThreads,
    setGeneratingThreads,
    setThreadsModalOpen
  ]);

  return { generateThreads };
};
