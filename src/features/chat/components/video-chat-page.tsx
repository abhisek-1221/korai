'use client';

import { Fragment, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools
} from '@/components/ai-elements/prompt-input';
import { Action, Actions } from '@/components/ai-elements/actions';
import { Response } from '@/components/ai-elements/response';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CopyIcon,
  GlobeIcon,
  RefreshCcwIcon,
  Loader2,
  FileText,
  Search,
  SquareActivity,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { useVideoChatStore } from '../store/video-chat-store';
import { useVideoTranscript } from '../hooks/use-video-transcript';
import { useGenerateVideoThreads } from '../hooks/use-generate-video-threads';
import PageContainer from '@/components/layout/page-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ThreadPost from '@/components/threads/ThreadPost';
import ThreadSkeleton from '@/components/threads/ThreadSkeleton';
import { Copy, Plug2, Check } from 'lucide-react';
import { Gemini, Meta, OpenAI } from '@/lib/icons/models';

const suggestionGroups = [
  {
    label: 'Summary',
    icon: FileText,
    items: [
      'Summarize this video in one or two sentences',
      'What are the main points or segments covered?',
      'What are the key takeaways?'
    ]
  },
  {
    label: 'Comprehension',
    icon: Search,
    items: [
      'List Pain Points mentioned',
      'List all the Questions asked',
      'Who is the target audience?'
    ]
  },
  {
    label: 'Social',
    icon: SquareActivity,
    items: ['Write a Blog post on this', 'Generate a Linkedin Post on this']
  }
];

const models = [
  {
    name: 'Gemini Flash (Recommended)',
    value: 'gemini-2.5-flash',
    logo: Gemini
  },
  {
    name: 'Llama 3.1 (Cerebras)',
    value: 'llama-3.3-70b',
    logo: Meta
  },
  {
    name: 'GPT-OSS (Cerebras)',
    value: 'gpt-oss-120b',
    logo: OpenAI
  }
];

