import {
  ChannelData,
  PlaylistDetails,
  RecentVideo,
  VideoData,
  VideoItem,
  ViewData
} from './youtube';

export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match?.[1] ?? '0') || 0;
  const minutes = parseInt(match?.[2] ?? '0') || 0;
  const seconds = parseInt(match?.[3] ?? '0') || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

export const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTimestamp = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper functions for YouTube URL parsing
export function extractVideoId(url: string): string | null {
  const match = url.match(
    /(?:v=|\/?\/(?:embed|shorts|v)\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|\/watch\?.+&v=)([^&?/\n\s]+)/
  );
  return match ? match[1] : null;
}

export function extractChannelId(url: string): string | null {
  // Handle channel URLs in format: https://www.youtube.com/channel/UC...
  const channelRegex =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([^\/\n\s]+)/;
  const channelMatch = url.match(channelRegex);
  if (channelMatch) return channelMatch[1];

  // Handle custom URLs in format: https://www.youtube.com/c/ChannelName
  const customUrlRegex =
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|user)\/([^\/\n\s]+)/;
  const customMatch = url.match(customUrlRegex);
  if (customMatch) {
    // For custom URLs, we need to make an additional API call to get the channel ID
    return null; // Will handle this in the main function
  }

  // Handle @username format
  const usernameRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^\/\n\s]+)/;
  const usernameMatch = url.match(usernameRegex);
  if (usernameMatch) {
    // For usernames, we need to make an additional API call to get the channel ID
    return null; // Will handle this in the main function
  }

  return null;
}

export async function getChannelIdFromUsername(
  username: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${username}&type=channel&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch channel ID');
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }

    return null;
  } catch (error) {
    console.error('Error getting channel ID from username:', error);
    return null;
  }
}

export async function fetchChannelData(
  channelId: string
): Promise<ChannelData> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch channel data');
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const channel = data.items[0];

  return {
    name: channel.snippet.title,
    username: `@${channel.snippet.customUrl || channel.snippet.title.toLowerCase().replace(/\s+/g, '')}`,
    videosCount: parseInt(channel.statistics.videoCount || '0'),
    subscribers: parseInt(channel.statistics.subscriberCount || '0'),
    totalViews: parseInt(channel.statistics.viewCount || '0'),
    thumbnails: channel.snippet.thumbnails,
    country: channel.snippet.country
  };
}

export async function fetchRecentVideos(
  channelId: string,
  maxResults = 5
): Promise<RecentVideo[]> {
  // First get the uploads playlist ID
  const channelResponse = await fetch(
    `${YOUTUBE_API_BASE_URL}/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!channelResponse.ok) {
    throw new Error('Failed to fetch channel uploads playlist');
  }

  const channelData = await channelResponse.json();

  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('Channel not found');
  }

  const uploadsPlaylistId =
    channelData.items[0].contentDetails.relatedPlaylists.uploads;

  // Now get the recent videos from the uploads playlist
  const videosResponse = await fetch(
    `${YOUTUBE_API_BASE_URL}/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`
  );

  if (!videosResponse.ok) {
    throw new Error('Failed to fetch recent videos');
  }

  const videosData = await videosResponse.json();

  if (!videosData.items || videosData.items.length === 0) {
    return [];
  }

  // Get video IDs to fetch statistics and content details
  const videoIds = videosData.items
    .map((item: any) => item.snippet.resourceId.videoId)
    .join(',');

  const videoDetailsResponse = await fetch(
    `${YOUTUBE_API_BASE_URL}/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
  );

  if (!videoDetailsResponse.ok) {
    throw new Error('Failed to fetch video details');
  }

  const videoDetailsData = await videoDetailsResponse.json();

  // Map video stats to video items
  return videosData.items.map((item: any) => {
    const videoId = item.snippet.resourceId.videoId;
    const details = videoDetailsData.items.find(
      (detail: any) => detail.id === videoId
    );
    const publishedDate = new Date(item.snippet.publishedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - publishedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let uploadTime = '';
    if (diffDays < 1) {
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
      uploadTime = `First ${diffHours} hours`;
    } else {
      uploadTime = `${diffDays} days ago`;
    }

    return {
      title: item.snippet.title,
      views: parseInt(details?.statistics.viewCount || '0'),
      uploadTime,
      thumbnail:
        item.snippet.thumbnails.high?.url ||
        item.snippet.thumbnails.default?.url,
      videoId: videoId,
      duration: parseDuration(details?.contentDetails.duration || 'PT0S'),
      likeCount: parseInt(details?.statistics.likeCount || '0')
    };
  });
}

// to be refactored with Channel Analytics API later

export async function fetchViewsData(
  channelId: string,
  days = 6
): Promise<ViewData[]> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch channel statistics');
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Channel not found');
  }

  const totalViews = parseInt(data.items[0].statistics.viewCount || '0');

  const avgDailyViews = Math.floor(totalViews / 365);

  const viewsData: ViewData[] = [];
  for (let i = 1; i <= days; i++) {
    const randomFactor = 0.7 + Math.random() * 0.6;
    const dailyViews = Math.floor(avgDailyViews * randomFactor);

    viewsData.push({
      name: i.toString(),
      views: dailyViews
    });
  }

  return viewsData;
}

