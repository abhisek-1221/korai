import { useToast } from '@/hooks/use-toast';
import { useAnalyzeStore } from '../store/analyze-store';

export const useFetchPlaylist = () => {
  const { toast } = useToast();
  const {
    playlistUrl,
    setPlaylistData,
    setRangeEnd,
    setIsLoading,
    setIsSuccess,
    setError
  } = useAnalyzeStore();

  const fetchPlaylist = async () => {
    if (!playlistUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube playlist URL',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/playlist?id=${playlistUrl}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch playlist data');
      }

      setPlaylistData(data);
      setRangeEnd(data.totalVideos.toString());
      setIsSuccess(true);

      toast({
        title: 'Success',
        description: 'Playlist analysis completed successfully',
        variant: 'default'
      });

      // Reset success state after animation
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error analyzing playlist:', error);
      const errorMessage = error.message || 'Failed to analyze playlist';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });

      // Reset error state after showing
      setTimeout(() => {
        setError(null);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return { fetchPlaylist };
};
