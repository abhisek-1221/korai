import { create } from 'zustand';

export interface ThreadData {
  post: number;
  content: string;
  total: number;
  thumbnail?: string;
}

interface VideoChatState {
  // Video state
  videoUrl: string;
  videoId: string;
  transcript: string;
  hasTranscript: boolean;
  isLoadingTranscript: boolean;

  // Thread state
  threads: ThreadData[];
  generatingThreads: boolean;
  threadsModalOpen: boolean;

  // Actions
  setVideoUrl: (url: string) => void;
  setVideoId: (id: string) => void;
  setTranscript: (transcript: string) => void;
  setHasTranscript: (has: boolean) => void;
  setIsLoadingTranscript: (loading: boolean) => void;
  setThreads: (threads: ThreadData[]) => void;
  setGeneratingThreads: (generating: boolean) => void;
  setThreadsModalOpen: (open: boolean) => void;
  resetChat: () => void;
}

const initialState = {
  videoUrl: '',
  videoId: '',
  transcript: '',
  hasTranscript: false,
  isLoadingTranscript: false,
  threads: [],
  generatingThreads: false,
  threadsModalOpen: false
};

export const useVideoChatStore = create<VideoChatState>((set) => ({
  ...initialState,

  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoId: (id) => set({ videoId: id }),
  setTranscript: (transcript) => set({ transcript }),
  setHasTranscript: (has) => set({ hasTranscript: has }),
  setIsLoadingTranscript: (loading) => set({ isLoadingTranscript: loading }),
  setThreads: (threads) => set({ threads }),
  setGeneratingThreads: (generating) => set({ generatingThreads: generating }),
  setThreadsModalOpen: (open) => set({ threadsModalOpen: open }),
  resetChat: () => set(initialState)
}));
