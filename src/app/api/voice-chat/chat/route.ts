import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getModel, DEFAULT_MODEL } from '@/lib/providers';

export async function POST(request: NextRequest) {
  try {
    const { message, transcript, language, previousMessages, model } =
      await request.json();

    console.log('Chat request received:', {
      hasMessage: !!message,
      messageLength: message?.length,
      language,
      hasTranscript: !!transcript,
      previousMessagesCount: previousMessages?.length || 0
    });

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'No video transcript available' },
        { status: 400 }
      );
    }

    // Get the appropriate model using centralized provider
    const selectedModel = getModel(model || DEFAULT_MODEL);

    // Language-specific instructions
    const languageInstructions: { [key: string]: string } = {
      'en-US': 'Respond in English',
      'hi-IN': 'Respond in Hindi (Devanagari script)',
      'bn-IN': 'Respond in Bengali',
      'ta-IN': 'Respond in Tamil',
      'te-IN': 'Respond in Telugu',
      'mr-IN': 'Respond in Marathi',
      'gu-IN': 'Respond in Gujarati',
      'kn-IN': 'Respond in Kannada',
      'ml-IN': 'Respond in Malayalam',
      'od-IN': 'Respond in Odia',
      'pa-IN': 'Respond in Punjabi'
    };

    const languageInstruction =
      languageInstructions[language] ||
      'Respond in the same language as the user';

    const systemPrompt = `You are a multilingual AI assistant helping users understand video content. You have access to the following video transcript:

${transcript.substring(0, 2000)}

Guidelines:
- Answer questions based on this transcript
- Be conversational, helpful, and accurate
- Keep responses concise but informative (2-3 sentences max for voice)
- If something is not mentioned in the transcript, say so
- Respond in a natural, speaking style since this will be converted to speech
- IMPORTANT: ${languageInstruction}

Previous conversation context:
${
  previousMessages
    ?.slice(-3)
    .map((msg: any) => `${msg.role}: ${msg.content}`)
    .join('\n') || 'None'
}

Current user message: ${message}`;

    console.log('Generating AI response with language:', language);

    const result = await generateText({
      model: selectedModel as any,
      prompt: systemPrompt,
      temperature: 0.7
    });

    console.log('AI response generated:', {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      textPreview: result.text?.substring(0, 100)
    });

    if (!result.text || result.text.trim().length === 0) {
      console.error('Empty response from AI');
      return NextResponse.json(
        { error: 'AI returned empty response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: result.text.trim(),
      language: language
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response' },
      { status: 500 }
    );
  }
}
