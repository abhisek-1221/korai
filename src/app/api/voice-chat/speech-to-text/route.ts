import { SarvamAIClient } from 'sarvamai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const API_KEY = process.env.SARVAM_API_KEY;

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: API_KEY });

    const buffer = await audioFile.arrayBuffer();
    const file = new File([buffer], audioFile.name, { type: audioFile.type });

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

    const sarvamLanguage = languageMap[language] || 'hi-IN';

    const response = await client.speechToText.transcribe({
      file: file,
      model: 'saarika:v2.5',
      language_code: sarvamLanguage as any
    });

    return NextResponse.json({
      text: response.transcript || '',
      language: language
    });
  } catch (error: any) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
