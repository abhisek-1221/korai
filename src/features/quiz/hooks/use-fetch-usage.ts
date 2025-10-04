import { useCallback, useEffect } from 'react';
import { useQuizStore } from '../store/quiz-store';

export const useFetchUsage = () => {
  const { setUsage } = useQuizStore();

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
  }, [setUsage]);

  // Fetch usage on mount
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { fetchUsage };
};
