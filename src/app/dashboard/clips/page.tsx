'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validateYoutubeVideoUrl } from '@/lib/youtube-validator';
import { Loader2, Youtube, Video, FolderOpen } from 'lucide-react';

export default function ClipsPage() {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if URL is empty
    if (!youtubeUrl || !youtubeUrl.trim()) {
      toast.error('Please enter a YouTube video URL');
      return;
    }

    // Validate YouTube URL
    const validation = validateYoutubeVideoUrl(youtubeUrl);

    if (!validation.isValid) {
      toast.error(validation.error || 'Please enter a valid YouTube video URL');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/clips/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          youtubeUrl,
          prompt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start clip identification');
      }

      toast.success('Video processing started. This may take a few minutes.');

      // Reset form
      setYoutubeUrl('');
      setPrompt('');

      // Redirect to videos list
      router.push('/dashboard/clips/videos');
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to start processing'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='h-screen overflow-y-auto'>
      <div className='container mx-auto max-w-5xl px-4 py-8'>
        {/* Header Section */}
        <div className='mb-8'>
          <h1 className='mb-2 text-3xl font-bold tracking-tight'>
            Generate Viral Shorts
          </h1>
          <p className='text-muted-foreground text-base'>
            AI-powered clip identification from YouTube videos
          </p>
        </div>

        {/* Main Upload Form */}
        <Card>
          <CardHeader className='border-b pb-4'>
            <CardTitle className='text-lg font-semibold'>Video Input</CardTitle>
            <CardDescription>
              Enter a YouTube URL to identify viral-worthy clips
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
                  Paste the full URL of the video you want to analyze
                </p>
              </div>

              {/* Prompt Input */}
              <div className='space-y-2'>
                <Label htmlFor='prompt' className='text-sm font-medium'>
                  Custom Instructions{' '}
                  <span className='text-muted-foreground font-normal'>
                    (Optional)
                  </span>
                </Label>
                <Textarea
                  id='prompt'
                  placeholder='e.g., Focus on emotional moments, technical explanations, or funny segments...'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className='resize-none'
                />
                <p className='text-muted-foreground text-xs'>
                  Provide specific guidance to help the AI identify relevant
                  clips
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-3 pt-2'>
                <Button
                  type='submit'
                  disabled={isLoading || !youtubeUrl}
                  size='default'
                  className='flex-1'
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Video className='mr-2 h-4 w-4' />
                      Identify Clips
                    </>
                  )}
                </Button>

                <Button
                  type='button'
                  variant='outline'
                  size='default'
                  onClick={() => router.push('/dashboard/clips/videos')}
                  disabled={isLoading}
                >
                  <FolderOpen className='mr-2 h-4 w-4' />
                  View All
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Section */}
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
                    Provide the YouTube video link you want to analyze
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  2
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>AI Analysis</p>
                  <p className='text-muted-foreground text-xs'>
                    Advanced algorithms identify viral-worthy moments and
                    patterns
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  3
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Receive Results</p>
                  <p className='text-muted-foreground text-xs'>
                    Get clips with timestamps, virality scores, and summaries
                  </p>
                </div>
              </div>
              <div className='flex gap-3'>
                <div className='bg-muted flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium'>
                  4
                </div>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Export & Share</p>
                  <p className='text-muted-foreground text-xs'>
                    Process and export clips with customizable settings
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
