import { NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js/web';
import { extractVideoId, fetchTranscript } from '@/lib/ythelper';
import { transcribeRateLimiter } from '@/lib/ratelimit';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';

    let rateLimitResult;
    try {
      rateLimitResult = await transcribeRateLimiter.limit(ip);
    } catch (error) {
      console.error('Rate limiter error:', error);
      return NextResponse.json(
        {
          error:
            'Service temporarily unavailable. Please try again in a moment.'
        },
        { status: 503 }
      );
    }

    const { success, limit, remaining, reset } = rateLimitResult;

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit,
          remaining: 0,
          reset
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString()
          }
        }
      );
    }

    const { videoUrl } = await request.json();
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'No videoUrl provided' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Try creating Innertube with retry logic for parsing issues
    let youtube;
    let transcript;
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        youtube = await Innertube.create({
          lang: 'en',
          location: 'IN',
          retrieve_player: false
        });

        transcript = await fetchTranscript(youtube, videoId);
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.log(`Attempt ${attempt} failed:`, error.message);

        // If it's a CompositeVideoPrimaryInfo error and we have another attempt, wait and retry
        if (
          attempt < 2 &&
          error.message?.includes('CompositeVideoPrimaryInfo')
        ) {
          console.log('Retrying due to YouTube parser issue...');
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
          continue;
        }

        throw error;
      }
    }

    if (!transcript) {
      throw lastError || new Error('Failed to fetch transcript after retries');
    }

    if (!transcript || !transcript.fullTranscript) {
      throw new Error('Failed to extract transcript from video');
    }

    return NextResponse.json({
      transcript,
      rateLimit: {
        limit,
        remaining,
        reset
      }
    });
  } catch (error: any) {
    console.error('Error in transcript route:', error);

    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error:
            'Service temporarily unavailable. Please try again in a moment.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
