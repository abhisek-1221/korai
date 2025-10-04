'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Clock,
  SortAsc,
  PlayCircle,
  FastForward,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toast } from '@/components/searchbar/toast';
import { VideoCard } from '@/components/VideoCard';
import FeatureCard from '@/components/hsr/FeatureCard';
import { formatDuration } from '@/lib/ythelper';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { useAnalyzeStore } from '../store/analyze-store';
import { useFetchPlaylist, usePlaylistFilters } from '../hooks';

export default function AnalyzeViewPage() {
  const {
    playlistUrl,
    playlistData,
    rangeStart,
    rangeEnd,
    sortBy,
    playbackSpeed,
    searchQuery,
    isLoading,
    isSuccess,
    setPlaylistUrl,
    setRangeStart,
    setRangeEnd,
    setSortBy,
    setPlaybackSpeed,
    setSearchQuery,
    setIsSuccess
  } = useAnalyzeStore();

  const { fetchPlaylist } = useFetchPlaylist();
  const { sortedVideos, adjustedDuration, rangeOptions } = usePlaylistFilters();

  const handleAnalyze = useCallback(() => {
    fetchPlaylist();
  }, [fetchPlaylist]);

  const handleReset = useCallback(() => {
    setIsSuccess(false);
  }, [setIsSuccess]);

  // Determine state for Toast component
  const toastState = isLoading ? 'loading' : isSuccess ? 'success' : 'initial';

  return (
    <PageContainer scrollable>
      <div className='w-full space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Playlist Analyzer'
            description='Analyze YouTube playlists and get insights'
          />
        </div>

        {/* Input Form */}
        <Card className='bg-background border-zinc-800'>
          <CardContent className='p-4'>
            <div className='flex space-x-2'>
              <Input
                type='text'
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder='Enter YouTube Playlist URL...'
                className='flex-1'
              />
              <Toast
                state={toastState}
                onSave={handleAnalyze}
                onReset={handleReset}
              />
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message - Only shown initially */}
        {!playlistData && <FeatureCard type='analyze' />}

        {/* Analysis Results - Shown after data fetch */}
        {playlistData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='space-y-4'
          >
            {/* Summary and Filters */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {/* Playlist Summary */}
              <Card className='bg-background border-zinc-800'>
                <CardContent className='p-4'>
                  <h3 className='mb-4 text-lg font-bold'>Playlist Summary</h3>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <PlayCircle className='h-4 w-4 text-blue-400' />
                      <span className='font-semibold'>
                        Total Videos: {playlistData.totalVideos}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-green-500' />
                      <span className='font-semibold'>
                        Total Duration: {formatDuration(adjustedDuration)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filters Card */}
              <Card className='bg-background border-zinc-800'>
                <CardContent className='p-4'>
                  <h3 className='mb-4 text-lg font-semibold'>Filters</h3>
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {/* Playback Speed */}
                    <div className='flex items-center gap-2'>
                      <FastForward className='h-4 w-4 text-purple-400' />
                      <Select
                        value={playbackSpeed}
                        onValueChange={setPlaybackSpeed}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Speed' />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            '0.25',
                            '0.5',
                            '0.75',
                            '1',
                            '1.25',
                            '1.5',
                            '1.75',
                            '2'
                          ].map((speed) => (
                            <SelectItem key={speed} value={speed}>
                              {speed}x
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Sort By */}
                    <div className='flex items-center gap-2'>
                      <SortAsc className='h-4 w-4 text-orange-400' />
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Sort' />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'Position',
                            'Duration',
                            'Views',
                            'Likes',
                            'Publish Date'
                          ].map((option) => (
                            <SelectItem
                              key={option}
                              value={option.toLowerCase()}
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Range Selection */}
                    <div className='flex items-center gap-2 sm:col-span-2 lg:col-span-1'>
                      <Calendar className='h-4 w-4 text-red-400' />
                      <Select value={rangeStart} onValueChange={setRangeStart}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Start' />
                        </SelectTrigger>
                        <SelectContent>
                          {rangeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className='text-muted-foreground'>-</span>
                      <Select value={rangeEnd} onValueChange={setRangeEnd}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='End' />
                        </SelectTrigger>
                        <SelectContent>
                          {rangeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className='text-muted-foreground mt-3 text-sm'>
                    Analyzing videos {rangeStart} to {rangeEnd} at speed:{' '}
                    {playbackSpeed}x
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search Bar */}
            <div className='flex justify-center'>
              <Input
                className='w-full max-w-md'
                placeholder='Search videos...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Video Grid */}
            <Card className='bg-background border-zinc-800'>
              <CardContent className='p-4'>
                <ScrollArea className='h-[500px]'>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                    {sortedVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </div>
                  {sortedVideos.length === 0 && (
                    <div className='text-muted-foreground py-8 text-center'>
                      No videos found matching your criteria
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
