import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export const useYoutubePlayer = () => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (existingScript) {
      setIsScriptLoaded(true);
      // Wait for the API to be ready
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsApiReady(true);
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // Load the YouTube IFrame API script
    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onload = () => setIsScriptLoaded(true);

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // No cleanup needed - keep the API loaded for other components
  }, []);

  const initializePlayer = useCallback(
    (elementId: string, videoId: string, onReady?: (player: any) => void) => {
      if (!isApiReady || !window.YT) return null;

      try {
        const player = new window.YT.Player(elementId, {
          videoId: videoId,
          events: {
            onReady: (event: any) => {
              if (onReady) onReady(event.target);
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            }
          }
        });
        return player;
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
        return null;
      }
    },
    [isApiReady]
  );

  const seekTo = useCallback((player: any, timeInSeconds: number) => {
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(timeInSeconds, true);
      if (typeof player.playVideo === 'function') {
        player.playVideo();
      }
    }
  }, []);

  return {
    isApiReady,
    isScriptLoaded,
    initializePlayer,
    seekTo
  };
};
