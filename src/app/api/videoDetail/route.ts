import { VideoItem } from '@/lib/youtube';
import {
  extractVideoId,
  parseDuration,
  YOUTUBE_API_BASE_URL,
  YOUTUBE_API_KEY
} from '@/lib/ythelper';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { videoUrl } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing video URL' }, { status: 400 });
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Fetch video details from YouTube API
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/videos?part=contentDetails,snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch video details' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const item = data.items[0];

    const videoDetails: VideoItem = {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnails: item.snippet.thumbnails,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount, 10),
      likeCount: parseInt(item.statistics.likeCount, 10)
    };

    return NextResponse.json({ video: videoDetails });
  } catch (error) {
    console.error('Error fetching video details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
