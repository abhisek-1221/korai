import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './upstash';

export const transcribeRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'),
  analytics: true,
  prefix: 'ratelimit:transcribe'
});

export const chatRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, '1 m'),
  analytics: true,
  prefix: 'ratelimit:chat'
});

export const ttsRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ratelimit:tts'
});

export const mailRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
  analytics: true,
  prefix: 'ratelimit:mail'
});

// User-specific rate limiters
export const userQuizLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '24 h'), // 5 quizzes per 24 hours
  analytics: true,
  prefix: 'ratelimit:user:quiz'
});

export const userChatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '24 h'), // 30 chats per 24 hours
  analytics: true,
  prefix: 'ratelimit:user:chat'
});
