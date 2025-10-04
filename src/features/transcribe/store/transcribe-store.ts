import { create } from 'zustand';

export interface TranscriptSegment {
  text: string;
  startTime: string;
  endTime: string;
}

export interface VideoDetails {
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

interface TranscribeState {
  videoUrl: string;
  videoDetails: VideoDetails | null;
  transcriptData: TranscriptSegment[];
  searchQuery: string;
  showFullDescription: boolean;
  youtubePlayer: any;
  isLoading: boolean;
  isSuccess: boolean;
}

interface TranscribeActions {
  setVideoUrl: (url: string) => void;
  setVideoDetails: (details: VideoDetails | null) => void;
  setTranscriptData: (data: TranscriptSegment[]) => void;
  setSearchQuery: (query: string) => void;
  setShowFullDescription: (show: boolean) => void;
  setYoutubePlayer: (player: any) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSuccess: (success: boolean) => void;
  reset: () => void;
}

const initialState: TranscribeState = {
  videoUrl: '',
  videoDetails: null,
  transcriptData: [],
  searchQuery: '',
  showFullDescription: false,
  youtubePlayer: null,
  isLoading: false,
  isSuccess: false
};

export const useTranscribeStore = create<TranscribeState & TranscribeActions>(
  (set) => ({
    ...initialState,
    setVideoUrl: (url) => set({ videoUrl: url }),
    setVideoDetails: (details) => set({ videoDetails: details }),
    setTranscriptData: (data) => set({ transcriptData: data }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setShowFullDescription: (show) => set({ showFullDescription: show }),
    setYoutubePlayer: (player) => set({ youtubePlayer: player }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setIsSuccess: (success) => set({ isSuccess: success }),
    reset: () => set(initialState)
  })
);
