import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuizStore, type QuizQuestion } from '../store/quiz-store';

/**
 * Improved JSON parser that handles various edge cases
 */
function parseQuizJSON(rawContent: string): QuizQuestion[] {
  let cleanedContent = rawContent.trim();

  // Remove markdown code blocks
  cleanedContent = cleanedContent
    .replace(/^```(?:json)?\s*/gm, '')
    .replace(/\s*```$/gm, '');

  // Try to find JSON array or object
  const jsonMatch =
    cleanedContent.match(/\[[\s\S]*\]/) || cleanedContent.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    cleanedContent = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(cleanedContent);

    // Handle different response formats
    let questions: any[] = [];

    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else if (parsed.quiz && Array.isArray(parsed.quiz)) {
      questions = parsed.quiz;
    } else {
      throw new Error('Invalid quiz format: no questions array found');
    }

    // Validate and format questions
    return questions.map((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options)) {
        throw new Error(`Invalid question format at index ${index}`);
      }

      // Ensure correctAnswer is a number
      let correctAnswer = q.correctAnswer ?? q.correct_answer ?? q.answer;
      if (typeof correctAnswer === 'string') {
        // Handle letter answers (A, B, C, D)
        const letter = correctAnswer.toUpperCase();
        correctAnswer = letter.charCodeAt(0) - 65;
      }
      correctAnswer = Number(correctAnswer);

      if (
        isNaN(correctAnswer) ||
        correctAnswer < 0 ||
        correctAnswer >= q.options.length
      ) {
        throw new Error(`Invalid correct answer at index ${index}`);
      }

      return {
        id: `q${index + 1}`,
        question: q.question,
        options: q.options,
        correctAnswer,
        explanation: q.explanation || q.reason || undefined
      };
    });
  } catch (error) {
    console.error('JSON Parse Error:', error);
    console.error('Attempted to parse:', cleanedContent);
    throw new Error(
      `Failed to parse quiz: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }
}

export const useGenerateQuiz = () => {
  const { toast } = useToast();
  const {
    selectedLLM,
    numQuestions,
    setQuiz,
    setUserAnswers,
    setIsGenerating,
    setIsSubmitted,
    setScore
  } = useQuizStore();

  const generateQuiz = useCallback(
    async (transcript: string, abortSignal?: AbortSignal) => {
      setIsGenerating(true);
      setQuiz([]);
      setUserAnswers([]);
      setIsSubmitted(false);
      setScore(0);

      try {
        const response = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            numQuestions: parseInt(numQuestions),
            model: selectedLLM
          }),
          signal: abortSignal
        });

        // Handle rate limiting (disabled - unlimited attempts)
        if (response.status === 429) {
          // Rate limiting is disabled, this should not occur
          console.warn(
            'Rate limiting response received but limits are disabled'
          );
        }

        // Handle authentication
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to generate quizzes.',
            variant: 'destructive'
          });
          return false;
        }

        if (!response.ok) {
          throw new Error('Failed to generate quiz');
        }

        // Usage tracking disabled - unlimited attempts

        // Read streaming response
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
              try {
                streamedQuiz += JSON.parse(line.slice(2));
              } catch (e) {
                console.warn('Failed to parse line:', line);
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer && buffer.startsWith('0:')) {
          try {
            streamedQuiz += JSON.parse(buffer.slice(2));
          } catch (e) {
            console.warn('Failed to parse buffer:', buffer);
          }
        }

        // Parse the complete quiz
        const parsedQuestions = parseQuizJSON(streamedQuiz);

        if (parsedQuestions.length === 0) {
          throw new Error('No valid questions generated');
        }

        setQuiz(parsedQuestions);
        setUserAnswers(
          parsedQuestions.map((q) => ({
            questionId: q.id,
            selectedOption: -1
          }))
        );

        toast({
          title: 'Success',
          description: `Generated ${parsedQuestions.length} quiz questions`,
          variant: 'default'
        });

        return true;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Quiz generation aborted');
          toast({
            title: 'Cancelled',
            description: 'Quiz generation was cancelled',
            variant: 'default'
          });
        } else {
          console.error('Quiz generation error:', error);
          toast({
            title: 'Error',
            description:
              error.message || 'Failed to generate quiz. Please try again.',
            variant: 'destructive'
          });
        }
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      selectedLLM,
      numQuestions,
      toast,
      setQuiz,
      setUserAnswers,
      setIsGenerating,
      setIsSubmitted,
      setScore
    ]
  );

  return { generateQuiz };
};
