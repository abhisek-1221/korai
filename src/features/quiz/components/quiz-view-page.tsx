'use client';

import { useCallback, useEffect, useRef } from 'react';
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
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { useToast } from '@/hooks/use-toast';
import { useQuizStore } from '../store/quiz-store';
import { useFetchVideoAndTranscript, useQuizActions } from '../hooks';

export default function QuizViewPage() {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    videoUrl,
    videoDetails,
    quiz,
    userAnswers,
    numQuestions,
    showFullDescription,
    isLoading,
    isGenerating,
    isSubmitted,
    isSuccess,
    score,
    hasCopied,
    setVideoUrl,
    setNumQuestions,
    setShowFullDescription
  } = useQuizStore();

  const { fetchVideoAndTranscript } = useFetchVideoAndTranscript();
  const {
    handleAnswerSelect,
    handleQuizSubmit,
    handleRetry,
    handleCopy,
    handleDownload
  } = useQuizActions();

  const handleSubmission = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
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

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      await fetchVideoAndTranscript(abortControllerRef.current.signal);
    },
    [numQuestions, toast, fetchVideoAndTranscript]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <PageContainer scrollable>
      <div className='w-full space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Quiz Generator'
            description='Generate interactive quizzes from YouTube videos'
          />
        </div>

        {/* Input Form */}
        <Card className='bg-background border-zinc-800'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Select value={numQuestions} onValueChange={setNumQuestions}>
                  <SelectTrigger className='w-full sm:w-[140px]'>
                    <SelectValue placeholder='Questions' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} Questions
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Input
                  type='text'
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder='Enter YouTube video URL...'
                  className='flex-1'
                />

                <FancyButton
                  onClick={handleSubmission}
                  loading={isLoading || isGenerating}
                  success={isSuccess}
                  label={isGenerating ? 'Generating...' : 'Generate Quiz'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message */}
        {!videoDetails && !isLoading && !isGenerating && (
          <FeatureCard type='quiz' />
        )}

        {/* Loading Skeleton */}
        {isLoading && !videoDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <VideoSkeleton />
          </motion.div>
        )}

        {/* Video Details and Quiz */}
        {videoDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='space-y-4'
          >
            {/* Video Info Card */}
            <Card className='bg-background border-zinc-800'>
              <CardContent className='p-4'>
                <div className='grid gap-4 md:grid-cols-[300px,1fr]'>
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
                  <div className='space-y-2'>
                    <h2 className='text-lg font-bold'>{videoDetails.title}</h2>
                    <p className='text-muted-foreground'>
                      {videoDetails.channelTitle}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                        <Calendar className='h-4 w-4 text-yellow-600' />
                        {formatDate(videoDetails.publishedAt)}
                      </span>
                      <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                        <Eye className='h-4 w-4 text-blue-400' />
                        {formatNumber(videoDetails.viewCount)} views
                      </span>
                      <span className='bg-secondary flex items-center gap-1 rounded-full px-2 py-1 text-sm'>
                        <ThumbsUp className='h-4 w-4 text-green-500' />
                        {formatNumber(videoDetails.likeCount)} likes
                      </span>
                    </div>
                    <div>
                      <p
                        className={`text-muted-foreground text-sm ${showFullDescription ? '' : 'line-clamp-2'}`}
                      >
                        {videoDetails.description}
                      </p>
                      <Button
                        variant='ghost'
                        onClick={() =>
                          setShowFullDescription(!showFullDescription)
                        }
                        className='text-muted-foreground hover:text-foreground mt-1 h-auto p-0 text-xs'
                      >
                        {showFullDescription ? (
                          <>
                            Show less <ChevronUp className='ml-1 h-3 w-3' />
                          </>
                        ) : (
                          <>
                            Show more <ChevronDown className='ml-1 h-3 w-3' />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quiz Generating Skeleton */}
            {isGenerating && (
              <QuizSkeleton questionsCount={parseInt(numQuestions)} />
            )}

            {/* Quiz Section */}
            {quiz.length > 0 && !isGenerating && (
              <Card className='bg-background border-zinc-800'>
                <CardContent className='p-4'>
                  <div className='mb-4 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <h3 className='text-lg font-semibold'>Generated Quiz</h3>
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
                          className='rounded-full'
                        >
                          <RotateCcw className='h-4 w-4' />
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleCopy}
                        className='rounded-full'
                      >
                        {hasCopied ? (
                          <Check className='h-4 w-4 text-green-400' />
                        ) : (
                          <Copy className='h-4 w-4' />
                        )}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleDownload}
                        className='rounded-full'
                      >
                        <Download className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className='h-[500px]'>
                    <div className='space-y-6 pr-4'>
                      {quiz.map((question, index) => {
                        const userAnswer = userAnswers.find(
                          (answer) => answer.questionId === question.id
                        );
                        const isCorrect =
                          userAnswer?.selectedOption === question.correctAnswer;
                        const isWrong =
                          isSubmitted &&
                          userAnswer?.selectedOption !== -1 &&
                          userAnswer?.selectedOption !== question.correctAnswer;

                        return (
                          <div
                            key={question.id}
                            className={`rounded-lg border p-4 ${
                              isSubmitted
                                ? isCorrect
                                  ? 'border-green-500 bg-green-500/10'
                                  : isWrong
                                    ? 'border-red-500 bg-red-500/10'
                                    : 'border-border bg-secondary/30'
                                : 'border-border bg-secondary/30'
                            }`}
                          >
                            <div className='mb-3 flex items-start gap-2'>
                              <span className='rounded-full bg-blue-600 px-2 py-1 text-sm font-medium text-white'>
                                {index + 1}
                              </span>
                              <h4 className='flex-1 text-base font-medium'>
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
                              {question.options.map((option, optionIndex) => {
                                const isSelected =
                                  userAnswer?.selectedOption === optionIndex;
                                const isCorrectOption =
                                  optionIndex === question.correctAnswer;
                                const showCorrect =
                                  isSubmitted && isCorrectOption;
                                const showWrong =
                                  isSubmitted && isSelected && !isCorrectOption;

                                return (
                                  <button
                                    key={optionIndex}
                                    onClick={() =>
                                      handleAnswerSelect(
                                        question.id,
                                        optionIndex,
                                        isSubmitted
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
                                            : 'border-border bg-secondary/50 hover:bg-secondary'
                                    } ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                                  >
                                    <div className='flex items-center gap-2'>
                                      <span className='font-medium'>
                                        {String.fromCharCode(65 + optionIndex)}.
                                      </span>
                                      <span>{option}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {isSubmitted && question.explanation && (
                              <div className='bg-secondary/50 mt-3 rounded-md p-3'>
                                <p className='text-muted-foreground text-sm'>
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
            )}
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
