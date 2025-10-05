'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Clock, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Video {
  id: string;
  youtubeUrl: string;
  s3Key: string;
  prompt: string | null;
  totalClips: number | null;
  videoDuration: string | null;
  detectedLanguage: string | null;
  s3Path: string | null;
  createdAt: string;
  _count: {
    clips: number;
  };
}

export default function ClipsListPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideos();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/clips/list');
      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch videos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)/
    );
    return match ? match[1] : null;
  };

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='container mx-auto py-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='mb-2 text-3xl font-bold'>Your Videos</h1>
          <p className='text-muted-foreground'>
            View and manage your processed videos
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/clips')}>
          <Video className='mr-2 h-4 w-4' />
          New Video
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Video className='text-muted-foreground mb-4 h-12 w-12' />
            <p className='mb-2 text-lg font-medium'>No videos yet</p>
            <p className='text-muted-foreground mb-4'>
              Start by uploading your first YouTube video
            </p>
            <Button onClick={() => router.push('/dashboard/clips')}>
              Upload Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {videos.map((video) => {
            const videoId = getYouTubeVideoId(video.youtubeUrl);
            const isProcessing = video.totalClips === null;

            return (
              <Card
                key={video.id}
                className='cursor-pointer transition-shadow hover:shadow-lg'
                onClick={() => router.push(`/dashboard/clips/${video.id}`)}
              >
                <CardHeader className='p-0'>
                  {videoId && (
                    <div className='relative aspect-video'>
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                        alt='Video thumbnail'
                        className='h-full w-full rounded-t-lg object-cover'
                        onError={(e) => {
                          e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }}
                      />
                      {isProcessing && (
                        <div className='absolute inset-0 flex items-center justify-center rounded-t-lg bg-black/50'>
                          <Loader2 className='h-8 w-8 animate-spin text-white' />
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent className='pt-4'>
                  <div className='space-y-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>
                          Video ID: {video.id.slice(0, 8)}...
                        </p>
                        <p className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
                          <Clock className='h-3 w-3' />
                          {formatDistanceToNow(new Date(video.createdAt), {
                            addSuffix: true
                          })}
                        </p>
                      </div>
                      {isProcessing ? (
                        <Badge variant='secondary'>Processing</Badge>
                      ) : (
                        <Badge variant='default'>
                          {video._count.clips} clips
                        </Badge>
                      )}
                    </div>

                    {video.videoDuration && (
                      <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Clock className='h-4 w-4' />
                        <span>Duration: {video.videoDuration}</span>
                      </div>
                    )}

                    {video.detectedLanguage && (
                      <div className='text-muted-foreground text-sm'>
                        Language: {video.detectedLanguage}
                      </div>
                    )}

                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full'
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(video.youtubeUrl, '_blank');
                      }}
                    >
                      <ExternalLink className='mr-2 h-3 w-3' />
                      Open YouTube
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
