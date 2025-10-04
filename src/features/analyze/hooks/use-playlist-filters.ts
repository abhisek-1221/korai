import { useMemo } from 'react';
import { useAnalyzeStore } from '../store/analyze-store';
import type { VideoItem } from '@/lib/youtube';

export const usePlaylistFilters = () => {
  const {
    playlistData,
    rangeStart,
    rangeEnd,
    sortBy,
    playbackSpeed,
    searchQuery
  } = useAnalyzeStore();

  // Filter videos by range and search query
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

  // Sort filtered videos
  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return b.duration - a.duration;
        case 'views':
          return b.viewCount - a.viewCount;
        case 'likes':
          return b.likeCount - a.likeCount;
        case 'publishdate':
        case 'publish date':
          return (
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
          );
        default:
          return 0; // Default to original order (position)
      }
    });
  }, [filteredVideos, sortBy]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return filteredVideos.reduce((acc, video) => acc + video.duration, 0);
  }, [filteredVideos]);

  // Calculate adjusted duration based on playback speed
  const adjustedDuration = useMemo(() => {
    return Math.round(totalDuration / Number.parseFloat(playbackSpeed));
  }, [totalDuration, playbackSpeed]);

  // Generate range options for dropdowns
  const rangeOptions = useMemo(() => {
    if (!playlistData) return [];
    return Array.from({ length: playlistData.totalVideos }, (_, i) =>
      (i + 1).toString()
    );
  }, [playlistData]);

  return {
    filteredVideos,
    sortedVideos,
    totalDuration,
    adjustedDuration,
    rangeOptions
  };
};
