'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Youtube, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';

export default function TranscriptionPage() {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/transcription/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ youtubeUrl })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start transcription');
      }

      toast.success('Transcription started. This may take a few minutes.');

      // Reset form
      setYoutubeUrl('');

      // Redirect to transcriptions list
      router.push('/dashboard/transcription/list');
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to start transcription'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer scrollable>
      <div className='container mx-auto max-w-5xl px-4 py-8'>
        {/* Header Section */}
        <div className='mb-8'>
          <h1 className='mb-2 text-3xl font-bold tracking-tight'>
            Video Transcription with Speaker Diarization
          </h1>
          <p className='text-muted-foreground text-base'>
            Get timestamped transcripts with speaker identification
          </p>
        </div>

        {/* Main Upload Form */}
        <Card>
          <CardHeader className='border-b pb-4'>
            <CardTitle className='text-lg font-semibold'>Video Input</CardTitle>
            <CardDescription>
              Enter a YouTube URL to get transcription with speaker
              identification
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-6'>
            <form onSubmit={handleSubmit} className='space-y-6'>
              {/* YouTube URL Input */}
              <div className='space-y-2'>
                <Label htmlFor='youtubeUrl' className='text-sm font-medium'>
                  YouTube URL
                </Label>
                <div className='relative'>
                  <Input
                    id='youtubeUrl'
                    type='url'
                    placeholder='https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                    disabled={isLoading}
                    className='h-11 pr-10'
                  />
                  <Youtube className='text-muted-foreground/50 absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
                </div>
                <p className='text-muted-foreground text-xs'>
                  Paste the full URL of the video you want to transcribe
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type='submit'
                disabled={isLoading}
                className='w-full'
                size='lg'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                    Starting Transcription...
                  </>
                ) : (
                  <>
                    <MessageSquareText className='mr-2 h-5 w-5' />
                    Start Transcription
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className='mt-6'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-base font-semibold'>
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  1
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Submit Video URL</p>
                  <p className='text-muted-foreground text-xs'>
                    Provide the YouTube video link you want to transcribe
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  2
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>AI Processing</p>
                  <p className='text-muted-foreground text-xs'>
                    Our AI transcribes the video and identifies different
                    speakers
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  3
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Review & Customize</p>
                  <p className='text-muted-foreground text-xs'>
                    View timestamped transcript and assign names to speakers
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
