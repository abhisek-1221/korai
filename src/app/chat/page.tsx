'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FancyButton } from '@/components/ui/fancy-button';
import { Loader } from '@/components/ui/loader';
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import ThreadPost from '@/components/threads/ThreadPost';
import ThreadSkeleton from '@/components/threads/ThreadSkeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Loader2,
  MessageSquare,
  Blend,
  User,
  LaptopMinimalCheck,
  ArrowUp,
  Copy,
  AlertCircle
} from 'lucide-react';
import type React from 'react';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/hooks/use-toast';

import { DEFAULT_MODEL } from '@/lib/providers';
import { suggestionGroups } from '@/lib/suggestions';
import { extractVideoId } from '@/lib/ythelper';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ThreadData {
  post: number;
  content: string;
  total: number;
  thumbnail?: string;
}

interface UsageInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Usage Display Component
function UsageDisplay({ usage }: { usage: UsageInfo | null }) {
  if (!usage) return null;

  const resetDate = new Date(usage.reset);
  const now = new Date();
  const timeUntilReset = resetDate.getTime() - now.getTime();
  const hoursUntilReset = Math.max(
    0,
    Math.ceil(timeUntilReset / (1000 * 60 * 60))
  );

  return (
    <div className='flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2 text-sm text-red-400/80'>
      <AlertCircle className='h-4 w-4' />
      <span>
        <span className='font-medium text-red-100'>{usage.remaining}</span> chat
        messages remaining today
        {usage.remaining === 0 && (
          <span className='ml-1 text-orange-400'>
            (Resets in {hoursUntilReset}h)
          </span>
        )}
      </span>
    </div>
  );
}