// Format duration for display in hours:minutes:seconds format
export function formatDurationForDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Fetch video data from YouTube API
export async function fetchVideoData(videoId: string): Promise<VideoData> {
  // Fetch video details
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch video details');
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found');
  }

  const video = data.items[0];
  const channelId = video.snippet.channelId;

  // Fetch channel details to get the channel name
  const channelResponse = await fetch(
    `${YOUTUBE_API_BASE_URL}/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  if (!channelResponse.ok) {
    throw new Error('Failed to fetch channel details');
  }

  const channelData = await channelResponse.json();
  const channelName =
    channelData.items?.[0]?.snippet?.title || 'Unknown Channel';

  // Parse video data
  const views = parseInt(video.statistics.viewCount || '0');
  const likes = parseInt(video.statistics.likeCount || '0');
  const comments = parseInt(video.statistics.commentCount || '0');
  const duration = parseDuration(video.contentDetails.duration);

  return {
    id: video.id,
    title: video.snippet.title,
    channel: channelName,
    channelId: channelId,
    views: views,
    viewsFormatted: `${formatNumber(views)} views`,
    published: formatDate(video.snippet.publishedAt),
    description: video.snippet.description,
    likes: likes,
    likesFormatted: formatNumber(likes),
    comments: comments,
    commentsFormatted: formatNumber(comments),
    duration: duration,
    durationFormatted: formatDurationForDisplay(duration),
    thumbnails: video.snippet.thumbnails
  };
}

export async function fetchTranscript(youtube: any, videoId: string) {
  try {
    // Try the new captions-based approach first (more reliable)
    return await fetchTranscriptViaInnertube(youtube, videoId);
  } catch (error: any) {
    console.error('Error fetching transcript via captions:', error);

    // If captions approach fails, try the old getTranscript method as fallback
    try {
      console.log(
        'Falling back to getTranscript method for video:',
        videoId
      );

      const info = await youtube.getInfo(videoId);

      // Check if video info was retrieved successfully
      if (!info) {
        throw new Error('Failed to retrieve video information');
      }

      const transcriptData = await info.getTranscript();

      // Check if transcript data exists
      if (!transcriptData || !transcriptData.transcript) {
        throw new Error('No transcript available for this video');
      }

      // Check if transcript content exists
      if (
        !transcriptData.transcript.content ||
        !transcriptData.transcript.content.body
      ) {
        throw new Error('Transcript content is not available');
      }

      const segments = transcriptData.transcript.content.body.initial_segments;

      // Check if segments exist
      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        throw new Error('No transcript segments found for this video');
      }

      const processedSegments = segments.map((segment: any) => ({
        text: segment.snippet.text,
        startTime: formatTimestamp(parseInt(segment.start_ms)),
        endTime: formatTimestamp(parseInt(segment.end_ms))
      }));

      const fullTranscript: string = processedSegments
        .map((segment: { text: string }) => segment.text)
        .join(' ')
        .trim();

      if (!fullTranscript || fullTranscript.length === 0) {
        throw new Error('Transcript appears to be empty');
      }

      return {
        segments: processedSegments,
        fullTranscript
      };
    } catch (fallbackError: any) {
      console.error('Fallback getTranscript also failed:', fallbackError);

      // Use the first error if it's more specific
      if (
        error.message?.includes('No caption tracks') ||
        error.message?.includes('No valid caption URL')
      ) {
        throw new Error(
          'No transcript is available for this video. The video may not have captions enabled.'
        );
      }

      if (fallbackError.message?.includes('CompositeVideoPrimaryInfo')) {
        throw new Error(
          'This video may have restricted access or the YouTube parser needs updating. Please try a different video.'
        );
      }

      if (fallbackError.message?.includes('Transcript is disabled')) {
        throw new Error('Transcripts are disabled for this video');
      }

      if (
        fallbackError.message?.includes('Private video') ||
        fallbackError.message?.includes('Video unavailable')
      ) {
        throw new Error('This video is private or unavailable');
      }

      // Return the original error from captions approach if it's more informative
      if (error.message) {
        throw new Error(error.message);
      }

      throw new Error(
        `Failed to fetch transcript: ${fallbackError.message || 'Unknown error occurred'}`
      );
    }
  }
}

export async function fetchPlaylistVideoIds(
  playlistId: string
): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=50${
        nextPageToken ? `&pageToken=${nextPageToken}` : ''
      }`
    );
    const data = await response.json();
    videoIds.push(
      ...data.items.map((item: any) => item.contentDetails.videoId)
    );
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return videoIds;
}

