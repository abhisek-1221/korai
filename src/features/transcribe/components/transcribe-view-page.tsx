'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Eye,
  ThumbsUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import type React from 'react';
import FeatureCard from '@/components/hsr/FeatureCard';
import { FancyButton } from '@/components/ui/fancy-button';
import { formatDate, formatNumber } from '@/lib/ythelper';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';

// Extend the Window interface to include onYouTubeIframeAPIReady
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    maxres?: { url: string };
    high?: { url: string };
    medium?: { url: string };
  };
  channelTitle: string;
  publishedAt: string;
  duration: number;
  viewCount: number;
  likeCount: number;
}

export default function TranscribeViewPage() {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState('');
  const [transcriptData, setTranscriptData] = useState<any[]>([]);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);

  useEffect(() => {
    // Declare the onYouTubeIframeAPIReady callback
    window.onYouTubeIframeAPIReady = () => {
      setIsYouTubeApiReady(true);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  const handleSubmissiom = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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

      const transcriptResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });

      // Handle rate limit exceeded
      if (transcriptResponse.status === 429) {
        const data = await transcriptResponse.json();
        toast({
          title: 'Rate Limit Exceeded',
          description: `Too many requests. Please try again in ${Math.ceil((data.reset - Date.now()) / 1000)} seconds.`,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      if (!transcriptResponse.ok) {
        const errorData = await transcriptResponse.json();
        throw new Error(errorData.error || 'Failed to fetch transcript');
      }

      const transcriptData = await transcriptResponse.json();
      handleTranscriptData(transcriptData.transcript);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setTranscriptData([]);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transcript',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  // Helper function to process transcript data
  const handleTranscriptData = (transcript: any) => {
    if (!transcript) return;

    if (transcript.segments) {
      const formattedTranscript = transcript.segments.map((segment: any) => ({
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime
      }));
      setTranscriptData(formattedTranscript);
    } else if (transcript.fullTranscript) {
      setTranscriptData([
        {
          text: transcript.fullTranscript,
          startTime: '0:00',
          endTime: '0:00'
        }
      ]);
    }
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 4000);
  };

  const fullTranscript = transcriptData.map((entry) => entry.text).join(' ');
  const filteredTranscripts = transcriptData.filter((entry) =>
    entry?.text?.toLowerCase().includes(searchQuery?.toLowerCase())
  );

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([fullTranscript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript-${videoDetails?.title || 'video'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTimestampedDownload = () => {
    const formattedTranscript = transcriptData
      .map(
        (entry) => `[${entry.startTime} - ${entry.endTime}]\n${entry.text}\n`
      )
      .join('\n');

    const element = document.createElement('a');
    const file = new Blob([formattedTranscript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `timestamped-transcript-${videoDetails?.title || 'video'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSrtDownload = () => {
    const convertToSrtTime = (timeStr: string) => {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},000`;
    };

    const srtContent = transcriptData
      .map((entry, index) => {
        const startTime = convertToSrtTime(entry.startTime);
        const endTime = convertToSrtTime(entry.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
      })
      .join('\n');

    const element = document.createElement('a');
    const file = new Blob([srtContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `subtitles-${videoDetails?.title || 'video'}.srt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTimestampClick = (startTime: string) => {
    if (player) {
      // Convert timestamp (MM:SS) to seconds
      const [minutes, seconds] = startTime.split(':').map(Number);
      const timeInSeconds = minutes * 60 + seconds;
      player.seekTo(timeInSeconds);
      player.playVideo();
    }
  };

  return (
    <>
      <script src='https://www.youtube.com/iframe_api' />
      <PageContainer scrollable>
        <div className='space-y-4'>
          <div className='flex items-start justify-between'>
            <Heading
              title='Video Transcribe'
              description='Get transcripts from YouTube videos'
            />
          </div>

          {/* Input Form */}
          <Card className='bg-background border-zinc-800'>
            <CardContent className='p-4'>
              <form onSubmit={handleSubmissiom} className='flex space-x-2'>
                <Input
                  type='text'
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder='Enter YouTube video URL...'
                  className='flex-1'
                />
                <FancyButton
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    handleSubmissiom(e as any);
                  }}
                  loading={loading}
                  success={showSuccess}
                  label='Get Transcript'
                />
              </form>
            </CardContent>
          </Card>

          {/* Welcome Message - Only shown initially */}
          {!videoDetails && <FeatureCard type='transcribe' />}

          {/* Video Details and Transcript */}
          {videoDetails && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='space-y-4'
            >
              {/* Video Info Card */}
              <Card className='bg-background border-zinc-800'>
                <CardContent className='p-4'>
                  <div className='grid gap-4 md:grid-cols-[400px,1fr]'>
                    <div className='relative aspect-video w-full overflow-hidden rounded-lg'>
                      {isYouTubeApiReady && videoDetails?.id && (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoDetails.id}?enablejsapi=1`}
                          title={videoDetails.title}
                          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                          allowFullScreen
                          className='absolute inset-0 h-full w-full'
                          onLoad={(e) => {
                            const player = new (window as any).YT.Player(
                              e.target,
                              {
                                events: {
                                  onReady: (event: any) => {
                                    setPlayer(event.target);
                                  }
                                }
                              }
                            );
                          }}
                        />
                      )}
                    </div>
                    <div className='space-y-2'>
                      <h2 className='text-lg font-bold'>
                        {videoDetails.title}
                      </h2>
                      <p className='text-muted-foreground'>
                        {videoDetails.channelTitle}
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                          <Calendar className='h-4 w-4 text-yellow-600' />
                          {formatDate(videoDetails.publishedAt)}
                        </span>
                        <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                          <Eye className='h-4 w-4 text-blue-400' />
                          {formatNumber(videoDetails.viewCount)} views
                        </span>
                        <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                          <ThumbsUp className='h-4 w-4 text-green-500' />
                          {formatNumber(videoDetails.likeCount)} likes
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-muted-foreground ${showFullDescription ? '' : 'line-clamp-2'}`}
                        >
                          {videoDetails.description}
                        </p>
                        <Button
                          variant='ghost'
                          onClick={() =>
                            setShowFullDescription(!showFullDescription)
                          }
                          className='text-muted-foreground hover:text-foreground mt-2 h-auto p-0'
                        >
                          {showFullDescription ? (
                            <>
                              Show less <ChevronUp className='ml-1 h-4 w-4' />
                            </>
                          ) : (
                            <>
                              Show more <ChevronDown className='ml-1 h-4 w-4' />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transcripts */}
              {transcriptData.length > 0 && (
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                  {/* Timestamped Transcript */}
                  <Card className='bg-background border-zinc-800'>
                    <CardContent className='p-4'>
                      <div className='flex flex-col space-y-2'>
                        <div className='mb-4 flex items-center justify-between'>
                          <h3 className='text-lg font-semibold'>
                            Timestamped Transcript
                          </h3>
                          <div className='flex gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={handleTimestampedDownload}
                              className='rounded-full text-xs'
                            >
                              <Download className='mr-1 h-3 w-3' />
                              TXT
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={handleSrtDownload}
                              className='rounded-full text-xs'
                            >
                              <Download className='mr-1 h-3 w-3' />
                              SRT
                            </Button>
                          </div>
                        </div>

                        {/* Search Input */}
                        <div className='relative'>
                          <Input
                            type='text'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder='Search in transcript...'
                            className='w-full'
                          />
                        </div>

                        <ScrollArea className='h-[400px]'>
                          <div className='space-y-3'>
                            {filteredTranscripts.map((entry, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.05
                                }}
                                className='bg-secondary/50 hover:bg-secondary cursor-pointer rounded-lg p-3 transition-colors'
                                onClick={() =>
                                  handleTimestampClick(entry.startTime)
                                }
                              >
                                <div className='mb-1 flex items-center gap-2 text-sm text-blue-400'>
                                  <Clock className='h-4 w-4' />
                                  {entry.startTime} - {entry.endTime}
                                </div>
                                <p className='text-sm'>{entry.text}</p>
                              </motion.div>
                            ))}

                            {/* No results message */}
                            {filteredTranscripts.length === 0 && (
                              <div className='text-muted-foreground py-4 text-center'>
                                No matching transcripts found
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Full Transcript */}
                  <Card className='bg-background border-zinc-800'>
                    <CardContent className='p-4'>
                      <div className='mb-4 flex items-center justify-between'>
                        <h3 className='text-lg font-semibold'>
                          Full Transcript
                        </h3>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={handleDownload}
                          className='rounded-full'
                        >
                          <Download className='h-4 w-4' />
                        </Button>
                      </div>
                      <ScrollArea className='h-[450px]'>
                        <p className='text-sm whitespace-pre-wrap'>
                          {fullTranscript}
                        </p>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
