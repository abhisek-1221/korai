import { NextResponse } from 'next/server';
import { redis } from '@/lib/upstash';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check current usage directly from Redis
    const now = Date.now();
    const window = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const quizKey = `ratelimit:user:quiz:quiz_${userId}`;
    const chatKey = `ratelimit:user:chat:chat_${userId}`;

    // Get current usage count from Redis using zcount (count elements in score range)
    const [quizUsed, chatUsed] = await Promise.all([
      redis.zcount(quizKey, now - window, now).catch(() => 0),
      redis.zcount(chatKey, now - window, now).catch(() => 0)
    ]);

    // Calculate remaining attempts
    const quizRemaining = Math.max(0, 5 - (quizUsed || 0));
    const chatRemaining = Math.max(0, 10 - (chatUsed || 0));

    // Calculate reset time (24 hours from now)
    const resetTime = now + window;

    return NextResponse.json({
      quiz: {
        limit: 5,
        remaining: quizRemaining,
        reset: resetTime,
        used: quizUsed || 0
      },
      chat: {
        limit: 10,
        remaining: chatRemaining,
        reset: resetTime,
        used: chatUsed || 0
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
