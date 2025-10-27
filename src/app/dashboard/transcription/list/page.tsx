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
import {
  Loader2,
  ArrowLeft,
  MessageSquareText,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import PageContainer from '@/components/layout/page-container';

interface Transcription {
  id: string;
  youtubeUrl: string;
  status: string;
  createdAt: string;
  _count: {
    segments: number;
  };
}

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function TranscriptionListPage() {
  const router = useRouter();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const fetchTranscriptions = async () => {
    try {
      const response = await fetch('/api/transcription/list');
      if (!response.ok) throw new Error('Failed to fetch transcriptions');

      const data = await response.json();
      setTranscriptions(data.transcriptions);
    } catch (error) {
      console.error('Error fetching transcriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer scrollable>
        <div className='flex h-96 items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className='container mx-auto px-4 py-6'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <Button
              variant='ghost'
              onClick={() => router.push('/dashboard/transcription')}
              className='mb-2'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back
            </Button>
            <h1 className='text-3xl font-bold tracking-tight'>
              My Transcriptions
            </h1>
            <p className='text-muted-foreground'>
              {transcriptions.length} transcription
              {transcriptions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/transcription')}>
            <MessageSquareText className='mr-2 h-4 w-4' />
            New Transcription
          </Button>
        </div>

        {transcriptions.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <MessageSquareText className='text-muted-foreground mb-4 h-12 w-12' />
              <p className='mb-2 text-lg font-medium'>No transcriptions yet</p>
              <p className='text-muted-foreground mb-4'>
                Start by transcribing your first video
              </p>
              <Button onClick={() => router.push('/dashboard/transcription')}>
                Start Transcription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {transcriptions.map((transcription) => {
              const videoId = getYouTubeVideoId(transcription.youtubeUrl);
              const isProcessing = transcription.status === 'processing';

              return (
                <Card
                  key={transcription.id}
                  className='cursor-pointer transition-shadow hover:shadow-lg'
                  onClick={() => {
                    if (!isProcessing) {
                      router.push(
                        `/dashboard/transcription/${transcription.id}`
                      );
                    }
                  }}
                >
                  <CardHeader className='p-0'>
                    {videoId ? (
                      <div className='relative aspect-video w-full overflow-hidden rounded-t-lg'>
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                          alt='Thumbnail'
                          className='h-full w-full object-cover'
                        />
                        {isProcessing && (
                          <div className='absolute inset-0 flex items-center justify-center bg-black/60'>
                            <div className='flex items-center gap-2 text-white'>
                              <Loader2 className='h-5 w-5 animate-spin' />
                              <span className='text-sm font-medium'>
                                Processing...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='bg-muted flex aspect-video w-full items-center justify-center rounded-t-lg'>
                        <MessageSquareText className='text-muted-foreground h-12 w-12' />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className='p-4'>
                    <div className='mb-3 flex items-start justify-between'>
                      <div className='flex-1'>
                        <Badge
                          variant={isProcessing ? 'secondary' : 'default'}
                          className='mb-2'
                        >
                          {isProcessing ? 'Processing' : 'Completed'}
                        </Badge>
                      </div>
                    </div>

                    <div className='space-y-2 text-sm'>
                      <div className='text-muted-foreground flex items-center gap-2'>
                        <Users className='h-4 w-4' />
                        <span>
                          {transcription._count.segments > 0
                            ? `${transcription._count.segments} segments`
                            : 'Processing...'}
                        </span>
                      </div>
                      <div className='text-muted-foreground flex items-center gap-2'>
                        <Clock className='h-4 w-4' />
                        <span>
                          {format(new Date(transcription.createdAt), 'PPp')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
