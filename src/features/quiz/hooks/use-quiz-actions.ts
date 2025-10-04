import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuizStore } from '../store/quiz-store';

export const useQuizActions = () => {
  const { toast } = useToast();
  const {
    quiz,
    userAnswers,
    videoDetails,
    updateUserAnswer,
    setIsSubmitted,
    setScore,
    setUserAnswers,
    setHasCopied
  } = useQuizStore();

  const handleAnswerSelect = useCallback(
    (questionId: string, selectedOption: number, isSubmitted: boolean) => {
      if (isSubmitted) return;
      updateUserAnswer(questionId, selectedOption);
    },
    [updateUserAnswer]
  );

  const handleQuizSubmit = useCallback(() => {
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
  }, [quiz, userAnswers, toast, setScore, setIsSubmitted]);

  const handleRetry = useCallback(() => {
    setUserAnswers(
      quiz.map((q) => ({
        questionId: q.id,
        selectedOption: -1
      }))
    );
    setIsSubmitted(false);
    setScore(0);
  }, [quiz, setUserAnswers, setIsSubmitted, setScore]);

  const handleCopy = useCallback(async () => {
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
  }, [quiz, toast, setHasCopied]);

  const handleDownload = useCallback(() => {
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
    URL.revokeObjectURL(element.href);

    toast({
      title: 'Success',
      description: 'Quiz downloaded successfully',
      variant: 'default'
    });
  }, [quiz, videoDetails, toast]);

  return {
    handleAnswerSelect,
    handleQuizSubmit,
    handleRetry,
    handleCopy,
    handleDownload
  };
};
