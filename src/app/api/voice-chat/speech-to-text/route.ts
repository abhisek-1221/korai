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

    // Validate audio file
    if (!(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'Invalid audio file format' },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type,
      language: language
    });

    const client = new SarvamAIClient({ apiSubscriptionKey: API_KEY });

    // Convert to Blob instead of File for better compatibility
    const buffer = await audioFile.arrayBuffer();
    const blob = new Blob([buffer], { type: audioFile.type || 'audio/webm' });

    // Create File with proper constructor
    const file = new File([blob], audioFile.name || 'audio.webm', {
      type: audioFile.type || 'audio/webm',
      lastModified: Date.now()
    });

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

    console.log('Transcription request:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      language: sarvamLanguage
    });

    const response = await client.speechToText.transcribe({
      file: file,
      model: 'saarika:v2.5',
      language_code: sarvamLanguage as any
    });

    console.log('Transcription response received:', {
      transcriptLength: response.transcript?.length,
      hasTranscript: !!response.transcript
    });

    return NextResponse.json({
      text: response.transcript || '',
      language: language
    });
  } catch (error: any) {
    console.error('Speech-to-text error:', {
      message: error.message,
      stack: error.stack,
      error: JSON.stringify(error, null, 2)
    });
    return NextResponse.json(
      {
        error: error.message || 'Failed to transcribe audio',
        details: error.stack?.split('\n')[0] || 'No additional details'
      },
      { status: 500 }
    );
  }
}