export async function fetchVideoDetails(
  videoIds: string[]
): Promise<{ videos: VideoItem[]; totalDuration: number }> {
  const fetchChunk = async (
    chunk: string[]
  ): Promise<{ videos: VideoItem[]; chunkDuration: number }> => {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=contentDetails,snippet,statistics&id=${chunk.join(
        ','
      )}&key=${YOUTUBE_API_KEY}`
    );

    const data = await response.json();

    const chunkDuration = data.items.reduce(
      (acc: number, item: any) =>
        acc + parseDuration(item.contentDetails.duration),
      0
    );

    const videos: VideoItem[] = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnails: item.snippet.thumbnails,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount),
      likeCount: parseInt(item.statistics.likeCount)
    }));

    return { videos, chunkDuration };
  };

  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const results = await Promise.all(chunks.map(fetchChunk));
  const allVideos = results.flatMap((result) => result.videos);
  const totalDuration = results.reduce(
    (acc, result) => acc + result.chunkDuration,
    0
  );

  return { videos: allVideos, totalDuration };
}

export async function fetchPlaylistDetails(
  playlistId: string
): Promise<PlaylistDetails> {
  const response = await fetch(
    `${YOUTUBE_API_BASE_URL}/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  const playlist = data.items[0];

  if (playlist === undefined) {
    throw new Error('Invalid playlist ID');
  }

  return {
    id: playlist.id,
    title: playlist.snippet.title,
    description: playlist.snippet.description,
    thumbnails: playlist.snippet.thumbnails
  };
}

export function extractPlaylistId(url: string): string | null {
  const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Custom Error Types for Transcript Fetching
class InnertubeClientCreateError extends Error {
  constructor({ cause, videoId }: { cause?: unknown; videoId: string }) {
    super(`Failed to create Innertube client for video ${videoId}`);
    this.name = 'InnertubeClientCreateError';
    if (cause) this.cause = cause;
  }
}

class InnertubeBasicInfoError extends Error {
  constructor({ cause, videoId }: { cause?: unknown; videoId: string }) {
    super(`Failed to get basic info for video ${videoId}`);
    this.name = 'InnertubeBasicInfoError';
    if (cause) this.cause = cause;
  }
}

class InnertubeNoCaptionTracksError extends Error {
  constructor({ videoId }: { videoId: string }) {
    super(`No caption tracks found for video ${videoId}`);
    this.name = 'InnertubeNoCaptionTracksError';
  }
}

class InnertubeNoValidCaptionUrlError extends Error {
  constructor({
    videoId,
    availableLanguages,
  }: {
    videoId: string;
    availableLanguages: string[];
  }) {
    super(
      `No valid caption URL found for video ${videoId}. Available languages: ${availableLanguages.join(', ')}`
    );
    this.name = 'InnertubeNoValidCaptionUrlError';
  }
}

class InnertubeTimedTextFetchError extends Error {
  constructor({
    cause,
    url,
    videoId,
    status,
  }: {
    cause?: unknown;
    url: string;
    videoId: string;
    status?: number;
  }) {
    super(
      `Failed to fetch timedtext for video ${videoId}${status ? ` (status: ${status})` : ''}`
    );
    this.name = 'InnertubeTimedTextFetchError';
    if (cause) this.cause = cause;
  }
}

class InnertubeTranscriptParseError extends Error {
  constructor({ videoId }: { videoId: string }) {
    super(`Failed to parse transcript XML for video ${videoId}`);
    this.name = 'InnertubeTranscriptParseError';
  }
}

/**
 * Parsed transcript segment from timedtext XML
 */
type TranscriptSegment = {
  durationMs: number;
  startMs: number;
  text: string;
};

/**
 * Decode common HTML entities in transcript text
 */
const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) =>
      globalThis.String.fromCharCode(Number.parseInt(num, 10))
    );

/**
 * Parse <p t="ms" d="ms">text</p> format (Android client)
 */
const parsePTagFormat = (xml: string): Array<TranscriptSegment> => {
  const segments: Array<TranscriptSegment> = [];
  const pTagRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;

  let match = pTagRegex.exec(xml);
  while (match !== null) {
    const [, startMsStr, durationMsStr, rawText] = match;
    if (startMsStr && durationMsStr && rawText) {
      const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      if (text) {
        segments.push({
          durationMs: Number.parseInt(durationMsStr, 10),
          startMs: Number.parseInt(startMsStr, 10),
          text,
        });
      }
    }
    match = pTagRegex.exec(xml);
  }
  return segments;
};

/**
 * Parse <text start="sec" dur="sec">text</text> format (alternative format)
 */
