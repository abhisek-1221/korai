'use client';

import { create } from 'zustand';

interface VideoPlayerState {
  selectedVideoId: string | null;
  setSelectedVideoId: (videoId: string | null) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set) => ({
  selectedVideoId: null,
  setSelectedVideoId: (videoId) => set({ selectedVideoId: videoId })
}));
