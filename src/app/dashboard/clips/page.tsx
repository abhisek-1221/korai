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
import {
  Loader2,
  Youtube,
  Sparkles,
  Video,
  FileText,
  FolderOpen
} from 'lucide-react';

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
      <div className='container mx-auto max-w-6xl px-4 py-8'>
        {/* Header Section */}
        <div className='mb-10 text-center'>
          <div className='mb-4 flex items-center justify-center gap-3'>
            <div className='bg-primary/10 rounded-full p-3'>
              <Youtube className='text-primary h-8 w-8' />
            </div>
            <h1 className='from-primary to-primary/60 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent'>
              Upload YouTube Link
            </h1>
          </div>
          <p className='text-muted-foreground mx-auto max-w-2xl text-lg'>
            Transform your YouTube videos into viral-worthy clips with
            AI-powered analysis
          </p>
        </div>

        <div className='mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3'>
          {/* Feature Cards */}
          <Card className='border-2'>
            <CardContent className='pt-6 text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10'>
                <Sparkles className='h-6 w-6 text-blue-500' />
              </div>
              <h3 className='mb-2 font-semibold'>AI-Powered Analysis</h3>
              <p className='text-muted-foreground text-sm'>
                Advanced algorithms identify the most engaging moments
              </p>
            </CardContent>
          </Card>

          <Card className='border-2'>
            <CardContent className='pt-6 text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10'>
                <Video className='h-6 w-6 text-green-500' />
              </div>
              <h3 className='mb-2 font-semibold'>Precise Timestamps</h3>
              <p className='text-muted-foreground text-sm'>
                Get exact start and end times for each viral clip
              </p>
            </CardContent>
          </Card>

          <Card className='border-2'>
            <CardContent className='pt-6 text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10'>
                <FileText className='h-6 w-6 text-purple-500' />
              </div>
              <h3 className='mb-2 font-semibold'>Detailed Insights</h3>
              <p className='text-muted-foreground text-sm'>
                Virality scores, summaries, and topic analysis
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Upload Form */}
        <Card className='border-2 shadow-lg'>
          <CardHeader className='bg-muted/50 border-b'>
            <CardTitle className='flex items-center gap-2 text-2xl'>
              <Youtube className='h-6 w-6 text-red-500' />
              Video Information
            </CardTitle>
            <CardDescription className='text-base'>
              Enter a YouTube URL and optional custom prompt to guide the AI
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-6'>
            <form onSubmit={handleSubmit} className='space-y-8'>
              {/* YouTube URL Input */}
              <div className='space-y-3'>
                <Label
                  htmlFor='youtubeUrl'
                  className='flex items-center gap-2 text-base font-semibold'
                >
                  <Youtube className='h-4 w-4 text-red-500' />
                  YouTube URL *
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
                    className='h-12 pr-12 pl-4 text-base'
                  />
                  <Youtube className='text-muted-foreground absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2' />
                </div>
                <p className='text-muted-foreground flex items-start gap-2 text-sm'>
                  <span className='mt-0.5 text-blue-500'>ℹ️</span>
                  Paste the full URL of the YouTube video you want to analyze
                </p>
              </div>

              {/* Prompt Input */}
              <div className='space-y-3'>
                <Label
                  htmlFor='prompt'
                  className='flex items-center gap-2 text-base font-semibold'
                >
                  <Sparkles className='h-4 w-4 text-yellow-500' />
                  Custom Prompt (Optional)
                </Label>
                <Textarea
                  id='prompt'
                  placeholder='e.g., Focus on emotional moments, technical explanations, or funny segments...'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className='resize-none text-base'
                />
                <p className='text-muted-foreground flex items-start gap-2 text-sm'>
                  <span className='mt-0.5 text-yellow-500'>✨</span>
                  Add specific instructions to guide the AI in identifying clips
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-4 pt-4'>
                <Button
                  type='submit'
                  disabled={isLoading || !youtubeUrl}
                  size='lg'
                  className='h-12 flex-1 text-base font-semibold'
                >
                  {isLoading ? (
                    <>
                      <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                      Processing Video...
                    </>
                  ) : (
                    <>
                      <Sparkles className='mr-2 h-5 w-5' />
                      Identify Viral Clips
                    </>
                  )}
                </Button>

                <Button
                  type='button'
                  variant='outline'
                  size='lg'
                  className='h-12'
                  onClick={() => router.push('/dashboard/clips/videos')}
                  disabled={isLoading}
                >
                  <FolderOpen className='mr-2 h-5 w-5' />
                  View Spaces
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className='bg-muted/50 mt-8 rounded-lg border p-6'>
          <h3 className='mb-3 flex items-center gap-2 font-semibold'>
            <Video className='h-5 w-5' />
            How it works
          </h3>
          <ol className='text-muted-foreground ml-7 space-y-2 text-sm'>
            <li className='list-decimal'>Submit your YouTube video URL</li>
            <li className='list-decimal'>
              AI analyzes the entire video for viral moments
            </li>
            <li className='list-decimal'>
              Receive clips with timestamps, scores, and summaries
            </li>
            <li className='list-decimal'>
              Preview and manage your clips in the Spaces section
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
