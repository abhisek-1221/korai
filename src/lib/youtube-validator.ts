/**
 * YouTube URL validation utilities
 */

export interface YoutubeValidationResult {
  isValid: boolean;
  type: 'video' | 'playlist' | 'invalid';
  videoId?: string;
  playlistId?: string;
  error?: string;
}

/**
 * Validates a YouTube URL and extracts relevant IDs
 * Supports various YouTube URL formats
 */
export function validateYoutubeUrl(url: string): YoutubeValidationResult {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Please enter a valid URL'
    };
  }

  const trimmedUrl = url.trim();

  // Check if it's a valid URL
  let urlObj: URL;
  try {
    urlObj = new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Invalid URL format'
    };
  }

  // Check if it's a YouTube domain
  const validDomains = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be'
  ];

  const isYoutubeDomain = validDomains.some(
    (domain) =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
  );

  if (!isYoutubeDomain) {
    return {
      isValid: false,
      type: 'invalid',
      error: 'URL must be from YouTube (youtube.com or youtu.be)'
    };
  }

  // Extract playlist ID
  const playlistId = urlObj.searchParams.get('list');

  // Extract video ID (various formats)
  let videoId: string | null = null;

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  if (urlObj.pathname === '/watch') {
    videoId = urlObj.searchParams.get('v');
  }
  // Format: https://youtu.be/VIDEO_ID
  else if (urlObj.hostname === 'youtu.be') {
    videoId = urlObj.pathname.slice(1);
  }
  // Format: https://www.youtube.com/embed/VIDEO_ID
  else if (urlObj.pathname.startsWith('/embed/')) {
    videoId = urlObj.pathname.split('/')[2];
  }
  // Format: https://www.youtube.com/v/VIDEO_ID
  else if (urlObj.pathname.startsWith('/v/')) {
    videoId = urlObj.pathname.split('/')[2];
  }

  // Determine type based on what IDs are present
  if (playlistId && !videoId) {
    // Pure playlist URL
    return {
      isValid: true,
      type: 'playlist',
      playlistId
    };
  } else if (videoId) {
    // Video URL (may also have playlist param, but video takes precedence)
    return {
      isValid: true,
      type: 'video',
      videoId,
      playlistId: playlistId || undefined
    };
  }

  // Neither video nor playlist ID found
  return {
    isValid: false,
    type: 'invalid',
    error: 'Could not extract video or playlist ID from URL'
  };
}

/**
 * Validates that the URL is a YouTube video (not playlist)
 */
export function validateYoutubeVideoUrl(url: string): YoutubeValidationResult {
  const result = validateYoutubeUrl(url);

  if (!result.isValid) {
    return result;
  }

  if (result.type === 'playlist') {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Please provide a YouTube video URL, not a playlist URL'
    };
  }

  return result;
}

/**
 * Validates that the URL is a YouTube playlist (not single video)
 */
export function validateYoutubePlaylistUrl(
  url: string
): YoutubeValidationResult {
  const result = validateYoutubeUrl(url);

  if (!result.isValid) {
    return result;
  }

  if (result.type === 'video' && !result.playlistId) {
    return {
      isValid: false,
      type: 'invalid',
      error: 'Please provide a YouTube playlist URL, not a single video URL'
    };
  }

  return result;
}
