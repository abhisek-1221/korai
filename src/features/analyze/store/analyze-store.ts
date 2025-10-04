import { create } from 'zustand';
import type { PlaylistDetails, VideoItem } from '@/lib/youtube';

interface PlaylistData {
  playlistDetails: PlaylistDetails;
  videos: VideoItem[];
  totalDuration: number;
  totalVideos: number;
}

interface AnalyzeState {
  playlistUrl: string;
  playlistData: PlaylistData | null;
  rangeStart: string;
  rangeEnd: string;
  sortBy: string;
  playbackSpeed: string;
  searchQuery: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

interface AnalyzeActions {
  setPlaylistUrl: (url: string) => void;
  setPlaylistData: (data: PlaylistData | null) => void;
  setRangeStart: (start: string) => void;
  setRangeEnd: (end: string) => void;
  setSortBy: (sortBy: string) => void;
  setPlaybackSpeed: (speed: string) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSuccess: (success: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AnalyzeState = {
  playlistUrl: '',
  playlistData: null,
  rangeStart: '1',
  rangeEnd: '100',
  sortBy: 'position',
  playbackSpeed: '1',
  searchQuery: '',
  isLoading: false,
  isSuccess: false,
  error: null
};

export const useAnalyzeStore = create<AnalyzeState & AnalyzeActions>((set) => ({
  ...initialState,
  setPlaylistUrl: (url) => set({ playlistUrl: url }),
  setPlaylistData: (data) => set({ playlistData: data }),
  setRangeStart: (start) => set({ rangeStart: start }),
  setRangeEnd: (end) => set({ rangeEnd: end }),
  setSortBy: (sortBy) => set({ sortBy: sortBy }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSuccess: (success) => set({ isSuccess: success }),
  setError: (error) => set({ error: error }),
  reset: () => set(initialState)
}));
