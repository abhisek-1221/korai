import { create } from 'zustand';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: number;
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

export interface UsageInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

interface QuizState {
  videoUrl: string;
  videoDetails: VideoDetails | null;
  quiz: QuizQuestion[];
  userAnswers: UserAnswer[];
  selectedLLM: string;
  numQuestions: string;
  showFullDescription: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  isSubmitted: boolean;
  isSuccess: boolean;
  score: number;
  hasCopied: boolean;
  usage: UsageInfo | null;
}

interface QuizActions {
  setVideoUrl: (url: string) => void;
  setVideoDetails: (details: VideoDetails | null) => void;
  setQuiz: (quiz: QuizQuestion[]) => void;
  setUserAnswers: (answers: UserAnswer[]) => void;
  setSelectedLLM: (model: string) => void;
  setNumQuestions: (num: string) => void;
  setShowFullDescription: (show: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsSubmitted: (submitted: boolean) => void;
  setIsSuccess: (success: boolean) => void;
  setScore: (score: number) => void;
  setHasCopied: (copied: boolean) => void;
  setUsage: (usage: UsageInfo | null) => void;
  updateUserAnswer: (questionId: string, selectedOption: number) => void;
  resetQuiz: () => void;
  reset: () => void;
}

const initialState: QuizState = {
  videoUrl: '',
  videoDetails: null,
  quiz: [],
  userAnswers: [],
  selectedLLM: 'gemini-2.5-flash',
  numQuestions: '5',
  showFullDescription: false,
  isLoading: false,
  isGenerating: false,
  isSubmitted: false,
  isSuccess: false,
  score: 0,
  hasCopied: false,
  usage: null
};

export const useQuizStore = create<QuizState & QuizActions>((set) => ({
  ...initialState,
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoDetails: (details) => set({ videoDetails: details }),
  setQuiz: (quiz) => set({ quiz }),
  setUserAnswers: (answers) => set({ userAnswers: answers }),
  setSelectedLLM: (model) => set({ selectedLLM: model }),
  setNumQuestions: (num) => set({ numQuestions: num }),
  setShowFullDescription: (show) => set({ showFullDescription: show }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setIsSubmitted: (submitted) => set({ isSubmitted: submitted }),
  setIsSuccess: (success) => set({ isSuccess: success }),
  setScore: (score) => set({ score }),
  setHasCopied: (copied) => set({ hasCopied: copied }),
  setUsage: (usage) => set({ usage }),
  updateUserAnswer: (questionId, selectedOption) =>
    set((state) => ({
      userAnswers: state.userAnswers.map((answer) =>
        answer.questionId === questionId
          ? { ...answer, selectedOption }
          : answer
      )
    })),
  resetQuiz: () =>
    set({
      userAnswers: initialState.userAnswers,
      isSubmitted: false,
      score: 0
    }),
  reset: () => set(initialState)
}));
