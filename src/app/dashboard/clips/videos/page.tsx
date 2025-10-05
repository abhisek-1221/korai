'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Video, Clock, Film, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

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
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
    // Set up polling to check for updated videos
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/clips/videos');
      if (!response.ok) throw new Error('Failed to fetch videos');

      const data = await response.json();
      setVideos(data.videos || []);
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

  const getYouTubeThumbnail = (url: string) => {
    try {
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/
      )?.[1];
      return videoId
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : null;
    } catch {
      return null;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    setDeleteVideoId(videoId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteVideoId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/clips/videos/${deleteVideoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete video');

      toast({
        title: 'Success',
        description: 'Video deleted successfully'
      });

      // Remove video from state
      setVideos(videos.filter((v) => v.id !== deleteVideoId));
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setDeleteVideoId(null);
    }
  };

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='h-screen overflow-y-auto'>
      <div className='container mx-auto px-4 py-10'>
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-4xl font-bold tracking-tight'>
              Your Video Space
            </h1>
            <p className='text-muted-foreground mt-2'>
              View all your processed videos and their clips
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/clips')}>
            <Plus className='mr-2 h-4 w-4' />
            Add Video
          </Button>
        </div>

        {videos.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-16'>
              <Video className='text-muted-foreground mb-4 h-16 w-16' />
              <h3 className='mb-2 text-xl font-semibold'>No videos yet</h3>
              <p className='text-muted-foreground mb-4'>
                Start by adding your first YouTube video
              </p>
              <Button onClick={() => router.push('/dashboard/clips')}>
                <Plus className='mr-2 h-4 w-4' />
                Add Video
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {videos.map((video) => (
              <Card
                key={video.id}
                className='group relative cursor-pointer transition-shadow hover:shadow-lg'
                onClick={() =>
                  router.push(`/dashboard/clips/videos/${video.id}`)
                }
              >
                <Button
                  variant='destructive'
                  size='icon'
                  className='absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100'
                  onClick={(e) => handleDeleteClick(e, video.id)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
                <CardHeader className='p-0'>
                  {getYouTubeThumbnail(video.youtubeUrl) ? (
                    <img
                      src={getYouTubeThumbnail(video.youtubeUrl)!}
                      alt='Video thumbnail'
                      className='h-48 w-full rounded-t-lg object-cover'
                    />
                  ) : (
                    <div className='bg-muted flex h-48 w-full items-center justify-center rounded-t-lg'>
                      <Video className='text-muted-foreground h-12 w-12' />
                    </div>
                  )}
                </CardHeader>
                <CardContent className='space-y-3 p-4'>
                  <div>
                    <CardTitle className='mb-1 line-clamp-2 text-lg'>
                      Video #{video.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription className='text-xs'>
                      {new Date(video.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Badge
                      variant='secondary'
                      className='flex items-center gap-1'
                    >
                      <Film className='h-3 w-3' />
                      {video.totalClips} clips
                    </Badge>
                    {video.videoDuration && (
                      <Badge
                        variant='outline'
                        className='flex items-center gap-1'
                      >
                        <Clock className='h-3 w-3' />
                        {video.videoDuration}
                      </Badge>
                    )}
                    {video.detectedLanguage && (
                      <Badge variant='outline'>
                        {video.detectedLanguage.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {video.totalClips === 0 && (
                    <Badge
                      variant='secondary'
                      className='w-full justify-center'
                    >
                      Processing...
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog
          open={!!deleteVideoId}
          onOpenChange={(open) => !open && setDeleteVideoId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this video and all its clips. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
