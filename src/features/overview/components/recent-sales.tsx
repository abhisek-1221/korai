import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { sampleVideos, sampleVideoIds } from '@/lib/sample-data';
import { getMultipleVideoTitles } from '@/lib/youtube-titles';
import { SampleVideoItem } from './sample-video-item';

export async function RecentSales() {
  const titles = await getMultipleVideoTitles(sampleVideoIds);

  const videosWithTitles = sampleVideos.map((video) => ({
    ...video,
    title: titles[video.id] || `Sample Video - ${video.id}`
  }));

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Try Samples</CardTitle>
        <CardDescription>
          Explore these sample videos to test out features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {videosWithTitles.map((video) => (
            <SampleVideoItem key={video.id} video={video} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
