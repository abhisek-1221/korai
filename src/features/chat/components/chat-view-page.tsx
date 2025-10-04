'use client';

import { useEffect, useRef, useCallback } from 'react';
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
  Copy
} from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { suggestionGroups } from '@/lib/suggestions';
import { useChatStore } from '../store/chat-store';
import {
  useFetchTranscript,
  useSendMessage,
  useGenerateThreads,
  useChatActions
} from '../hooks';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';

export default function ChatViewPage() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    videoUrl,
    messages,
    inputMessage,
    isLoading,
    isStreaming,
    hasTranscript,
    activeCategory,
    threads,
    generatingThreads,
    threadsModalOpen,
    setVideoUrl,
    setInputMessage,
    setActiveCategory,
    resetChat
  } = useChatStore();

  const { fetchTranscript } = useFetchTranscript();
  const { sendMessage, abortMessage } = useSendMessage();
  const { generateThreads } = useGenerateThreads();
  const { copyThreadsToClipboard, shareToTwitter, closeThreadsModal } =
    useChatActions();

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

  useEffect(() => {
    return () => {
      abortMessage();
    };
  }, [abortMessage]);

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchTranscript();
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

  if (!hasTranscript) {
    return (
      <PageContainer scrollable>
        <div className='flex min-h-[calc(100vh-8rem)] w-full flex-col'>
          <Heading
            title='Chat with YouTube Videos'
            description='Load a YouTube video to start chatting about its content'
          />

          <div className='mt-8 flex flex-1 flex-col items-center justify-center'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='w-full max-w-2xl space-y-6'
            >
              <div className='space-y-4 text-center'>
                <div className='bg-primary/20 mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full md:h-20 md:w-20'>
                  <MessageSquare className='text-primary h-8 w-8 md:h-10 md:w-10' />
                </div>
                <h2 className='text-2xl font-bold sm:text-3xl lg:text-4xl'>
                  Interactive Video Chat
                </h2>
                <p className='text-muted-foreground mx-auto max-w-md text-sm sm:text-base lg:max-w-lg'>
                  Enter a YouTube URL to start chatting about the video content.
                  I'll help you understand and explore the content.
                </p>
              </div>

              <Card>
                <CardContent className='p-4'>
                  <form onSubmit={handleVideoSubmit} className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row'>
                      <Input
                        type='text'
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder='Enter YouTube video URL...'
                        className='flex-1'
                      />
                      <FancyButton
                        onClick={(e) => {
                          e.preventDefault();
                          handleVideoSubmit(e);
                        }}
                        loading={isLoading}
                        label='Activate Agent'
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className='w-full space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Video Chat'
            description='Ask questions about the video content'
          />
        </div>

        <Card>
          <CardContent className='flex h-[calc(100vh-16rem)] flex-col p-4 md:p-6'>
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
                          className={`flex max-w-[80%] items-start gap-3 ${
                            message.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                              message.role === 'user'
                                ? 'bg-primary'
                                : message.role === 'system'
                                  ? 'bg-muted'
                                  : 'bg-primary/80'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <User className='text-primary-foreground h-4 w-4' />
                            ) : message.role === 'system' ? (
                              <LaptopMinimalCheck className='h-4 w-4' />
                            ) : (
                              <Blend className='text-primary-foreground h-4 w-4' />
                            )}
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'system'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-secondary'
                            }`}
                          >
                            {message.role === 'assistant' ? (
                              <Markdown className='prose prose-sm dark:prose-invert max-w-none'>
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
                      <div className='flex max-w-[80%] items-center gap-3'>
                        <div className='bg-primary/80 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full'>
                          <Blend className='text-primary-foreground h-4 w-4' />
                        </div>
                        <div className='bg-secondary rounded-lg px-4 py-2'>
                          <div className='flex items-center gap-2'>
                            <Loader variant='wave' size='md' />
                            <span className='text-sm'>Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Input Section */}
            <div className='mt-4 space-y-4 border-t pt-4'>
              <PromptInput
                value={inputMessage}
                onValueChange={handlePromptInputValueChange}
                onSubmit={sendMessage}
              >
                <PromptInputTextarea
                  placeholder='Ask me anything about the video...'
                  className='min-h-[44px]'
                  disabled={isStreaming}
                />
                <PromptInputActions className='justify-end'>
                  <Button
                    size='sm'
                    className='h-9 w-9 rounded-full'
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isStreaming}
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
                    <div className='flex w-full flex-col space-y-2'>
                      {activeCategoryData?.items.map((suggestion) => (
                        <PromptSuggestion
                          key={suggestion}
                          highlight={activeCategoryData.highlight}
                          onClick={() => {
                            setInputMessage(suggestion);
                            setActiveCategory('');
                          }}
                          className='text-sm lg:text-base'
                        >
                          {suggestion}
                        </PromptSuggestion>
                      ))}
                    </div>
                  ) : (
                    <div className='relative flex w-full flex-wrap items-stretch justify-center gap-2 sm:justify-start'>
                      {/* Generate Threads Button */}
                      <PromptSuggestion
                        onClick={generateThreads}
                        className='text-sm capitalize lg:text-base'
                        disabled={generatingThreads}
                      >
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='16'
                          height='16'
                          fill='currentColor'
                          viewBox='0 0 1200 1227'
                        >
                          <path d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z' />
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
                            className='text-sm capitalize lg:text-base'
                          >
                            <IconComponent className='mr-2 h-4 w-4' />
                            {suggestion.label}
                          </PromptSuggestion>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className='text-muted-foreground flex items-center justify-between text-xs'>
                <span />
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={resetChat}
                  className='hover:text-primary'
                >
                  Load new video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Threads Modal */}
      <Dialog open={threadsModalOpen} onOpenChange={closeThreadsModal}>
        <DialogContent className='max-h-[90vh] w-[95vw] max-w-2xl sm:w-full'>
          <DialogHeader>
            <DialogTitle className='flex items-center space-x-3'>
              <div className='bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  fill='currentColor'
                  viewBox='0 0 1200 1227'
                >
                  <path d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z' />
                </svg>
              </div>
              <div>
                <span className='text-xl font-semibold'>
                  {generatingThreads
                    ? 'Generating X Thread...'
                    : 'Your Viral X Thread'}
                </span>
                {threads.length > 0 && !generatingThreads && (
                  <p className='text-muted-foreground text-sm font-normal'>
                    {threads.length} posts ready to share
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-hidden'>
            <ScrollArea className='h-[60vh] pr-4'>
              <div className='space-y-4'>
                {generatingThreads && <ThreadSkeleton count={5} />}

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

          {threads.length > 0 && !generatingThreads && (
            <div className='flex justify-end space-x-3 border-t pt-4'>
              <Button variant='outline' onClick={copyThreadsToClipboard}>
                <Copy className='mr-2 h-4 w-4' />
                Copy All
              </Button>
              <Button onClick={shareToTwitter}>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  fill='currentColor'
                  viewBox='0 0 1200 1227'
                  className='mr-2'
                >
                  <path d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z' />
                </svg>
                Share on X
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