export default function VideoChatPage() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(false);
  const [connectAppsModalOpen, setConnectAppsModalOpen] = useState(false);
  const [mcpUrl, setMcpUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const {
    videoUrl,
    transcript,
    hasTranscript,
    isLoadingTranscript,
    threads,
    generatingThreads,
    threadsModalOpen,
    setVideoUrl,
    setThreadsModalOpen,
    resetChat
  } = useVideoChatStore();

  const { fetchTranscript } = useVideoTranscript();
  const { generateThreads } = useGenerateVideoThreads();

  const { messages, sendMessage, status } = useChat();

  const copyThreadsToClipboard = () => {
    const threadsText = threads
      .map((thread) => `${thread.post}. ${thread.content}`)
      .join('\n\n');
    navigator.clipboard.writeText(threadsText);
    const { toast } = require('@/hooks/use-toast');
    toast({
      title: 'Copied!',
      description: 'Thread copied to clipboard'
    });
  };

  const shareToTwitter = () => {
    const threadsText = threads.map((thread) => thread.content).join('\n\n');
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(threadsText)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleConnectApp = () => {
    // Mock connection - just toggle the state
    setIsConnected(true);
    setTimeout(() => {
      setConnectAppsModalOpen(false);
      const { toast } = require('@/hooks/use-toast');
      toast({
        title: 'Connected!',
        description: 'MCP app connected successfully'
      });
    }, 500);
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchTranscript();
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
          system: `You are an AI assistant helping users understand video content. You have access to the following video transcript:

${transcript}

Answer questions based on this transcript. Be conversational, helpful, and accurate. If something is not mentioned in the transcript, say so.`
        }
      }
    );
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(
      {
        text: suggestion
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
          system: `You are an AI assistant helping users understand video content. You have access to the following video transcript:

${transcript}

Answer questions based on this transcript. Be conversational, helpful, and accurate. If something is not mentioned in the transcript, say so.`
        }
      }
    );
  };

  // Show only URL input if no transcript
  if (!hasTranscript) {
    return (
      <PageContainer scrollable>
        <div className='flex min-h-[calc(100vh-8rem)] w-full flex-col'>
          <div className='mt-8 flex flex-1 flex-col items-center justify-center'>
            <div className='mb-8 flex flex-col items-center gap-4 text-center'>
              <div className='bg-primary/10 flex size-20 items-center justify-center rounded-2xl'>
                <MessageSquare className='text-primary size-10' />
              </div>
              <div className='space-y-2'>
                <h1 className='text-4xl font-bold tracking-tight'>
                  Chat with YouTube Videos
                </h1>
                <p className='text-muted-foreground max-w-md text-lg'>
                  Enter a YouTube URL to start chatting about its content
                </p>
              </div>
            </div>

            <Card className='w-full max-w-2xl'>
              <CardContent className='p-6'>
                <form onSubmit={handleVideoSubmit} className='space-y-4'>
                  <div className='flex flex-col gap-3 sm:flex-row'>
                    <Input
                      type='text'
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder='Enter YouTube video URL...'
                      className='flex-1'
                      disabled={isLoadingTranscript}
                    />
                    <Button
                      type='submit'
                      disabled={isLoadingTranscript || !videoUrl.trim()}
                      className='sm:w-auto'
                      size='lg'
                    >
                      {isLoadingTranscript ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Loading...
                        </>
                      ) : (
                        'Load Video'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Show chat interface after transcript is loaded
  return (
    <PageContainer scrollable>
      <div className='relative mx-auto size-full h-[calc(100vh-8rem)] max-w-5xl'>
        <div className='flex h-full flex-col gap-4'>
          {/* Empty State with Suggestions - Show when transcript loaded but no messages */}
          {messages.length === 0 && (
            <div className='flex flex-1 flex-col items-center justify-center gap-8 pb-32'>
              <div className='flex flex-col items-center gap-4 text-center'>
                <div className='bg-primary/10 flex size-16 items-center justify-center rounded-2xl'>
                  <Sparkles className='text-primary size-8' />
                </div>
                <div className='space-y-2'>
                  <h1 className='text-3xl font-bold tracking-tight'>
                    How can I help you today?
                  </h1>
                  <p className='text-muted-foreground text-lg'>
                    Choose a suggestion below or ask me anything about the video
                  </p>
                </div>
              </div>

              <div className='w-full max-w-3xl space-y-6'>
                {suggestionGroups.map((group) => (
                  <div key={group.label} className='space-y-3'>
                    <div className='flex items-center gap-2 px-2'>
                      <group.icon className='text-muted-foreground size-4' />
                      <h3 className='text-muted-foreground text-sm font-semibold'>
                        {group.label}
                      </h3>
                    </div>
                    <Suggestions className='gap-2'>
                      {group.items.map((suggestion) => (
                        <Suggestion
                          key={suggestion}
                          onClick={handleSuggestionClick}
                          suggestion={suggestion}
                          className='h-auto px-4 py-3 text-left whitespace-normal'
                        />
                      ))}
                    </Suggestions>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Area */}
          {messages.length > 0 && (
            <Conversation className='flex-1'>
              <ConversationContent>
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === 'assistant' &&
                      message.parts.filter((part) => part.type === 'source-url')
                        .length > 0 && (
                        <Sources>
                          <SourcesTrigger
                            count={
                              message.parts.filter(
                                (part) => part.type === 'source-url'
                              ).length
                            }
                          />
                          {message.parts
                            .filter((part) => part.type === 'source-url')
                            .map((part, i) => (
                              <SourcesContent key={`${message.id}-${i}`}>
                                <Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              </SourcesContent>
                            ))}
                        </Sources>
                      )}
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Fragment key={`${message.id}-${i}`}>
                              <Message from={message.role}>
                                <MessageContent>
                                  <Response>{part.text}</Response>
                                </MessageContent>
                              </Message>
                              {message.role === 'assistant' &&
                                i === message.parts.length - 1 && (
                                  <Actions className='mt-2'>
                                    <Action
                                      onClick={() =>
                                        navigator.clipboard.writeText(part.text)
                                      }
                                      label='Copy'
                                    >
                                      <CopyIcon className='size-3' />
                                    </Action>
                                  </Actions>
                                )}
                            </Fragment>
                          );
                        case 'reasoning':
                          return (
                            <Reasoning
                              key={`${message.id}-${i}`}
                              className='w-full'
                              isStreaming={
                                status === 'streaming' &&
                                i === message.parts.length - 1 &&
                                message.id === messages.at(-1)?.id
                              }
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                ))}
                {status === 'submitted' && <Loader />}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          )}

          {/* Input Area */}
          <div className='bg-background/95 supports-[backdrop-filter]:bg-background/60 border-t backdrop-blur'>
            <PromptInput
              onSubmit={handleSubmit}
              className='mt-0 pt-4'
              globalDrop
              multiple
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  placeholder='Ask me anything about the video...'
                />
              </PromptInputBody>
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputButton
                    variant='ghost'
                    onClick={resetChat}
                    className='text-xs'
                  >
                    <RefreshCcwIcon size={16} />
                    <span>New Video</span>
                  </PromptInputButton>
                  <PromptInputButton
                    variant='ghost'
                    onClick={() => setConnectAppsModalOpen(true)}
                    className='text-xs'
                  >
                    <Plug2 size={16} />
                    <span>Connect Apps</span>
                  </PromptInputButton>
                  <PromptInputButton
                    variant='ghost'
                    onClick={generateThreads}
                    disabled={generatingThreads}
                    className='text-xs'
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='14'
                      height='14'
                      fill='currentColor'
                      viewBox='0 0 1200 1227'
                    >
                      <path d='M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z' />
                    </svg>
                    <span>Thread</span>
                  </PromptInputButton>
                  <PromptInputButton
                    variant={webSearch ? 'default' : 'ghost'}
                    onClick={() => setWebSearch(!webSearch)}
                  >
                    <GlobeIcon size={16} />
                    <span>Search</span>
                  </PromptInputButton>
                  <PromptInputModelSelect
                    onValueChange={(value) => {
                      setModel(value);
                    }}
                    value={model}
                  >
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((model) => {
                        const Logo = model.logo;
                        return (
                          <PromptInputModelSelectItem
                            key={model.value}
                            value={model.value}
                          >
                            <div className='flex items-center gap-2'>
                              <Logo className='h-3 w-3' />
                              <span>{model.name}</span>
                            </div>
                          </PromptInputModelSelectItem>
                        );
                      })}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={!input && !status}
                  status={status}
                />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>

      {/* Threads Modal */}
      <Dialog open={threadsModalOpen} onOpenChange={setThreadsModalOpen}>
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

      {/* Connect Apps Modal */}
      <Dialog
        open={connectAppsModalOpen}
        onOpenChange={(open) => {
          setConnectAppsModalOpen(open);
          if (!open) {
            setIsConnected(false);
            setMcpUrl('');
          }
        }}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Plug2 className='h-5 w-5' />
              Connect Apps
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <label htmlFor='mcp-url' className='text-sm font-medium'>
                MCP HTTP Streamable URL
              </label>
              <Input
                id='mcp-url'
                type='url'
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                placeholder='https://example.com/mcp/stream'
                disabled={isConnected}
              />
            </div>

            <Button
              onClick={handleConnectApp}
              disabled={!mcpUrl.trim() || isConnected}
              className='w-full'
              variant={isConnected ? 'default' : 'default'}
            >
              {isConnected ? (
                <>
                  <Check className='mr-2 h-4 w-4' />
                  Connected
                </>
              ) : (
                <>
                  <Plug2 className='mr-2 h-4 w-4' />
                  Connect
                </>
              )}
            </Button>

            {isConnected && (
              <p className='flex items-center gap-2 text-sm text-green-600'>
                <Check className='h-4 w-4' />
                Successfully connected to MCP service
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
