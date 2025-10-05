import { create } from 'zustand';

interface VideoChatState {
  // Video state
  videoUrl: string;
  transcript: string;
  hasTranscript: boolean;
  isLoadingTranscript: boolean;

  // Actions
  setVideoUrl: (url: string) => void;
  setTranscript: (transcript: string) => void;
  setHasTranscript: (has: boolean) => void;
  setIsLoadingTranscript: (loading: boolean) => void;
  resetChat: () => void;
}

const initialState = {
  videoUrl: '',
  transcript: '',
  hasTranscript: false,
  isLoadingTranscript: false
};

export const useVideoChatStore = create<VideoChatState>((set) => ({
  ...initialState,

  setVideoUrl: (url) => set({ videoUrl: url }),
  setTranscript: (transcript) => set({ transcript }),
  setHasTranscript: (has) => set({ hasTranscript: has }),
  setIsLoadingTranscript: (loading) => set({ isLoadingTranscript: loading }),
  resetChat: () => set(initialState)
}));
