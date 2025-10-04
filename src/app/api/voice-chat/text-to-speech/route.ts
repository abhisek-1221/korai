import { SarvamAIClient } from 'sarvamai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.SARVAM_API_KEY;

    if (!API_KEY) {
      console.error('TTS Error: API key not configured');
      return NextResponse.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { text, language } = body;

    console.log('TTS Request received:', {
      hasText: !!text,
      textLength: text?.length,
      language,
      bodyKeys: Object.keys(body)
    });

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('TTS Error: Invalid text', { text, type: typeof text });
      return NextResponse.json(
        { error: 'No valid text provided' },
        { status: 400 }
      );
    }

    if (!language) {
      console.error('TTS Error: No language provided');
      return NextResponse.json(
        { error: 'No language provided' },
        { status: 400 }
      );
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: API_KEY });

    const languageMap: { [key: string]: string } = {
      'en-US': 'en-IN',
      'hi-IN': 'hi-IN',
      'bn-IN': 'bn-IN',
      'ta-IN': 'ta-IN',
      'te-IN': 'te-IN',
      'mr-IN': 'mr-IN',
      'gu-IN': 'gu-IN',
      'kn-IN': 'kn-IN',
      'ml-IN': 'ml-IN',
      'od-IN': 'od-IN',
      'pa-IN': 'pa-IN'
    };

    const sarvamLanguage = languageMap[language] || 'en-IN';

    console.log('TTS Processing:', {
      inputLanguage: language,
      mappedLanguage: sarvamLanguage,
      textLength: text.length,
      textPreview: text.substring(0, 100)
    });

    const ttsParams = {
      text: text.trim(),
      model: 'bulbul:v2' as any,
      speaker: 'anushka' as any,
      target_language_code: sarvamLanguage as any,
      enable_preprocessing: true
    };

    console.log('Calling Sarvam API with params:', ttsParams);

    const response = await client.textToSpeech.convert(ttsParams);

    console.log('TTS Response received:', {
      hasAudios: !!response.audios,
      audioCount: response.audios?.length || 0,
      responseKeys: Object.keys(response)
    });

    if (!response.audios || response.audios.length === 0) {
      console.error('TTS Error: No audio generated in response', response);
      return NextResponse.json(
        { error: 'No audio generated', response },
        { status: 400 }
      );
    }

    const audioBase64 = response.audios[0];
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    console.log(
      'TTS Success: Generated audio buffer of size',
      audioBuffer.length
    );

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString()
      }
    });
  } catch (error: any) {
    console.error('Text-to-speech error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response,
      data: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      fullError: JSON.stringify(error, null, 2)
    });

    const statusCode = error.response?.status || 500;

    return NextResponse.json(
      {
        error: error.message || 'Failed to generate speech',
        details:
          error.response?.data ||
          error.response?.statusText ||
          error.toString(),
        statusCode
      },
      { status: statusCode }
    );
  }
}