export default function ChatPage() {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState(DEFAULT_MODEL);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [generatingThreads, setGeneratingThreads] = useState(false);
  const [threadsModalOpen, setThreadsModalOpen] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch usage info
  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.chat);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  }, []);

  // Fetch usage on component mount
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube URL',
        variant: 'destructive'
      });
      return;
    }

    const extractedVideoId = extractVideoId(videoUrl.trim());
    if (!extractedVideoId) {
      toast({
        title: 'Error',
        description: 'Please enter a valid YouTube URL',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
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
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transcript',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !hasTranscript || isStreaming) return;

    // Check if user has remaining chat attempts
    if (usage && usage.remaining <= 0) {
      toast({
        title: 'Chat Limit Exceeded',
        description: 'You have used all your chat attempts for today.',
        variant: 'destructive'
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setActiveCategory('');
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping users understand video content. You have access to the following video transcript:

${transcript}

Answer questions based on this transcript. Do not use the transcript word in the answers. Be conversational, helpful, and accurate. If something is not mentioned in the transcript, say so.`
            },
            ...messages.filter((m) => m.role !== 'system'),
            userMessage
          ],
          model: selectedLLM
        }),
        signal: abortControllerRef.current.signal
      });

      if (response.status === 429) {
        const data = await response.json();
        toast({
          title: 'Chat Limit Exceeded',
          description:
            data.error || 'You have used all your chat attempts for today.',
          variant: 'destructive'
        });
        // Refresh usage info
        await fetchUsage();
        setIsStreaming(false);
        return;
      }

      if (response.status === 401) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to use chat.',
          variant: 'destructive'
        });
        setIsStreaming(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Update usage info from response headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining && usage) {
        setUsage((prev) =>
          prev
            ? {
                ...prev,
                remaining: parseInt(remaining),
                used: prev.limit - parseInt(remaining)
              }
            : null
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = '';
      let hasStartedStreaming = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('0:')) {
            if (!hasStartedStreaming) {
              setIsStreaming(false);
              hasStartedStreaming = true;
            }

            const content = JSON.parse(line.slice(2));
            assistantMessage.content += content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id ? assistantMessage : m
              )
            );
          }
        }
      }

      if (buffer && buffer.startsWith('0:')) {
        if (!hasStartedStreaming) {
          setIsStreaming(false);
          hasStartedStreaming = true;
        }

        const content = JSON.parse(buffer.slice(2));
        assistantMessage.content += content;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? assistantMessage : m))
        );
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      // Set streaming to false on error
      setIsStreaming(false);
    }
  };

  const generateThreads = async () => {
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
- Do not use hastags in the thread

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
      console.log('Thr:', response.body);

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
        // Fallback with better content
        const fallbackPosts = [
          {
            post: 1,
            content:
              "🧵 Here's the full story from this video that will change your perspective...",
            total: 6,
            thumbnail: videoId
              ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
              : undefined
          },
          {
            post: 2,
            content:
              'The key insight from this video reveals something most people completely miss about the topic.',
            total: 6
          },
          {
            post: 3,
            content:
              'This matters because it challenges everything we thought we knew about the topic.',
            total: 6
          },
          {
            post: 4,
            content:
              'The evidence presented shows a clear pattern that most people completely miss.',
            total: 6
          },
          {
            post: 5,
            content:
              'The implications of this go far beyond what was initially discussed in the video.',
            total: 6
          },
          {
            post: 6,
            content:
              "What's your take on this? Drop your thoughts below! #VideoInsights #Threading",
            total: 6
          }
        ];
        setThreads(fallbackPosts);
        toast({
          title: 'Generated',
          description: 'Thread created with fallback content'
        });
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
  };

  const copyThreadsToClipboard = () => {
    const threadText = threads
      .map((thread) => `${thread.post}/${thread.total} ${thread.content}`)
      .join('\n\n');

    navigator.clipboard.writeText(threadText);
    toast({
      title: 'Copied!',
      description: 'Threads copied to clipboard'
    });
  };

  const shareToTwitter = () => {
    const threadText = threads
      .map((thread) => `${thread.post}/${thread.total} ${thread.content}`)
      .join('\n\n');

    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(threadText)}`;
    window.open(tweetUrl, '_blank');
  };

  const handlePromptInputValueChange = (value: string) => {
    setInputMessage(value);

    if (value.trim() === '') {
      setActiveCategory('');
    }
  };

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  );

  const showCategorySuggestions = activeCategory !== '';

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className='relative min-h-screen overflow-hidden bg-black'>
      {/* Radial gradient background */}
      <div className='absolute inset-0'>
        <div className='absolute -top-48 -right-48 h-96 w-96 rounded-full bg-red-600/20 blur-3xl' />
        <div className='absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-red-600/20 blur-3xl' />
      </div>

      {/* Main content */}
      <div className='relative z-10 flex min-h-screen items-center justify-center p-2 sm:p-4'>
        <Card
          className='mx-auto w-full max-w-4xl rounded-2xl border-red-900/30 bg-black/90 shadow-2xl shadow-red-900/40 drop-shadow-2xl backdrop-blur-md xl:max-w-5xl 2xl:max-w-6xl'
          style={{
            boxShadow:
              '0 25px 50px -12px rgba(247, 242, 242, 0.57), 0 0 0 1px rgba(185, 28, 28, 0.1), 0 0 50px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          <CardContent className='flex h-[90vh] flex-col p-4 md:h-[85vh] md:p-6 lg:p-8'>
            {!hasTranscript ? (
              // Initial state - Video URL input
              <div className='flex flex-1 flex-col'>
                <div className='flex flex-1 flex-col items-center justify-center'>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='w-full max-w-2xl space-y-6'
                  >
                    <div className='space-y-4 text-center'>
                      <div className='mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20 md:h-20 md:w-20'>
                        <MessageSquare className='h-8 w-8 text-red-500 md:h-10 md:w-10' />
                      </div>
                      <h2 className='text-2xl font-bold text-white sm:text-3xl lg:text-4xl xl:text-5xl'>
                        Chat with YouTube Videos
                      </h2>
                      <p className='mx-auto max-w-md text-sm text-red-300/80 sm:text-base lg:max-w-lg lg:text-lg xl:max-w-xl'>
                        Enter a YouTube URL to start chatting about the video
                        content. I'll help you understand and explore the
                        content.
                      </p>
                    </div>
                  </motion.div>
                </div>

                <div className='mt-auto border-t border-red-900/30 pt-4'>
                  <form onSubmit={handleVideoSubmit} className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row lg:flex-row lg:gap-4'>
                      <Input
                        type='text'
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder='Enter YouTube video URL...'
                        className='flex-1 border-red-900/50 bg-black/50 text-red-50 placeholder-red-400/70 focus:border-red-600 focus:ring-red-600/30'
                      />

                      <FancyButton
                        onClick={(e) => {
                          e.preventDefault();
                          handleVideoSubmit(e);
                        }}
                        loading={loading}
                        label='Activate Agent'
                      />
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              // Chat interface
              <div className='flex flex-1 flex-col overflow-hidden'>
                {/* Messages area */}
                <div className='flex-1 overflow-hidden'>
                  <ScrollArea className='h-full pr-4' ref={scrollAreaRef}>
                    <div className='space-y-4 pb-4'>
                      <AnimatePresence>
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`flex max-w-[80%] items-start gap-3 lg:max-w-[70%] xl:max-w-[65%] ${
                                message.role === 'user'
                                  ? 'flex-row-reverse'
                                  : ''
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                                  message.role === 'user'
                                    ? 'bg-gradient-to-br from-red-600 to-orange-600'
                                    : message.role === 'system'
                                      ? 'bg-gradient-to-br from-red-800 to-red-900'
                                      : 'bg-gradient-to-br from-red-700 to-orange-700'
                                }`}
                              >
                                {message.role === 'user' ? (
                                  <User className='h-4 w-4 text-white' />
                                ) : message.role === 'system' ? (
                                  <LaptopMinimalCheck className='h-4 w-4 text-white' />
                                ) : (
                                  <Blend className='h-4 w-4 text-white' />
                                )}
                              </div>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  message.role === 'user'
                                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                                    : message.role === 'system'
                                      ? 'border border-red-800/50 bg-red-950/50 text-red-300'
                                      : 'border border-red-900/30 bg-black/80 text-red-50'
                                }`}
                              >
                                {message.role === 'assistant' ? (
                                  <Markdown className='prose prose-sm prose-invert max-w-none'>
                                    {message.content}
                                  </Markdown>
                                ) : (
                                  <p className='text-sm'>{message.content}</p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {isStreaming && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className='flex justify-start'
                        >
                          <div className='flex max-w-[80%] items-center gap-3 lg:max-w-[70%] xl:max-w-[65%]'>
                            <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-orange-700'>
                              <Blend className='h-4 w-4 text-white' />
                            </div>
                            <div className='rounded-lg border border-red-900/30 bg-black/80 px-4 py-2'>
                              <div className='flex items-center gap-2'>
                                <Loader
                                  variant='wave'
                                  size='md'
                                  className='text-red-400'
                                />
                                <span className='text-sm text-red-300'>
                                  JIF is thinking...
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Entire Input Section - Sticks to Bottom */}
                <div className='mt-auto space-y-4 border-t border-red-900/30 pt-4'>
                  {/* Usage Display */}
                  <div className='flex justify-center'>
                    <UsageDisplay usage={usage} />
                  </div>

                  <PromptInput
                    className='border-red-900/50 bg-black/50 shadow-xs'
                    value={inputMessage}
                    onValueChange={handlePromptInputValueChange}
                    onSubmit={handleSendMessage}
                  >
                    <PromptInputTextarea
                      placeholder='Ask me anything about the video...'
                      className='min-h-[44px] text-red-50 placeholder-red-400/70'
                      disabled={isStreaming || usage?.remaining === 0}
                    />
                    <PromptInputActions className='justify-end'>
                      <Button
                        size='sm'
                        className='h-9 w-9 rounded-full bg-red-600 text-white hover:bg-red-700'
                        onClick={handleSendMessage}
                        disabled={
                          !inputMessage.trim() ||
                          isStreaming ||
                          usage?.remaining === 0
                        }
                      >
                        {isStreaming ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <ArrowUp className='h-4 w-4' />
                        )}
                      </Button>
                    </PromptInputActions>
                  </PromptInput>

                  {/* Suggestions Section */}
                  <div className='relative flex w-full flex-col items-center justify-center space-y-2'>
                    <div className='w-full'>
                      {showCategorySuggestions ? (
                        <div className='flex w-full flex-col space-y-2 lg:space-y-3'>
                          {activeCategoryData?.items.map((suggestion) => (
                            <PromptSuggestion
                              key={suggestion}
                              highlight={activeCategoryData.highlight}
                              onClick={() => {
                                setInputMessage(suggestion);
                                setActiveCategory('');
                              }}
                              className='border-red-900/50 bg-black/50 text-sm text-red-50 hover:bg-red-950/50 lg:text-base'
                            >
                              {suggestion}
                            </PromptSuggestion>
                          ))}
                        </div>
                      ) : (
                        <div className='relative flex w-full flex-wrap items-stretch justify-center gap-2 sm:justify-start lg:gap-3 xl:gap-4'>
                          {/* Generate Threads Button */}
                          <PromptSuggestion
                            onClick={() => generateThreads()}
                            className='border-blue-500/50 bg-black text-sm text-blue-300 capitalize hover:bg-blue-950/50 hover:text-blue-100 lg:text-base'
                            disabled={generatingThreads}
                          >
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              width='1200'
                              height='1227'
                              fill='none'
                              viewBox='0 0 1200 1227'
                            >
                              <path
                                fill='#fff'
                                d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z'
                              />
                            </svg>
                            {generatingThreads
                              ? 'Generating...'
                              : 'Generate X Thread'}
                          </PromptSuggestion>

                          {suggestionGroups.map((suggestion) => {
                            const IconComponent = suggestion.icon;
                            return (
                              <PromptSuggestion
                                key={suggestion.label}
                                onClick={() => {
                                  setActiveCategory(suggestion.label);
                                  setInputMessage('');
                                }}
                                className='border-red-900/50 bg-black/50 text-sm text-white capitalize hover:bg-red-950/50 hover:text-green-300 lg:text-base'
                              >
                                <IconComponent className='mr-2 h-4 w-4 lg:h-5 lg:w-5' />
                                {suggestion.label}
                              </PromptSuggestion>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center justify-between text-xs text-gray-200'>
                    <span />
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setHasTranscript(false);
                        setMessages([]);
                        setTranscript('');
                        setVideoUrl('');
                        setInputMessage('');
                        setActiveCategory('');
                      }}
                      className="relative overflow-hidden border border-red-600/30 text-white before:absolute before:inset-0 before:animate-[shimmer_8s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-red-400/30 before:to-transparent before:bg-[length:200%_100%] before:content-[''] hover:bg-red-950/30 hover:text-green-100"
                    >
                      Load new video
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Threads Modal */}
      <Dialog open={threadsModalOpen} onOpenChange={setThreadsModalOpen}>
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-2xl rounded-lg border-red-900/50 bg-black text-white sm:w-full'>
          <DialogHeader>
            <DialogTitle className='flex items-center space-x-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-black to-stone-900'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='1200'
                  height='1227'
                  fill='none'
                  viewBox='0 0 1200 1227'
                >
                  <path
                    fill='#fff'
                    d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z'
                  />
                </svg>
              </div>
              <div>
                <span className='text-xl font-semibold'>
                  {generatingThreads
                    ? 'Generating X Thread...'
                    : 'Your Viral X Thread'}
                </span>
                {threads.length > 0 && !generatingThreads && (
                  <p className='text-sm font-normal text-gray-300'>
                    {threads.length} posts ready to share
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-hidden'>
            <ScrollArea className='h-[60vh] pr-4'>
              <div className='space-y-4'>
                {/* Loading Skeleton */}
                {generatingThreads && <ThreadSkeleton count={5} />}

                {/* Thread Posts */}
                {threads.length > 0 && !generatingThreads && (
                  <div className='space-y-4'>
                    {threads.map((thread, index) => (
                      <ThreadPost
                        key={index}
                        post={thread.post}
                        total={thread.total}
                        content={thread.content}
                        index={index}
                        isConnected={thread.post < thread.total}
                        thumbnail={thread.thumbnail}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Modal Footer with Actions */}
          {threads.length > 0 && !generatingThreads && (
            <div className='flex justify-end space-x-3 border-t border-red-900/30 pt-4'>
              <Button
                variant='outline'
                onClick={copyThreadsToClipboard}
                className='border-red-700 text-red-300 hover:bg-red-950/50 hover:text-red-100'
              >
                <Copy className='mr-2 h-4 w-4' />
                Copy All
              </Button>
              <Button
                onClick={shareToTwitter}
                className='bg-black text-white hover:bg-gray-800'
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='1200'
                  height='1227'
                  fill='none'
                  viewBox='0 0 1200 1227'
                >
                  <path
                    fill='#fff'
                    d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z'
                  />
                </svg>{' '}
                Share on X
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