const parseTextTagFormat = (xml: string): Array<TranscriptSegment> => {
  const segments: Array<TranscriptSegment> = [];
  const textTagRegex =
    /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;

  let match = textTagRegex.exec(xml);
  while (match !== null) {
    const [, startStr, durStr, rawText] = match;
    if (startStr && durStr && rawText) {
      const text = decodeHtmlEntities(rawText.replace(/<[^>]+>/g, '')).trim();
      if (text) {
        segments.push({
          durationMs: Math.round(Number.parseFloat(durStr) * 1000),
          startMs: Math.round(Number.parseFloat(startStr) * 1000),
          text,
        });
      }
    }
    match = textTagRegex.exec(xml);
  }
  return segments;
};

/**
 * Parse timedtext XML into transcript segments
 * Supports both <p> format (Android) and <text> format (alternative)
 */
const parseTimedTextXml = (xml: string): Array<TranscriptSegment> => {
  // Try <p> tag format first (Android client format)
  const pSegments = parsePTagFormat(xml);
  if (pSegments.length > 0) {
    return pSegments;
  }
  // Fall back to <text> tag format
  return parseTextTagFormat(xml);
};

/**
 * Fetch transcript XML from timedtext API
 *
 * @param captionUrl - The timedtext URL from caption tracks
 * @param videoId - The video ID for error context
 */
const fetchTimedTextXml = async (
  captionUrl: string,
  videoId: string
): Promise<string> => {
  try {
    const response = await fetch(captionUrl, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new InnertubeTimedTextFetchError({
        status: response.status,
        url: captionUrl,
        videoId,
      });
    }

    const xml = await response.text();

    if (!xml || xml.length === 0) {
      throw new InnertubeTimedTextFetchError({
        url: captionUrl,
        videoId,
      });
    }

    return xml;
  } catch (error) {
    if (error instanceof InnertubeTimedTextFetchError) {
      throw error;
    }
    throw new InnertubeTimedTextFetchError({
      cause: error,
      url: captionUrl,
      videoId,
    });
  }
};

/**
 * Fetch transcript using Innertube's getBasicInfo to get caption URLs
 * This approach uses the standard Innertube WEB client to get caption track URLs,
 * then fetches timedtext directly from the captions API.
 *
 * @param youtube - Innertube client instance
 * @param videoId - Raw YouTube video ID (without video_ prefix)
 */
const fetchTranscriptViaInnertube = async (
  youtube: any,
  videoId: string
): Promise<{ segments: any[]; fullTranscript: string }> => {
  try {
    // 1. Get basic info (includes caption tracks)
    const info = await youtube.getBasicInfo(videoId);

    if (!info) {
      throw new InnertubeBasicInfoError({ videoId });
    }

    // 2. Check for caption tracks
    const captionTracks = info.captions?.caption_tracks;
    if (!captionTracks || captionTracks.length === 0) {
      throw new InnertubeNoCaptionTracksError({ videoId });
    }

    // 3. Find English caption track (prefer non-ASR if available)
    const englishTrack =
      captionTracks.find(
        (t: any) => t.language_code === 'en' && t.kind !== 'asr'
      ) ||
      captionTracks.find((t: any) => t.language_code?.startsWith('en')) ||
      captionTracks[0];

    if (!englishTrack?.base_url) {
      throw new InnertubeNoValidCaptionUrlError({
        availableLanguages: captionTracks.map(
          (t: any) => t.language_code ?? 'unknown'
        ),
        videoId,
      });
    }

    // 4. Fetch timedtext XML
    const xml = await fetchTimedTextXml(englishTrack.base_url, videoId);

    // 5. Parse XML to segments
    const segments = parseTimedTextXml(xml);

    if (segments.length === 0) {
      throw new InnertubeTranscriptParseError({ videoId });
    }

    // 6. Convert to the format expected by the API
    const processedSegments = segments.map((segment) => ({
      text: segment.text,
      startTime: formatTimestamp(segment.startMs),
      endTime: formatTimestamp(segment.startMs + segment.durationMs),
    }));

    const fullTranscript: string = processedSegments
      .map((segment: { text: string }) => segment.text)
      .join(' ')
      .trim();

    if (!fullTranscript || fullTranscript.length === 0) {
      throw new Error('Transcript appears to be empty');
    }

    return {
      segments: processedSegments,
      fullTranscript,
    };
  } catch (error: any) {
    console.error('Error fetching transcript via captions:', error);

    // Pass through our custom errors with their messages
    if (
      error instanceof InnertubeNoCaptionTracksError ||
      error instanceof InnertubeNoValidCaptionUrlError ||
      error instanceof InnertubeTimedTextFetchError ||
      error instanceof InnertubeTranscriptParseError ||
      error instanceof InnertubeBasicInfoError
    ) {
      throw new Error(error.message);
    }

    throw error;
  }
};
