import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Sparkles, Activity } from 'lucide-react';

const recentClipsData = [
  {
    title: 'How AI Will Change Everything',
    duration: '2:45',
    viralScore: '9.2',
    clips: 8,
    status: 'processed'
  },
  {
    title: 'The Future of Web Development',
    duration: '3:12',
    viralScore: '8.7',
    clips: 12,
    status: 'processing'
  },
  {
    title: 'Startup Growth Strategies',
    duration: '1:58',
    viralScore: '9.5',
    clips: 6,
    status: 'processed'
  },
  {
    title: 'Productivity Hacks for 2025',
    duration: '4:23',
    viralScore: '8.1',
    clips: 15,
    status: 'processed'
  },
  {
    title: 'Building Viral Content',
    duration: '2:34',
    viralScore: '9.8',
    clips: 9,
    status: 'processed'
  }
];

export function RecentSales() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Recent Videos</CardTitle>
        <CardDescription>
          Your latest analyzed videos with viral clips.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-6'>
          {recentClipsData.map((video, index) => (
            <div key={index} className='flex items-center gap-4'>
              <div className='bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg'>
                <Video className='text-primary h-5 w-5' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='line-clamp-1 text-sm leading-none font-medium'>
                  {video.title}
                </p>
                <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                  <span>{video.duration}</span>
                  <span>•</span>
                  <span>{video.clips} clips</span>
                </div>
              </div>
              <div className='flex flex-col items-end gap-1'>
                <Badge variant='secondary' className='flex items-center gap-1'>
                  <Activity className='h-3 w-3' />
                  {video.viralScore}
                </Badge>
                <span
                  className={`text-xs ${
                    video.status === 'processed'
                      ? 'text-green-500'
                      : 'text-yellow-500'
                  }`}
                >
                  {video.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
