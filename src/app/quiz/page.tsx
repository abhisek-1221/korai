'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FancyButton } from '@/components/ui/fancy-button';
import { VideoSkeleton, QuizSkeleton } from '@/components/ui/skeletons';
import {
  Eye,
  ThumbsUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import type React from 'react';
import FeatureCard from '@/components/hsr/FeatureCard';
import { formatDate, formatNumber } from '@/lib/ythelper';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_MODEL } from '@/lib/providers';

interface VideoDetails {
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

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface UserAnswer {
  questionId: string;
  selectedOption: number;
}

interface UsageInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Usage Display Component
function UsageDisplay({ usage }: { usage: UsageInfo | null }) {
  if (!usage) return null;

  const resetDate = new Date(usage.reset);
  const now = new Date();
  const timeUntilReset = resetDate.getTime() - now.getTime();
  const hoursUntilReset = Math.max(
    0,
    Math.ceil(timeUntilReset / (1000 * 60 * 60))
  );

  return (
    <div className='flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-400'>
      <AlertCircle className='h-4 w-4' />
      <span>
        <span className='font-medium text-white'>{usage.remaining}</span> quiz
        attempts remaining today
        {usage.remaining === 0 && (
          <span className='ml-1 text-orange-400'>
            (Resets in {hoursUntilReset}h)
          </span>
        )}
      </span>
    </div>
  );
}

export default function QuizPage() {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState(DEFAULT_MODEL);
  const [numQuestions, setNumQuestions] = useState('5');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [hasCopied, setHasCopied] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch usage info
  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.quiz);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  }, []);

  // Fetch usage on component mount
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const generateQuiz = useCallback(
    async (fullTranscript: string) => {
      setIsGenerating(true);
      setQuiz([]);
      setUserAnswers([]);
      setIsSubmitted(false);
      setScore(0);

      try {
        abortControllerRef.current = new AbortController();
        const response = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: fullTranscript,
            numQuestions: parseInt(numQuestions),
            model: selectedLLM
          }),
          signal: abortControllerRef.current.signal
        });

        if (response.status === 429) {
          const data = await response.json();
          toast({
            title: 'Quiz Limit Exceeded',
            description:
              data.error || 'You have used all your quiz attempts for today.',
            variant: 'destructive'
          });
          // Refresh usage info
          await fetchUsage();
          setIsGenerating(false);
          return;
        }

        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to generate quizzes.',
            variant: 'destructive'
          });
          setIsGenerating(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to generate quiz');
        }

        // Update usage info from response headers
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining && usage) {
          setUsage((prev) =>
            prev
              ? {
                  ...prev,
                  remaining: parseInt(remaining),
                  used: prev.limit - parseInt(remaining)
                }
              : null
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        let streamedQuiz = '';
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('0:')) {
              streamedQuiz += JSON.parse(line.slice(2));
            }
          }
        }

        if (buffer && buffer.startsWith('0:')) {
          streamedQuiz += JSON.parse(buffer.slice(2));
        }

        // Parse the generated quiz
        try {
          // Remove markdown code blocks if present
          let cleanedQuiz = streamedQuiz.trim();

          // Remove ```json and ``` markers
          if (cleanedQuiz.startsWith('```json')) {
            cleanedQuiz = cleanedQuiz.replace(/^```json\s*/, '');
          }
          if (cleanedQuiz.startsWith('```')) {
            cleanedQuiz = cleanedQuiz.replace(/^```\s*/, '');
          }
          if (cleanedQuiz.endsWith('```')) {
            cleanedQuiz = cleanedQuiz.replace(/\s*```$/, '');
          }

          const parsedQuiz = JSON.parse(cleanedQuiz);
          if (parsedQuiz.questions && Array.isArray(parsedQuiz.questions)) {
            const formattedQuiz = parsedQuiz.questions.map(
              (q: any, index: number) => ({
                id: `q${index + 1}`,
                question: q.question,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
              })
            );
            setQuiz(formattedQuiz);
            setUserAnswers(
              formattedQuiz.map((q: QuizQuestion) => ({
                questionId: q.id,
                selectedOption: -1
              }))
            );
          } else {
            throw new Error('Invalid quiz format');
          }
        } catch (parseError) {
          console.error('Failed to parse quiz:', parseError);
          console.error('Raw quiz content:', streamedQuiz);
          throw new Error('Failed to parse generated quiz');
        }

        toast({
          title: 'Success',
          description: 'Quiz generated successfully',
          variant: 'default'
        });
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
          toast({
            title: 'Info',
            description: 'Quiz generation was cancelled',
            variant: 'default'
          });
        } else {
          console.error('Error:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to generate quiz',
            variant: 'destructive'
          });
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedLLM, numQuestions, toast, usage, fetchUsage]
  );

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLLM) {
      toast({
        title: 'Warning',
        description: 'Please select an LLM model first',
        variant: 'destructive'
      });
      return;
    }

    if (
      !numQuestions ||
      parseInt(numQuestions) < 2 ||
      parseInt(numQuestions) > 10
    ) {
      toast({
        title: 'Warning',
        description: 'Please select number of questions between 2 and 10',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Reset all states first
      setLoading(true);
      setIsGenerating(false);
      setQuiz([]);
      setUserAnswers([]);
      setIsSubmitted(false);
      setVideoDetails(null);

      // Get video details
      const videoResponse = await fetch('/api/videoDetail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });
      const videoData = await videoResponse.json();

      if (!videoResponse.ok) {
        throw new Error(videoData.error || 'Failed to fetch video details');
      }

      if (videoData.video) {
        setVideoDetails(videoData.video);
        setLoading(false);
      }

      // Get transcript
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });

      const transcriptData = await response.json();

      if (!response.ok) {
        throw new Error(transcriptData.error || 'Failed to fetch transcript');
      }

      if (!transcriptData?.transcript?.fullTranscript) {
        const errorMsg =
          transcriptData?.error ||
          'No transcript data available for this video';
        throw new Error(errorMsg);
      }

      if (transcriptData.transcript.fullTranscript.trim().length < 50) {
        throw new Error(
          'Transcript is too short to generate a meaningful quiz'
        );
      }

      const fullTranscript = transcriptData.transcript.fullTranscript;
      await generateQuiz(fullTranscript);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
    } catch (error: any) {
      console.error('Error:', error);

      let errorMessage = error.message || 'Failed to process video';
      let errorTitle = 'Error';

      if (
        error.message?.includes('No transcript available') ||
        error.message?.includes('Transcripts are disabled')
      ) {
        errorTitle = 'No Transcript Available';
        errorMessage =
          'This video does not have captions/transcripts available. Please try a video that has captions enabled.';
      } else if (
        error.message?.includes('private') ||
        error.message?.includes('unavailable')
      ) {
        errorTitle = 'Video Unavailable';
        errorMessage =
          'This video is private or unavailable. Please try a public video.';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive'
      });

      // Reset states on error
      setVideoDetails(null);
      setQuiz([]);
      setUserAnswers([]);
      setIsSubmitted(false);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (questionId: string, selectedOption: number) => {
    if (isSubmitted) return;

    setUserAnswers((prev) =>
      prev.map((answer) =>
        answer.questionId === questionId
          ? { ...answer, selectedOption }
          : answer
      )
    );
  };

  const handleQuizSubmit = () => {
    const allAnswered = userAnswers.every(
      (answer) => answer.selectedOption !== -1
    );
    if (!allAnswered) {
      toast({
        title: 'Warning',
        description: 'Please answer all questions before submitting',
        variant: 'destructive'
      });
      return;
    }

    let correctCount = 0;
    quiz.forEach((question) => {
      const userAnswer = userAnswers.find(
        (answer) => answer.questionId === question.id
      );
      if (userAnswer && userAnswer.selectedOption === question.correctAnswer) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setIsSubmitted(true);

    toast({
      title: 'Quiz Completed!',
      description: `You scored ${correctCount}/${quiz.length}`,
      variant: 'default'
    });
  };

  const handleRetry = () => {
    setUserAnswers(
      quiz.map((q) => ({
        questionId: q.id,
        selectedOption: -1
      }))
    );
    setIsSubmitted(false);
    setScore(0);
  };

  const handleCopy = async () => {
    const quizText = quiz
      .map(
        (q, i) =>
          `Question ${i + 1}: ${q.question}\n${q.options
            .map((opt, j) => `${String.fromCharCode(65 + j)}. ${opt}`)
            .join(
              '\n'
            )}\nCorrect Answer: ${String.fromCharCode(65 + q.correctAnswer)}\n`
      )
      .join('\n');

    await navigator.clipboard.writeText(quizText);
    setHasCopied(true);
    toast({
      title: 'Success',
      description: 'Quiz copied to clipboard',
      variant: 'default'
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownload = () => {
    const quizText = quiz
      .map(
        (q, i) =>
          `Question ${i + 1}: ${q.question}\n${q.options
            .map((opt, j) => `${String.fromCharCode(65 + j)}. ${opt}`)
            .join(
              '\n'
            )}\nCorrect Answer: ${String.fromCharCode(65 + q.correctAnswer)}\n`
      )
      .join('\n');

    const element = document.createElement('a');
    const file = new Blob([quizText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `quiz-${videoDetails?.title || 'video'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: 'Success',
      description: 'Quiz downloaded successfully',
      variant: 'default'
    });
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-950 p-2 text-white sm:p-4 lg:p-6 xl:p-8'>
      <Card
        className={`w-full max-w-sm rounded-2xl border-zinc-800 bg-black shadow-xl shadow-stone-600 sm:max-w-md md:max-w-lg lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl ${
          videoDetails && quiz.length > 0
            ? 'lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl'
            : ''
        }`}
      >
        <CardContent className='relative flex min-h-[500px] flex-col p-3 sm:min-h-[600px] sm:p-4 md:min-h-[700px] md:p-6 lg:min-h-[800px] lg:p-8 xl:p-10'>
          {/* Main Content Area */}
          <div className='flex flex-1 flex-col pb-16 sm:pb-20 md:pb-24 lg:pb-28'>
            {!videoDetails && !loading && !isGenerating && (
              <FeatureCard type='quiz' />
            )}

            {loading && !videoDetails && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='space-y-3'
              >
                <VideoSkeleton />
              </motion.div>
            )}

            {/* Generating Quiz Skeleton - Show video details + quiz skeleton */}
            {isGenerating && videoDetails && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='space-y-3'
              >
                {/* Video Info Card */}
                <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900'>
                  <CardContent className='p-4'>
                    <div className='grid gap-4 md:grid-cols-[1fr,2fr]'>
                      <div className='relative aspect-video overflow-hidden rounded-lg'>
                        <img
                          src={
                            videoDetails.thumbnails.maxres?.url ||
                            videoDetails.thumbnails.high?.url
                          }
                          alt={videoDetails.title}
                          className='h-full w-full object-cover'
                        />
                      </div>
                      <div className='space-y-3'>
                        <h2 className='text-xl font-bold'>
                          {videoDetails.title}
                        </h2>
                        <p className='text-zinc-400'>
                          {videoDetails.channelTitle}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <Calendar className='h-4 w-4 text-yellow-600' />
                            {formatDate(videoDetails.publishedAt)}
                          </span>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <Eye className='h-4 w-4 text-blue-400' />
                            {formatNumber(videoDetails.viewCount)} views
                          </span>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <ThumbsUp className='h-4 w-4 text-green-500' />
                            {formatNumber(videoDetails.likeCount)} likes
                          </span>
                        </div>
                        <div>
                          <p
                            className={`text-zinc-400 ${showFullDescription ? '' : 'line-clamp-2'}`}
                          >
                            {videoDetails.description}
                          </p>
                          <Button
                            variant='ghost'
                            onClick={() =>
                              setShowFullDescription(!showFullDescription)
                            }
                            className='mt-2 h-auto p-0 text-zinc-400 hover:text-white'
                          >
                            {showFullDescription ? (
                              <>
                                Show less <ChevronUp className='ml-1 h-4 w-4' />
                              </>
                            ) : (
                              <>
                                Show more{' '}
                                <ChevronDown className='ml-1 h-4 w-4' />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Generating Skeleton */}
                <QuizSkeleton questionsCount={parseInt(numQuestions)} />
              </motion.div>
            )}

            {/* Video Details and Quiz - Only show when completely loaded */}
            {videoDetails && !loading && !isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='space-y-3'
              >
                {/* Video Info Card */}
                <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900'>
                  <CardContent className='p-4'>
                    <div className='grid gap-4 md:grid-cols-[1fr,2fr]'>
                      <div className='relative aspect-video overflow-hidden rounded-lg'>
                        <img
                          src={
                            videoDetails.thumbnails.maxres?.url ||
                            videoDetails.thumbnails.high?.url
                          }
                          alt={videoDetails.title}
                          className='h-full w-full object-cover'
                        />
                      </div>
                      <div className='space-y-3'>
                        <h2 className='text-xl font-bold'>
                          {videoDetails.title}
                        </h2>
                        <p className='text-zinc-400'>
                          {videoDetails.channelTitle}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <Calendar className='h-4 w-4 text-yellow-600' />
                            {formatDate(videoDetails.publishedAt)}
                          </span>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <Eye className='h-4 w-4 text-blue-400' />
                            {formatNumber(videoDetails.viewCount)} views
                          </span>
                          <span className='flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-sm'>
                            <ThumbsUp className='h-4 w-4 text-green-500' />
                            {formatNumber(videoDetails.likeCount)} likes
                          </span>
                        </div>
                        <div>
                          <p
                            className={`text-zinc-400 ${showFullDescription ? '' : 'line-clamp-2'}`}
                          >
                            {videoDetails.description}
                          </p>
                          <Button
                            variant='ghost'
                            onClick={() =>
                              setShowFullDescription(!showFullDescription)
                            }
                            className='mt-2 h-auto p-0 text-zinc-400 hover:text-white'
                          >
                            {showFullDescription ? (
                              <>
                                Show less <ChevronUp className='ml-1 h-4 w-4' />
                              </>
                            ) : (
                              <>
                                Show more{' '}
                                <ChevronDown className='ml-1 h-4 w-4' />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiz Section */}
                {quiz.length > 0 && (
                  <div>
                    <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900'>
                      <CardContent className='p-4'>
                        <div className='mb-4 flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <h3 className='text-lg font-semibold'>
                              Generated Quiz
                            </h3>
                            {isSubmitted && (
                              <div className='rounded-full bg-blue-600 px-3 py-1 text-sm font-medium'>
                                Score: {score}/{quiz.length}
                              </div>
                            )}
                          </div>
                          <div className='flex gap-2'>
                            {isSubmitted && (
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={handleRetry}
                                className='rounded-full hover:bg-zinc-800'
                              >
                                <RotateCcw className='h-4 w-4 text-zinc-400 hover:text-white' />
                              </Button>
                            )}
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={handleCopy}
                              className='rounded-full hover:bg-zinc-800'
                            >
                              {hasCopied ? (
                                <Check className='h-4 w-4 text-green-400' />
                              ) : (
                                <Copy className='h-4 w-4 text-zinc-400 hover:text-white' />
                              )}
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={handleDownload}
                              className='rounded-full hover:bg-zinc-800'
                            >
                              <Download className='h-4 w-4 text-zinc-400 hover:text-white' />
                            </Button>
                          </div>
                        </div>

                        <ScrollArea className='h-[400px] overflow-y-auto'>
                          <div className='space-y-6'>
                            {quiz.map((question, index) => {
                              const userAnswer = userAnswers.find(
                                (answer) => answer.questionId === question.id
                              );
                              const isCorrect =
                                userAnswer?.selectedOption ===
                                question.correctAnswer;
                              const isWrong =
                                isSubmitted &&
                                userAnswer?.selectedOption !== -1 &&
                                userAnswer?.selectedOption !==
                                  question.correctAnswer;

                              return (
                                <div
                                  key={question.id}
                                  className={`rounded-lg border p-4 ${
                                    isSubmitted
                                      ? isCorrect
                                        ? 'border-green-500 bg-green-500/10'
                                        : isWrong
                                          ? 'border-red-500 bg-red-500/10'
                                          : 'border-zinc-700 bg-zinc-800/30'
                                      : 'border-zinc-700 bg-zinc-800/30'
                                  }`}
                                >
                                  <div className='mb-3 flex items-start gap-2'>
                                    <span className='rounded-full bg-blue-600 px-2 py-1 text-sm font-medium text-white'>
                                      {index + 1}
                                    </span>
                                    <h4 className='text-base font-medium text-white'>
                                      {question.question}
                                    </h4>
                                    {isSubmitted && (
                                      <div className='ml-auto'>
                                        {isCorrect ? (
                                          <CheckCircle className='h-5 w-5 text-green-400' />
                                        ) : isWrong ? (
                                          <XCircle className='h-5 w-5 text-red-400' />
                                        ) : null}
                                      </div>
                                    )}
                                  </div>

                                  <div className='space-y-2'>
                                    {question.options.map(
                                      (option, optionIndex) => {
                                        const isSelected =
                                          userAnswer?.selectedOption ===
                                          optionIndex;
                                        const isCorrectOption =
                                          optionIndex ===
                                          question.correctAnswer;
                                        const showCorrect =
                                          isSubmitted && isCorrectOption;
                                        const showWrong =
                                          isSubmitted &&
                                          isSelected &&
                                          !isCorrectOption;

                                        return (
                                          <button
                                            key={optionIndex}
                                            onClick={() =>
                                              handleAnswerSelect(
                                                question.id,
                                                optionIndex
                                              )
                                            }
                                            disabled={isSubmitted}
                                            className={`w-full rounded-md border p-3 text-left transition-colors ${
                                              showCorrect
                                                ? 'border-green-500 bg-green-500/20 text-green-100'
                                                : showWrong
                                                  ? 'border-red-500 bg-red-500/20 text-red-100'
                                                  : isSelected
                                                    ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                                                    : 'border-zinc-600 bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
                                            } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                                          >
                                            <div className='flex items-center gap-2'>
                                              <span className='font-medium'>
                                                {String.fromCharCode(
                                                  65 + optionIndex
                                                )}
                                                .
                                              </span>
                                              <span>{option}</span>
                                            </div>
                                          </button>
                                        );
                                      }
                                    )}
                                  </div>

                                  {isSubmitted && question.explanation && (
                                    <div className='mt-3 rounded-md bg-zinc-800/50 p-3'>
                                      <p className='text-sm text-zinc-300'>
                                        <strong>Explanation:</strong>{' '}
                                        {question.explanation}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>

                        {quiz.length > 0 && !isSubmitted && (
                          <div className='mt-4 flex justify-center'>
                            <Button
                              onClick={handleQuizSubmit}
                              className='bg-blue-600 px-6 py-2 text-white hover:bg-blue-700'
                            >
                              Submit Quiz
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Input Area - Always visible at the bottom */}
          <div className='absolute right-0 bottom-0 left-0 rounded-b-2xl border-t border-zinc-800 bg-black p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10'>
            {/* Usage Display */}
            <div className='mb-4 flex justify-center'>
              <UsageDisplay usage={usage} />
            </div>

            <form
              onSubmit={handleSubmission}
              className='mx-auto flex w-full flex-col space-y-2 sm:w-5/6 sm:flex-row sm:space-y-0 sm:space-x-2 md:w-4/5 lg:w-3/4 xl:w-2/3'
            >
              <div className='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'>
                <div className='w-full sm:w-auto'>
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger className='w-full sm:w-[100px]'>
                      <SelectValue placeholder='Questions' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Array.from({ length: 9 }, (_, i) => i + 2).map(
                          (num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} Q's
                            </SelectItem>
                          )
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Input
                type='text'
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder='Enter YouTube video URL...'
                className='flex-1 rounded-full border-zinc-700 bg-transparent text-sm shadow-md shadow-gray-700 md:text-base'
              />
              <FancyButton
                onClick={(e) => {
                  e.preventDefault();
                  if (usage?.remaining === 0) {
                    toast({
                      title: 'Quiz Limit Exceeded',
                      description:
                        'You have used all your quiz attempts for today.',
                      variant: 'destructive'
                    });
                    return;
                  }
                  handleSubmission(e);
                }}
                loading={loading || isGenerating}
                success={showSuccess}
                label={isGenerating ? 'Generating Quiz...' : 'Generate Quiz'}
              />
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
