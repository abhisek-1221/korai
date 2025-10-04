import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ThreadData {
  post: number;
  content: string;
  total: number;
  thumbnail?: string;
}

interface ChatState {
  // Video state
  videoUrl: string;
  videoId: string;
  transcript: string;
  hasTranscript: boolean;

  // Chat state
  messages: Message[];
  inputMessage: string;
  isLoading: boolean;
  isStreaming: boolean;

  // Thread state
  threads: ThreadData[];
  generatingThreads: boolean;
  threadsModalOpen: boolean;

  // UI state
  activeCategory: string;
  selectedLLM: string;

  // Actions
  setVideoUrl: (url: string) => void;
  setVideoId: (id: string) => void;
  setTranscript: (transcript: string) => void;
  setHasTranscript: (has: boolean) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setInputMessage: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsStreaming: (streaming: boolean) => void;
  setThreads: (threads: ThreadData[]) => void;
  setGeneratingThreads: (generating: boolean) => void;
  setThreadsModalOpen: (open: boolean) => void;
  setActiveCategory: (category: string) => void;
  setSelectedLLM: (llm: string) => void;
  resetChat: () => void;
}

const initialState = {
  videoUrl: '',
  videoId: '',
  transcript: '',
  hasTranscript: false,
  messages: [],
  inputMessage: '',
  isLoading: false,
  isStreaming: false,
  threads: [],
  generatingThreads: false,
  threadsModalOpen: false,
  activeCategory: '',
  selectedLLM: 'gemini-2.5-flash'
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoId: (id) => set({ videoId: id }),
  setTranscript: (transcript) => set({ transcript }),
  setHasTranscript: (has) => set({ hasTranscript: has }),

  setMessages: (messages) =>
    set((state) => ({
      messages:
        typeof messages === 'function' ? messages(state.messages) : messages
    })),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastMessage: (content) =>
    set((state) => ({
      messages: state.messages.map((msg, idx) =>
        idx === state.messages.length - 1
          ? { ...msg, content: msg.content + content }
          : msg
      )
    })),

  setInputMessage: (message) => set({ inputMessage: message }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setThreads: (threads) => set({ threads }),
  setGeneratingThreads: (generating) => set({ generatingThreads: generating }),
  setThreadsModalOpen: (open) => set({ threadsModalOpen: open }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSelectedLLM: (llm) => set({ selectedLLM: llm }),

  resetChat: () => set(initialState)
}));
