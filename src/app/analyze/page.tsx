'use client';

import { useState, useMemo } from 'react';
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
import type { PlaylistDetails, VideoItem } from '@/lib/youtube';
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
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/ythelper';

export default function PlaylistAnalyzer() {
  const { toast } = useToast();
  const [playlistUrl, setplaylistUrl] = useState('');
  const [playlistData, setPlaylistData] = useState<{
    playlistDetails: PlaylistDetails;
    videos: VideoItem[];
    totalDuration: number;
    totalVideos: number;
  } | null>(null);
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('100');
  const [sortBy, setSortBy] = useState('position');
  const [state, setState] = useState<'initial' | 'loading' | 'success'>(
    'initial'
  );
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAnalyze = async () => {
    setState('loading');
    try {
      const response = await fetch(`/api/playlist?id=${playlistUrl}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch playlist data');
      }

      setPlaylistData(data);
      setRangeEnd(data.totalVideos.toString());
      setState('success');
      toast({
        title: 'Success',
        description: 'Playlist analysis completed successfully',
        variant: 'default'
      });

      setTimeout(() => {
        setState('initial');
      }, 2000);
    } catch (error: any) {
      console.error('Error analyzing playlist:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: error.message || 'Failed to analyze playlist',
        variant: 'destructive'
      });

      setTimeout(() => {
        setState('initial');
      }, 2000);
    }
  };

  const handleReset = () => {
    setState('initial');
  };

  const filteredVideos = useMemo(() => {
    if (!playlistData) return [];
    const start = Number.parseInt(rangeStart) - 1;
    const end = Number.parseInt(rangeEnd);
    return playlistData.videos
      .slice(start, end)
      .filter((video) =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [playlistData, rangeStart, rangeEnd, searchQuery]);

  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return b.duration - a.duration;
        case 'views':
          return b.viewCount - a.viewCount;
        case 'likes':
          return b.likeCount - a.likeCount;
        case 'publishDate':
          return (
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
          );
        default:
          return 0; // Default to original order
      }
    });
  }, [filteredVideos, sortBy]);

  const totalDuration = useMemo(() => {
    return filteredVideos?.reduce((acc, video) => acc + video.duration, 0);
  }, [filteredVideos]);

  const adjustedDuration = Math.round(
    totalDuration / Number.parseFloat(playbackSpeed)
  );

  const rangeOptions = useMemo(() => {
    if (!playlistData) return [];
    return Array.from({ length: playlistData.totalVideos }, (_, i) =>
      (i + 1).toString()
    );
  }, [playlistData]);

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-950 p-2 text-white sm:p-4 lg:p-6 xl:p-8'>
      <Card className='w-full max-w-sm rounded-2xl border-zinc-800 bg-black shadow-xl shadow-stone-600 sm:max-w-md md:max-w-lg lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl'>
        <CardContent className='relative flex min-h-[500px] flex-col p-3 sm:min-h-[600px] sm:p-4 md:min-h-[700px] md:p-6 lg:min-h-[800px] lg:p-8 xl:p-10'>
          {/* Main Content Area */}
          <div className='flex flex-1 flex-col pb-16 sm:pb-20 md:pb-24'>
            {/* Welcome Message - Only shown initially */}
            {!playlistData && <FeatureCard type='analyze' />}

            {/* Analysis Results - Shown after data fetch */}
            {playlistData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='mb-2 space-y-4'
              >
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900 p-4'>
                    <CardContent>
                      <h3 className='mb-4 text-lg font-bold'>
                        Playlist Summary
                      </h3>
                      <div className='space-y-2'>
                        <div className='flex items-center gap-2'>
                          <PlayCircle className='h-4 w-4' />
                          <span className='font-bold'>
                            Total Videos: {playlistData?.totalVideos}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Clock className='h-4 w-4' />
                          <span className='font-bold'>
                            Total Duration: {formatDuration(adjustedDuration)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Filters Card */}
                  <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900 p-4'>
                    <CardContent>
                      <h3 className='mb-2 text-lg font-semibold'>Filters</h3>
                      <div className='flex items-center gap-4'>
                        {/* Playback Speed */}
                        <div className='flex-1'>
                          <Select
                            value={playbackSpeed}
                            onValueChange={setPlaybackSpeed}
                          >
                            <SelectTrigger className='w-full'>
                              <FastForward className='mr-2 h-4 w-4' />
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
                        <div className='flex-1'>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className='w-full'>
                              <SortAsc className='mr-2 h-4 w-4' />
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
                        <div className='flex flex-1 items-center gap-2'>
                          <Calendar className='h-4 w-4 text-red-200' />
                          <Select
                            value={rangeStart}
                            onValueChange={setRangeStart}
                          >
                            <SelectTrigger className='w-full border-gray-600'>
                              <SelectValue placeholder='Start' />
                            </SelectTrigger>
                            <SelectContent className='border-gray-600'>
                              {rangeOptions.map((option) => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  className='text-white hover:bg-gray-600'
                                >
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className='text-gray-400'>-</span>
                          <Select value={rangeEnd} onValueChange={setRangeEnd}>
                            <SelectTrigger className='w-full border-gray-600'>
                              <SelectValue placeholder='End' />
                            </SelectTrigger>
                            <SelectContent className='border-gray-600'>
                              {rangeOptions.map((option) => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  className='text-white hover:bg-gray-600'
                                >
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <p className='mt-4 text-sm text-gray-300'>
                        Analyzing videos {rangeStart} to {rangeEnd} at speed:{' '}
                        {playbackSpeed}x
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Search Bar */}
                <div className='flex justify-center'>
                  <Input
                    className='w-full max-w-md rounded-full border-zinc-700 bg-transparent'
                    placeholder='Search videos...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Video Grid */}

                <ScrollArea className='h-[350px]'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {sortedVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </div>

          {/* Input Area - Always visible at the bottom */}
          <div className='absolute right-0 bottom-0 left-0 rounded-2xl border-zinc-800 bg-black p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10'>
            <div className='mx-auto flex w-full space-x-2 sm:w-5/6 md:w-4/5 lg:w-3/4 xl:w-2/3'>
              <Input
                className='flex-1 rounded-full border-zinc-700 bg-transparent text-sm shadow-md shadow-gray-700 md:text-base'
                placeholder='Enter YouTube Playlist URL...'
                value={playlistUrl}
                onChange={(e) => setplaylistUrl(e.target.value)}
              />
              <Toast
                state={state}
                onSave={handleAnalyze}
                onReset={handleReset}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
