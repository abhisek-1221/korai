import { streamText, smoothStream } from 'ai';
import { NextResponse } from 'next/server';
import { userChatLimiter } from '@/lib/ratelimit';
import { getModel, DEFAULT_MODEL } from '@/lib/providers';
import { auth } from '@clerk/nextjs/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user-specific rate limit
    let rateLimitResult;
    try {
      rateLimitResult = await userChatLimiter.limit(`chat_${userId}`);
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
          error:
            'Chat limit exceeded. You have used all 30 chat attempts for today.',
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

    const { messages, model, system } = await req.json();

    const selectedModel = getModel(model || DEFAULT_MODEL);

    const result = streamText({
      model: selectedModel as any,
      system:
        system ||
        'You are an AI assistant that provides clear, concise summaries with key insights.',
      messages,
      experimental_transform: smoothStream()
    });

    return result.toTextStreamResponse({
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  } catch (error) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
