'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Clock,
  TrendingUp,
  FileText,
  Hash,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  totalClips: number | null;
  videoDuration: string | null;
  detectedLanguage: string | null;
  s3Path: string | null;
  createdAt: string;
  clips: Clip[];
}

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  useEffect(() => {
    if (video?.clips && video.clips.length > 0 && !selectedClip) {
      setSelectedClip(video.clips[0]);
    }
  }, [video]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/clips/${videoId}`);
      if (!response.ok) throw new Error('Failed to fetch video');

      const data = await response.json();
      setVideo(data);
    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch video details',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string, startTime?: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&\n?#]+)/
    );
    const videoId = match ? match[1] : null;

    if (!videoId) return null;

    let embedUrl = `https://www.youtube.com/embed/${videoId}`;

    if (startTime) {
      const seconds = timeToSeconds(startTime);
      embedUrl += `?start=${seconds}`;
    }

    return embedUrl;
  };

  const timeToSeconds = (time: string): number => {
    const parts = time.split(':').reverse();
    let seconds = 0;

    parts.forEach((part, index) => {
      seconds += parseInt(part) * Math.pow(60, index);
    });

    return seconds;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Text copied to clipboard'
    });
  };

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  if (!video) {
    return (
      <div className='container mx-auto py-8'>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <p className='text-lg font-medium'>Video not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const embedUrl = selectedClip
    ? getYouTubeEmbedUrl(video.youtubeUrl, selectedClip.start)
    : null;

  return (
    <div className='container mx-auto py-8'>
      <div className='mb-8'>
        <h1 className='mb-2 text-3xl font-bold'>Video Clips</h1>
        <div className='text-muted-foreground flex items-center gap-4 text-sm'>
          <span>Total Clips: {video.clips.length}</span>
          {video.videoDuration && <span>Duration: {video.videoDuration}</span>}
          {video.detectedLanguage && (
            <span>Language: {video.detectedLanguage}</span>
          )}
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Clips List */}
        <div className='lg:col-span-1'>
          <Card>
            <CardHeader>
              <CardTitle>Identified Clips</CardTitle>
              <CardDescription>
                {video.clips.length} viral clips found
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              <ScrollArea className='h-[600px]'>
                {video.clips.map((clip, index) => (
                  <div key={clip.id}>
                    <button
                      onClick={() => setSelectedClip(clip)}
                      className={`hover:bg-accent w-full p-4 text-left transition-colors ${
                        selectedClip?.id === clip.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className='space-y-2'>
                        <div className='flex items-start justify-between gap-2'>
                          <span className='text-sm font-medium'>
                            Clip {index + 1}
                          </span>
                          <Badge variant='secondary' className='shrink-0'>
                            <TrendingUp className='mr-1 h-3 w-3' />
                            {clip.viralityScore}
                          </Badge>
                        </div>
                        <p className='line-clamp-2 text-sm font-medium'>
                          {clip.title}
                        </p>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                          <Clock className='h-3 w-3' />
                          <span>
                            {clip.start} - {clip.end}
                          </span>
                        </div>
                      </div>
                    </button>
                    {index < video.clips.length - 1 && <Separator />}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Clip Preview and Details */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Video Preview */}
          {embedUrl && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  <span>Video Preview</span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => window.open(video.youtubeUrl, '_blank')}
                  >
                    <ExternalLink className='mr-2 h-4 w-4' />
                    Open in YouTube
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='aspect-video w-full'>
                  <iframe
                    src={embedUrl}
                    className='h-full w-full rounded-lg'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clip Details */}
          {selectedClip && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between'>
                    <span>{selectedClip.title}</span>
                    <Badge>
                      <TrendingUp className='mr-1 h-3 w-3' />
                      {selectedClip.viralityScore}
                    </Badge>
                  </CardTitle>
                  <CardDescription className='flex items-center gap-2'>
                    <Clock className='h-4 w-4' />
                    {selectedClip.start} - {selectedClip.end}
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                      <FileText className='h-4 w-4' />
                      Summary
                    </h3>
                    <p className='text-muted-foreground text-sm'>
                      {selectedClip.summary}
                    </p>
                  </div>

                  {selectedClip.relatedTopics.length > 0 && (
                    <div>
                      <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                        <Hash className='h-4 w-4' />
                        Related Topics
                      </h3>
                      <div className='flex flex-wrap gap-2'>
                        {selectedClip.relatedTopics.map((topic, index) => (
                          <Badge key={index} variant='outline'>
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center justify-between'>
                    <span>Transcript</span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => copyToClipboard(selectedClip.transcript)}
                    >
                      <Copy className='mr-2 h-4 w-4' />
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className='h-[200px] w-full rounded-md border p-4'>
                    <p className='text-sm whitespace-pre-wrap'>
                      {selectedClip.transcript}
                    </p>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
