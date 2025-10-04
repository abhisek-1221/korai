import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string;
  language?: string;
}

interface VoiceChatState {
  // Video state
  videoUrl: string;
  transcript: string;
  hasTranscript: boolean;

  // Chat state
  messages: Message[];
  selectedLanguage: string;

  // Audio state
  isRecording: boolean;
  isProcessingAudio: boolean;
  isPlayingAudio: boolean;
  audioLevel: number;

  // Loading states
  isLoading: boolean;

  // Actions
  setVideoUrl: (url: string) => void;
  setTranscript: (transcript: string) => void;
  setHasTranscript: (has: boolean) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  setSelectedLanguage: (language: string) => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessingAudio: (processing: boolean) => void;
  setIsPlayingAudio: (playing: boolean) => void;
  setAudioLevel: (level: number) => void;
  setIsLoading: (loading: boolean) => void;
  resetChat: () => void;
}

const initialState = {
  videoUrl: '',
  transcript: '',
  hasTranscript: false,
  messages: [],
  selectedLanguage: 'en-US',
  isRecording: false,
  isProcessingAudio: false,
  isPlayingAudio: false,
  audioLevel: 0,
  isLoading: false
};

export const useVoiceChatStore = create<VoiceChatState>((set) => ({
  ...initialState,

  setVideoUrl: (url) => set({ videoUrl: url }),
  setTranscript: (transcript) => set({ transcript }),
  setHasTranscript: (has) => set({ hasTranscript: has }),

  setMessages: (messages) =>
    set((state) => ({
      messages:
        typeof messages === 'function' ? messages(state.messages) : messages
    })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsProcessingAudio: (processing) => set({ isProcessingAudio: processing }),
  setIsPlayingAudio: (playing) => set({ isPlayingAudio: playing }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  resetChat: () => set(initialState)
}));
