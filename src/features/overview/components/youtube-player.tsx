'use client';

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { useVideoPlayerStore } from '../store/video-player-store';
import { Play } from 'lucide-react';

export function YouTubePlayer() {
  const { selectedVideoId } = useVideoPlayerStore();

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-lg'>Video Preview</CardTitle>
        <CardDescription className='text-xs'>
          Click on a sample video to preview it here
        </CardDescription>
      </CardHeader>
      <CardContent className='flex-1 p-4 pt-0'>
        {selectedVideoId ? (
          <div className='relative h-full w-full overflow-hidden rounded-lg'>
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
              title='YouTube video player'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              allowFullScreen
              className='absolute inset-0 h-full w-full'
            />
          </div>
        ) : (
          <div className='bg-muted/50 flex h-full w-full items-center justify-center rounded-lg'>
            <div className='flex flex-col items-center gap-3 text-center'>
              <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full'>
                <Play className='text-primary h-6 w-6' />
              </div>
              <div className='space-y-1'>
                <p className='text-sm font-medium'>No video selected</p>
                <p className='text-muted-foreground text-xs'>
                  Select a sample video to start watching
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
