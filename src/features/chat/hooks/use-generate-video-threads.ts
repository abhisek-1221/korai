import { useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useToast } from '@/hooks/use-toast';
import { useVideoChatStore, type ThreadData } from '../store/video-chat-store';

export const useGenerateVideoThreads = () => {
  const { toast } = useToast();
  const {
    transcript,
    videoId,
    hasTranscript,
    setThreads,
    setGeneratingThreads,
    setThreadsModalOpen
  } = useVideoChatStore();

  // Separate useChat instance for thread generation
  const {
    messages: threadMessages,
    sendMessage,
    status: threadStatus
  } = useChat({
    id: 'thread-generation' // Unique ID to separate from main chat
  });

  // Parse threads when generation is complete
  useEffect(() => {
    if (threadStatus === 'ready' && threadMessages.length > 0) {
      const lastMessage = threadMessages[threadMessages.length - 1];
      if (lastMessage.role === 'assistant') {
        // Extract text from the last assistant message
        let threadText = '';
        lastMessage.parts.forEach((part) => {
          if (part.type === 'text') {
            threadText += part.text;
          }
        });

        console.log('Generated threads text:', threadText);

        const threadPosts: ThreadData[] = [];
        const lines = threadText.split('\n').filter((line) => line.trim());

        // Dynamic parsing - find all numbered posts
        for (let i = 1; i <= 20; i++) {
          const threadLine = lines.find((line) => {
            const trimmed = line.trim();
            return trimmed.startsWith(`${i}:`) || trimmed.startsWith(`${i}.`);
          });

          if (threadLine) {
            // Extract content after the number and colon/period
            let content = threadLine.replace(/^\d+[:.]\s*/, '').trim();
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
          toast({
            title: 'Error',
            description: 'No thread posts were generated. Please try again.',
            variant: 'destructive'
          });
          setThreadsModalOpen(false);
        }
        setGeneratingThreads(false);
      }
    }
  }, [
    threadStatus,
    threadMessages,
    videoId,
    setThreads,
    setGeneratingThreads,
    setThreadsModalOpen,
    toast
  ]);

  const generateThreads = () => {
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

    sendMessage({
      text: threadsPrompt
    });
  };

  return { generateThreads, isGenerating: threadStatus === 'streaming' };
};
