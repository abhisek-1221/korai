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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  Download,
  Sparkles
} from 'lucide-react';
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

interface ExportedClip {
  id: string;
  start: string;
  end: string;
  s3Key: string;
  aspectRatio: string;
  targetLanguage: string | null;
  createdAt: string;
  // Matched original clip data
  originalClip?: Clip;
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
  const [selectedClipsForExport, setSelectedClipsForExport] = useState<
    Set<string>
  >(new Set());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('none');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportedClips, setExportedClips] = useState<ExportedClip[]>([]);
  const [isLoadingExported, setIsLoadingExported] = useState(false);
  const [clipVideoUrls, setClipVideoUrls] = useState<Record<string, string>>(
    {}
  );
  const [selectedExportedClip, setSelectedExportedClip] =
    useState<ExportedClip | null>(null);

  useEffect(() => {
    fetchVideoDetails();
  }, [params.id]);

  useEffect(() => {
    if (video?.clips && video.clips.length > 0 && !selectedClip) {
      setSelectedClip(video.clips[0]);
    }
  }, [video]);

  useEffect(() => {
    // Auto-load video URL when an exported clip is selected
    if (selectedExportedClip && !clipVideoUrls[selectedExportedClip.id]) {
      getSignedUrl(selectedExportedClip.s3Key, selectedExportedClip.id);
    }
  }, [selectedExportedClip]);

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

  const toggleClipSelection = (clipId: string) => {
    const newSelection = new Set(selectedClipsForExport);
    if (newSelection.has(clipId)) {
      newSelection.delete(clipId);
    } else {
      newSelection.add(clipId);
    }
    setSelectedClipsForExport(newSelection);
  };

  const handleGenerateShorts = () => {
    if (selectedClipsForExport.size === 0) return;
    setIsConfigModalOpen(true);
  };

  const handleExportClips = async () => {
    if (!video || selectedClipsForExport.size === 0) return;

    setIsProcessing(true);
    try {
      const selectedClips = video.clips
        .filter((clip) => selectedClipsForExport.has(clip.id))
        .map((clip) => ({
          start: clip.start,
          end: clip.end
        }));

      const response = await fetch('/api/clips/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: video.id,
          s3Key: video.s3Key,
          selectedClips,
          targetLanguage: targetLanguage === 'none' ? null : targetLanguage,
          aspectRatio
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start clip processing');
      }

      toast({
        title: 'Success!',
        description: 'Clip processing started. Check the Exported tab soon.'
      });

      setIsConfigModalOpen(false);
      setSelectedClipsForExport(new Set());
      setTargetLanguage('none');
      setAspectRatio('9:16');
    } catch (error) {
      console.error('Error processing clips:', error);
      toast({
        title: 'Error',
        description: 'Failed to start clip processing',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchExportedClips = async () => {
    if (!params.id) return;

    setIsLoadingExported(true);
    try {
      const response = await fetch(`/api/clips/videos/${params.id}/exported`);
      if (!response.ok) throw new Error('Failed to fetch exported clips');

      const data = await response.json();

      // Match exported clips with original clips based on start/end times
      const enrichedExportedClips = (data.exportedClips || []).map(
        (exportedClip: ExportedClip) => {
          const matchingOriginalClip = video?.clips.find(
            (clip) =>
              clip.start === exportedClip.start && clip.end === exportedClip.end
          );
          return {
            ...exportedClip,
            originalClip: matchingOriginalClip
          };
        }
      );

      setExportedClips(enrichedExportedClips);

      // Select the first clip by default if available
      if (enrichedExportedClips && enrichedExportedClips.length > 0) {
        setSelectedExportedClip(enrichedExportedClips[0]);
      }
    } catch (error) {
      console.error('Error fetching exported clips:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exported clips',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingExported(false);
    }
  };

  const getSignedUrl = async (s3Key: string, clipId: string) => {
    try {
      // Check if we already have a URL for this clip
      if (clipVideoUrls[clipId]) {
        return clipVideoUrls[clipId];
      }

      const response = await fetch(`/api/clips/videos/${params.id}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ s3Key })
      });

      if (!response.ok) throw new Error('Failed to get signed URL');

      const data = await response.json();

      // Cache the URL
      setClipVideoUrls((prev) => ({
        ...prev,
        [clipId]: data.url
      }));

      return data.url;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate download URL',
        variant: 'destructive'
      });
      return null;
    }
  };

  const handleDownloadClip = async (clip: ExportedClip) => {
    const url = await getSignedUrl(clip.s3Key, clip.id);
    if (url) {
      window.open(url, '_blank');
    }
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
        <Tabs defaultValue='clips' className='w-full'>
          <div className='mb-4 flex items-center justify-between'>
            <TabsList>
              <TabsTrigger value='clips'>Identified Clips</TabsTrigger>
              <TabsTrigger value='exported' onClick={fetchExportedClips}>
                Exported ({exportedClips.length})
              </TabsTrigger>
            </TabsList>

            <Button
              onClick={handleGenerateShorts}
              disabled={selectedClipsForExport.size === 0}
              size='sm'
            >
              <Sparkles className='mr-2 h-4 w-4' />
              Generate Shorts ({selectedClipsForExport.size})
            </Button>
          </div>

          <TabsContent value='clips'>
            <div className='grid h-[calc(100vh-300px)] grid-cols-1 gap-6 lg:grid-cols-3'>
              {/* Clips List */}
              <div className='flex h-full flex-col lg:col-span-1'>
                <div className='flex-1 space-y-3 overflow-y-auto pr-2'>
                  {video.clips.map((clip) => (
                    <Card
                      key={clip.id}
                      className={`transition-all ${
                        selectedClip?.id === clip.id
                          ? 'ring-primary shadow-md ring-2'
                          : 'hover:shadow-md'
                      }`}
                    >
                      <CardHeader className='p-4 pb-2'>
                        <div className='flex items-start gap-3'>
                          <Checkbox
                            checked={selectedClipsForExport.has(clip.id)}
                            onCheckedChange={() => toggleClipSelection(clip.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div
                            className='flex-1 cursor-pointer'
                            onClick={() => setSelectedClip(clip)}
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <CardTitle className='line-clamp-2 text-base'>
                                {clip.title}
                              </CardTitle>
                              <Badge
                                variant='secondary'
                                className='flex-shrink-0'
                              >
                                <TrendingUp className='mr-1 h-3 w-3' />
                                {clip.viralityScore}
                              </Badge>
                            </div>
                            <CardDescription className='mt-1 text-xs'>
                              {formatTime(clip.start)} - {formatTime(clip.end)}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className='p-4 pt-0 pl-14'>
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
                          <Badge
                            variant='default'
                            className='px-3 py-1 text-base'
                          >
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
          </TabsContent>

          <TabsContent value='exported' className='mt-0'>
            {isLoadingExported ? (
              <div className='flex h-96 items-center justify-center'>
                <Loader2 className='h-8 w-8 animate-spin' />
              </div>
            ) : exportedClips.length === 0 ? (
              <Card>
                <CardContent className='flex flex-col items-center justify-center py-16'>
                  <Download className='text-muted-foreground mb-4 h-16 w-16' />
                  <h3 className='mb-2 text-xl font-semibold'>
                    No exported clips yet
                  </h3>
                  <p className='text-muted-foreground'>
                    Select clips and generate shorts to see them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
                {/* LEFT: Clips List with Titles */}
                <div className='lg:col-span-3'>
                  <div
                    className='scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent space-y-3 overflow-y-auto pr-2'
                    style={{ maxHeight: 'calc(100vh - 280px)' }}
                  >
                    {exportedClips.map((clip, index) => (
                      <Card
                        key={clip.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedExportedClip?.id === clip.id
                            ? 'border-primary bg-primary/5 ring-primary ring-1'
                            : 'hover:border-primary/50 hover:shadow-md'
                        }`}
                        onClick={() => setSelectedExportedClip(clip)}
                      >
                        <CardHeader className='p-4'>
                          <div className='flex items-start gap-3'>
                            <div className='bg-primary/10 text-primary flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
                              {index + 1}
                            </div>
                            <div className='flex-1 overflow-hidden'>
                              <CardTitle className='line-clamp-2 text-sm leading-snug'>
                                {clip.originalClip?.title || 'Exported Clip'}
                              </CardTitle>
                              <CardDescription className='mt-1 text-xs'>
                                {formatTime(clip.start)} -{' '}
                                {formatTime(clip.end)}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className='px-4 pt-0 pb-4'>
                          <div className='flex items-center gap-2'>
                            <Badge variant='secondary' className='text-xs'>
                              {clip.aspectRatio}
                            </Badge>
                            {clip.targetLanguage && (
                              <Badge variant='outline' className='text-xs'>
                                {clip.targetLanguage}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* MIDDLE: Video Player and Preview */}
                <div className='lg:col-span-5'>
                  {selectedExportedClip && (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='text-lg'>
                          {selectedExportedClip.originalClip?.title ||
                            'Video Preview'}
                        </CardTitle>
                        <CardDescription>
                          Duration: {formatTime(selectedExportedClip.start)} -{' '}
                          {formatTime(selectedExportedClip.end)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='space-y-4'>
                        {/* Video Player */}
                        <div
                          className='relative mx-auto w-full overflow-hidden rounded-lg bg-black'
                          style={{
                            maxWidth:
                              selectedExportedClip.aspectRatio === '9:16'
                                ? '360px'
                                : selectedExportedClip.aspectRatio === '1:1'
                                  ? '450px'
                                  : '100%',
                            aspectRatio:
                              selectedExportedClip.aspectRatio === '9:16'
                                ? '9/16'
                                : selectedExportedClip.aspectRatio === '1:1'
                                  ? '1/1'
                                  : '16/9'
                          }}
                        >
                          {clipVideoUrls[selectedExportedClip.id] ? (
                            <video
                              key={selectedExportedClip.id}
                              src={clipVideoUrls[selectedExportedClip.id]}
                              controls
                              className='h-full w-full'
                              autoPlay
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className='flex h-full w-full flex-col items-center justify-center gap-3'>
                              <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                              <Button
                                variant='secondary'
                                onClick={() =>
                                  getSignedUrl(
                                    selectedExportedClip.s3Key,
                                    selectedExportedClip.id
                                  )
                                }
                              >
                                Load Video
                              </Button>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Download Button */}
                        <Button
                          className='w-full'
                          size='lg'
                          onClick={() =>
                            handleDownloadClip(selectedExportedClip)
                          }
                        >
                          <Download className='mr-2 h-5 w-5' />
                          Download Clip
                        </Button>

                        {/* Metadata */}
                        <div className='grid grid-cols-2 gap-3 pt-2'>
                          <div className='bg-muted rounded-lg p-3'>
                            <p className='text-muted-foreground mb-1 text-xs font-medium'>
                              Aspect Ratio
                            </p>
                            <p className='text-sm font-semibold'>
                              {selectedExportedClip.aspectRatio}
                            </p>
                          </div>
                          <div className='bg-muted rounded-lg p-3'>
                            <p className='text-muted-foreground mb-1 text-xs font-medium'>
                              Language
                            </p>
                            <p className='text-sm font-semibold'>
                              {selectedExportedClip.targetLanguage ||
                                'Original'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* RIGHT: Clip Details (Summary, Transcript, Topics) */}
                <div className='lg:col-span-4'>
                  {selectedExportedClip &&
                    selectedExportedClip.originalClip && (
                      <Card
                        className='scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent overflow-y-auto'
                        style={{ maxHeight: 'calc(100vh - 280px)' }}
                      >
                        <CardContent className='space-y-6 p-6'>
                          {/* Viral Score */}
                          <div className='border-primary/20 from-primary/5 to-primary/10 rounded-lg border bg-gradient-to-br p-4'>
                            <div className='mb-3 flex items-center gap-2'>
                              <Sparkles className='text-primary h-5 w-5' />
                              <h3 className='text-base font-semibold'>
                                Viral Score
                              </h3>
                            </div>
                            <div className='flex items-baseline gap-2'>
                              <span className='text-primary text-4xl font-bold'>
                                {
                                  selectedExportedClip.originalClip
                                    .viralityScore
                                }
                              </span>
                              <span className='text-muted-foreground text-lg'>
                                /10
                              </span>
                            </div>
                            <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
                              {selectedExportedClip.originalClip.summary}
                            </p>
                          </div>

                          {/* Related Topics */}
                          {selectedExportedClip.originalClip.relatedTopics &&
                            selectedExportedClip.originalClip.relatedTopics
                              .length > 0 && (
                              <div>
                                <h3 className='mb-3 text-base font-semibold'>
                                  Related Topics
                                </h3>
                                <div className='flex flex-wrap gap-2'>
                                  {selectedExportedClip.originalClip.relatedTopics.map(
                                    (topic, idx) => (
                                      <Badge
                                        key={idx}
                                        variant='secondary'
                                        className='rounded-full px-3 py-1 text-xs'
                                      >
                                        {topic}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          <Separator />

                          {/* Transcript */}
                          <div>
                            <h3 className='mb-3 text-base font-semibold'>
                              Transcript
                            </h3>
                            <div className='rounded-lg bg-black/30 p-4'>
                              <p className='text-sm leading-relaxed whitespace-pre-wrap text-gray-300'>
                                {selectedExportedClip.originalClip.transcript}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Fallback if no original clip data */}
                  {selectedExportedClip &&
                    !selectedExportedClip.originalClip && (
                      <Card>
                        <CardContent className='flex flex-col items-center justify-center py-16'>
                          <p className='text-muted-foreground text-center text-sm'>
                            Additional clip details are not available for this
                            exported clip.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Config Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Configuration</DialogTitle>
            <DialogDescription>
              Configure the settings for your exported clips
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='aspect-ratio'>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger id='aspect-ratio'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1:1'>1:1 (Square)</SelectItem>
                  <SelectItem value='16:9'>16:9 (Landscape)</SelectItem>
                  <SelectItem value='9:16'>9:16 (Portrait/Stories)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='target-language'>
                Target Language (Optional)
              </Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id='target-language'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None (Original)</SelectItem>
                  <SelectItem value='en'>English</SelectItem>
                  <SelectItem value='es'>Spanish</SelectItem>
                  <SelectItem value='fr'>French</SelectItem>
                  <SelectItem value='de'>German</SelectItem>
                  <SelectItem value='hi'>Hindi</SelectItem>
                  <SelectItem value='ja'>Japanese</SelectItem>
                  <SelectItem value='ko'>Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='bg-muted rounded-lg p-4 text-sm'>
              <p className='mb-2 font-semibold'>
                Selected Clips: {selectedClipsForExport.size}
              </p>
              <p className='text-muted-foreground'>
                Subtitles and styling will be applied automatically
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExportClips} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Generate Clips
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
