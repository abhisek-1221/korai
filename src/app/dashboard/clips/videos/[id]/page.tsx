'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, ExternalLink, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Clip {
  id: string;
  start: string;
  end: string;
  title: string;
  summary: string;
  viralityScore: string;
  relatedTopics: string[];
  transcript: string;
  createdAt: string;
}

interface Video {
  id: string;
  youtubeUrl: string;
  s3Key: string;
  prompt: string | null;
  totalClips: number;
  videoDuration: string | null;
  detectedLanguage: string | null;
  s3Path: string | null;
  createdAt: string;
  clips: Clip[];
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideoDetails();
  }, [params.id]);

  useEffect(() => {
    if (video?.clips && video.clips.length > 0 && !selectedClip) {
      setSelectedClip(video.clips[0]);
    }
  }, [video]);

  const fetchVideoDetails = async () => {
    try {
      const response = await fetch(`/api/clips/videos/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch video details');

      const data = await response.json();
      setVideo(data.video);
    } catch (error) {
      console.error('Error fetching video details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch video details',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getYouTubeEmbedUrl = (
    url: string,
    startTime?: string,
    endTime?: string
  ) => {
    try {
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/
      )?.[1];
      if (!videoId) return null;

      const startSeconds = startTime ? convertTimeToSeconds(startTime) : 0;
      const endSeconds = endTime ? convertTimeToSeconds(endTime) : 0;

      const params = new URLSearchParams();
      if (startSeconds > 0)
        params.append('start', Math.floor(startSeconds).toString());
      if (endSeconds > 0)
        params.append('end', Math.floor(endSeconds).toString());
      params.append('autoplay', '0');

      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    } catch {
      return null;
    }
  };

  const convertTimeToSeconds = (time: string): number => {
    // Handle both formats: "154.623" (seconds as string) and "2:34" (time format)
    const numericTime = parseFloat(time);
    if (!isNaN(numericTime)) {
      return numericTime;
    }

    // Handle time format HH:MM:SS or MM:SS
    const parts = time.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const formatTime = (timeStr: string): string => {
    const seconds = convertTimeToSeconds(timeStr);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!video) {
    return (
      <div className='container mx-auto py-10'>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16'>
            <p className='text-muted-foreground mb-4'>Video not found</p>
            <Button onClick={() => router.push('/dashboard/clips/videos')}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Videos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-h-screen overflow-y-auto px-4 py-6'>
      <div className='mb-6'>
        <Button
          variant='ghost'
          onClick={() => router.push('/dashboard/clips/videos')}
          className='mb-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Videos
        </Button>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='mb-2 text-3xl font-bold tracking-tight'>
              Video Clips
            </h1>
            <p className='text-muted-foreground'>
              {video.totalClips} viral clips identified
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => window.open(video.youtubeUrl, '_blank')}
          >
            <ExternalLink className='mr-2 h-4 w-4' />
            Open on YouTube
          </Button>
        </div>
      </div>

      {video.clips.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-16'>
            <Loader2 className='text-muted-foreground mb-4 h-16 w-16 animate-spin' />
            <h3 className='mb-2 text-xl font-semibold'>Processing video...</h3>
            <p className='text-muted-foreground'>
              This may take a few minutes. The page will update automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid h-[calc(100vh-240px)] grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Clips List */}
          <div className='flex h-full flex-col lg:col-span-1'>
            <h2 className='flex-shrink-0 pb-4 text-xl font-semibold'>
              Identified Clips
            </h2>
            <div className='flex-1 space-y-3 overflow-y-auto pr-2'>
              {video.clips.map((clip) => (
                <Card
                  key={clip.id}
                  className={`cursor-pointer transition-all ${
                    selectedClip?.id === clip.id
                      ? 'ring-primary shadow-md ring-2'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedClip(clip)}
                >
                  <CardHeader className='p-4 pb-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <CardTitle className='line-clamp-2 text-base'>
                        {clip.title}
                      </CardTitle>
                      <Badge variant='secondary' className='flex-shrink-0'>
                        <TrendingUp className='mr-1 h-3 w-3' />
                        {clip.viralityScore}
                      </Badge>
                    </div>
                    <CardDescription className='text-xs'>
                      {formatTime(clip.start)} - {formatTime(clip.end)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='p-4 pt-0'>
                    <p className='text-muted-foreground line-clamp-2 text-sm'>
                      {clip.summary}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Clip Preview and Details */}
          <div className='flex h-full flex-col space-y-6 overflow-y-auto pl-2 lg:col-span-2'>
            {selectedClip && (
              <>
                {/* Video Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      {formatTime(selectedClip.start)} -{' '}
                      {formatTime(selectedClip.end)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='aspect-video w-full'>
                      {getYouTubeEmbedUrl(
                        video.youtubeUrl,
                        selectedClip.start,
                        selectedClip.end
                      ) ? (
                        <iframe
                          key={selectedClip.id}
                          src={
                            getYouTubeEmbedUrl(
                              video.youtubeUrl,
                              selectedClip.start,
                              selectedClip.end
                            )!
                          }
                          className='h-full w-full rounded-lg'
                          allowFullScreen
                          title={selectedClip.title}
                        />
                      ) : (
                        <div className='bg-muted flex h-full w-full items-center justify-center rounded-lg'>
                          <p className='text-muted-foreground'>
                            Unable to load video
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Clip Details */}
                <Card>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <CardTitle className='mb-2 text-2xl'>
                          {selectedClip.title}
                        </CardTitle>
                        <CardDescription>
                          Duration: {formatTime(selectedClip.start)} -{' '}
                          {formatTime(selectedClip.end)}
                        </CardDescription>
                      </div>
                      <Badge variant='default' className='px-3 py-1 text-base'>
                        <TrendingUp className='mr-1 h-4 w-4' />
                        {selectedClip.viralityScore}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-6'>
                    <div>
                      <h3 className='mb-2 font-semibold'>Summary</h3>
                      <p className='text-muted-foreground'>
                        {selectedClip.summary}
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h3 className='mb-2 font-semibold'>Related Topics</h3>
                      <div className='flex flex-wrap gap-2'>
                        {selectedClip.relatedTopics.map((topic, index) => (
                          <Badge key={index} variant='outline'>
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className='mb-2 font-semibold'>Transcript</h3>
                      <div className='bg-muted rounded-lg p-4'>
                        <p className='text-sm whitespace-pre-wrap'>
                          {selectedClip.transcript}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
