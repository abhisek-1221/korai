'use server';

interface YouTubeVideoResponse {
  items: Array<{
    snippet: {
      title: string;
    };
  }>;
}

export async function getYouTubeVideoTitle(videoId: string): Promise<string> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return `Sample Video - ${videoId}`;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }

    const data: YouTubeVideoResponse = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.title;
    }

    return `Sample Video - ${videoId}`;
  } catch (error) {
    console.error('Error fetching video title:', error);
    return `Sample Video - ${videoId}`;
  }
}

export async function getMultipleVideoTitles(
  videoIds: string[]
): Promise<Record<string, string>> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return videoIds.reduce(
        (acc, id) => {
          acc[id] = `Sample Video - ${id}`;
          return acc;
        },
        {} as Record<string, string>
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${apiKey}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }

    const data: YouTubeVideoResponse = await response.json();

    const titles: Record<string, string> = {};

    if (data.items && data.items.length > 0) {
      data.items.forEach((item, index) => {
        titles[videoIds[index]] = item.snippet.title;
      });
    }

    // Fill in missing titles
    videoIds.forEach((id) => {
      if (!titles[id]) {
        titles[id] = `Sample Video - ${id}`;
      }
    });

    return titles;
  } catch (error) {
    console.error('Error fetching video titles:', error);
    return videoIds.reduce(
      (acc, id) => {
        acc[id] = `Sample Video - ${id}`;
        return acc;
      },
      {} as Record<string, string>
    );
  }
}
