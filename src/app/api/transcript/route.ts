import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return Response.json(
        { success: false, error: 'Missing videoId query param' },
        { status: 400 }
      );
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    return Response.json({
      success: true,
      videoId,
      transcript
    });
  } catch (err: any) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
