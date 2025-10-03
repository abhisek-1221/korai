import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { userQuizLimiter } from '@/lib/ratelimit';
import { getModel, DEFAULT_MODEL } from '@/lib/providers';
import { auth } from '@clerk/nextjs/server';

export const maxDuration = 60;

export async function POST(request: Request) {
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
      rateLimitResult = await userQuizLimiter.limit(`quiz_${userId}`);
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
            'Quiz limit exceeded. You have used all 5 quiz attempts for today.',
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

    const { transcript, numQuestions, model } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    if (!numQuestions || numQuestions < 2 || numQuestions > 10) {
      return NextResponse.json(
        { error: 'Number of questions must be between 2 and 10' },
        { status: 400 }
      );
    }

    const selectedModel = getModel(model || DEFAULT_MODEL);

    const systemPrompt = `You are an expert quiz generator. Your task is to create high-quality multiple choice questions based on the provided video transcript.

Guidelines:
1. Create exactly ${numQuestions} questions
2. Each question should have 4 answer options (A, B, C, D)
3. Questions should test understanding of key concepts, facts, and insights from the video
4. Avoid questions that are too easy or too difficult
5. Include explanations for correct answers when possible
6. Focus on the most important and memorable content
7. Make wrong answers plausible but clearly incorrect

Response format must be valid JSON:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

The correctAnswer field should be the index (0-3) of the correct option in the options array.`;

    const userPrompt = `Based on this video transcript, generate ${numQuestions} multiple choice questions:

${transcript}

Remember to respond only with valid JSON in the exact format specified.`;

    const result = await streamText({
      model: selectedModel as any,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxOutputTokens: 4000
    });

    return result.toTextStreamResponse({
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
