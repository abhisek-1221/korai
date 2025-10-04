'use client';

import { useEffect, useCallback, useMemo } from 'react';
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
import { useTranscribeStore } from '../store/transcribe-store';
import { useFetchTranscript } from '../hooks/use-fetch-transcript';
import { useYoutubePlayer } from '../hooks/use-youtube-player';
import { useTranscriptDownload } from '../hooks/use-transcript-download';

export default function TranscribeViewPage() {
  const {
    videoUrl,
    videoDetails,
    transcriptData,
    searchQuery,
    showFullDescription,
    isLoading,
    isSuccess,
    setVideoUrl,
    setSearchQuery,
    setShowFullDescription,
    setYoutubePlayer
  } = useTranscribeStore();

  const { fetchTranscript } = useFetchTranscript();
  const { isApiReady, isScriptLoaded, initializePlayer, seekTo } =
    useYoutubePlayer();
  const {
    downloadFullTranscript,
    downloadTimestampedTranscript,
    downloadSrtSubtitles
  } = useTranscriptDownload();

  // Initialize YouTube player when API is ready and video details are available
  useEffect(() => {
    if (isApiReady && videoDetails?.id) {
      // Small delay to ensure the iframe element is rendered
      const timer = setTimeout(() => {
        const player = initializePlayer(
          'youtube-player',
          videoDetails.id,
          (playerInstance) => {
            setYoutubePlayer(playerInstance);
          }
        );
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isApiReady, videoDetails?.id, initializePlayer, setYoutubePlayer]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      fetchTranscript();
    },
    [fetchTranscript]
  );

  const handleTimestampClick = useCallback(
    (startTime: string) => {
      const player = useTranscribeStore.getState().youtubePlayer;
      if (player) {
        const [minutes, seconds] = startTime.split(':').map(Number);
        const timeInSeconds = minutes * 60 + seconds;
        seekTo(player, timeInSeconds);
      }
    },
    [seekTo]
  );

  const fullTranscript = useMemo(
    () => transcriptData.map((entry) => entry.text).join(' '),
    [transcriptData]
  );

  const filteredTranscripts = useMemo(
    () =>
      transcriptData.filter((entry) =>
        entry?.text?.toLowerCase().includes(searchQuery?.toLowerCase())
      ),
    [transcriptData, searchQuery]
  );

  return (
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
            <form onSubmit={handleSubmit} className='flex space-x-2'>
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
                  handleSubmit(e as any);
                }}
                loading={isLoading}
                success={isSuccess}
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
                  <div className='relative aspect-video w-full overflow-hidden rounded-lg bg-black'>
                    {isScriptLoaded && videoDetails?.id && (
                      <div
                        id='youtube-player'
                        key={videoDetails.id}
                        className='absolute inset-0 h-full w-full'
                      />
                    )}
                  </div>
                  <div className='space-y-2'>
                    <h2 className='text-lg font-bold'>{videoDetails.title}</h2>
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
                            onClick={downloadTimestampedTranscript}
                            className='rounded-full text-xs'
                          >
                            <Download className='mr-1 h-3 w-3' />
                            TXT
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={downloadSrtSubtitles}
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
                      <h3 className='text-lg font-semibold'>Full Transcript</h3>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={downloadFullTranscript}
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
  );
}
