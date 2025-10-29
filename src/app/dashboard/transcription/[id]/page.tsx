'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  Users,
  Clock,
  Save,
  X,
  Search,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranscriptionStore } from '@/features/transcription/store/transcription-store';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { useYoutubePlayer } from '@/features/transcribe/hooks/use-youtube-player';
import MindmapViewer from '@/features/transcription/components/mindmap-viewer';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const videoId = url.match(
      /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/
    )?.[1];
    return videoId || null;
  } catch {
    return null;
  }
}

export default function TranscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [player, setPlayer] = useState<any>(null);
  const [showMindmap, setShowMindmap] = useState(false);

  const { isApiReady, initializePlayer, seekTo } = useYoutubePlayer();

  const {
    transcription,
    speakerMappings,
    isEditingSpeakers,
    isSaving,
    setTranscription,
    updateSpeakerMapping,
    setIsEditingSpeakers,
    setIsSaving,
    applySpeakerMappings,
    reset
  } = useTranscriptionStore();

  const videoId = useMemo(() => {
    if (!transcription?.youtubeUrl) return null;
    return getYouTubeVideoId(transcription.youtubeUrl);
  }, [transcription?.youtubeUrl]);

  useEffect(() => {
    fetchTranscription();
    return () => reset();
  }, [params.id]);

  useEffect(() => {
    if (isApiReady && videoId && !player) {
      const playerInstance = initializePlayer(
        'youtube-player',
        videoId,
        (p: any) => {
          setPlayer(p);
        }
      );
    }
  }, [isApiReady, videoId, player, initializePlayer]);

  const fetchTranscription = async () => {
    try {
      const response = await fetch(`/api/transcription/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch transcription');

      const data = await response.json();
      setTranscription(data.transcription);
    } catch (error) {
      console.error('Error fetching transcription:', error);
      toast.error('Failed to load transcription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSpeakers = async () => {
    if (!transcription) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcription/${params.id}/speakers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ speakerMappings })
      });

      if (!response.ok) {
        throw new Error('Failed to update speaker names');
      }

      // Apply optimistic updates
      applySpeakerMappings();
      setIsSpeakerModalOpen(false);
      setIsEditingSpeakers(false);
      toast.success('Speaker names updated successfully');
    } catch (error) {
      console.error('Error updating speakers:', error);
      toast.error('Failed to update speaker names');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimestampClick = useCallback(
    (startTime: number) => {
      if (player) {
        seekTo(player, Math.floor(startTime));
      }

      // Scroll to segment
      const element = document.getElementById(`segment-${startTime}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [player, seekTo]
  );

  const downloadTranscript = useCallback(() => {
    if (!transcription) return;

    const content = transcription.segments
      .map((seg) => {
        const speaker = seg.speakerName || seg.speaker;
        return `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${speaker}:\n${seg.text}\n`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${params.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [transcription, params.id]);

  // Get unique speakers
  const uniqueSpeakers = transcription
    ? Array.from(new Set(transcription.segments.map((s) => s.speaker))).sort()
    : [];

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    if (!transcription) return [];
    if (!searchQuery.trim()) return transcription.segments;

    const query = searchQuery.toLowerCase();
    return transcription.segments.filter(
      (segment) =>
        segment.text.toLowerCase().includes(query) ||
        (segment.speakerName &&
          segment.speakerName.toLowerCase().includes(query)) ||
        segment.speaker.toLowerCase().includes(query)
    );
  }, [transcription, searchQuery]);

  if (isLoading) {
    return (
      <PageContainer scrollable>
        <div className='flex h-96 items-center justify-center'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      </PageContainer>
    );
  }

  if (!transcription) {
    return (
      <PageContainer scrollable>
        <div className='container mx-auto py-10'>
          <Card className='border-zinc-800 bg-transparent'>
            <CardContent className='flex flex-col items-center justify-center py-16'>
              <p className='text-muted-foreground mb-4'>
                Transcription not found
              </p>
              <Button
                variant='outline'
                onClick={() => router.push('/dashboard/transcription/list')}
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to List
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className='w-full space-y-4'>
        <div className='flex items-start justify-between'>
          <div>
            <Button
              variant='ghost'
              onClick={() => router.push('/dashboard/transcription/list')}
              className='mb-2 px-0'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to List
            </Button>
            <Heading
              title='Video Transcription'
              description={`${transcription.segments.length} segments with speaker identification`}
            />
          </div>
          <div className='flex gap-2'>
            <Button
              variant={!showMindmap ? 'default' : 'outline'}
              onClick={() => setShowMindmap(false)}
            >
              Transcript
            </Button>
            <Button
              variant={showMindmap ? 'default' : 'outline'}
              onClick={() => setShowMindmap(true)}
            >
              Mindmap
            </Button>
          </div>
        </div>

        {/* Mindmap View */}
        {showMindmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MindmapViewer transcriptionId={params.id as string} />
          </motion.div>
        )}

        {/* Main Content Grid */}
        {!showMindmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='grid grid-cols-1 gap-4 lg:grid-cols-2'
          >
            {/* LEFT: Transcript */}
            <Card className='border-zinc-800 bg-transparent'>
              <CardContent className='p-4'>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-lg font-semibold'>
                    Transcript with Speakers
                  </h3>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='icon'
                      onClick={downloadTranscript}
                      className='rounded-full'
                    >
                      <Download className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setIsSpeakerModalOpen(true)}
                    >
                      <Users className='mr-2 h-4 w-4' />
                      Assign Speakers
                    </Button>
                  </div>
                </div>

                {/* Search Input */}
                <div className='relative mb-4'>
                  <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                  <Input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder='Search in transcript...'
                    className='pl-10'
                  />
                </div>

                <ScrollArea className='h-[400px]'>
                  <div className='space-y-3 pr-4'>
                    {filteredSegments.map((segment, index) => (
                      <motion.div
                        key={segment.id}
                        id={`segment-${segment.start}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.05
                        }}
                        className='cursor-pointer rounded-lg border border-zinc-800 bg-transparent p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50'
                        onClick={() => handleTimestampClick(segment.start)}
                      >
                        <div className='mb-2 flex items-center gap-2'>
                          <Badge
                            variant='outline'
                            className='font-mono text-xs'
                          >
                            <Clock className='mr-1 h-3 w-3' />
                            {formatTime(segment.start)} -{' '}
                            {formatTime(segment.end)}
                          </Badge>
                          <Badge className='bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'>
                            <Users className='mr-1 h-3 w-3' />
                            {segment.speakerName || segment.speaker}
                          </Badge>
                        </div>
                        <p className='text-sm leading-relaxed'>
                          {segment.text}
                        </p>
                      </motion.div>
                    ))}

                    {/* No results message */}
                    {filteredSegments.length === 0 && (
                      <div className='text-muted-foreground py-8 text-center'>
                        No matching segments found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* RIGHT: Video Player */}
            <Card className='border-zinc-800 bg-transparent'>
              <CardContent className='p-4'>
                <h3 className='mb-4 text-lg font-semibold'>Video Player</h3>

                {videoId ? (
                  <div className='relative aspect-video w-full overflow-hidden rounded-lg bg-black'>
                    <div
                      id='youtube-player'
                      className='absolute inset-0 h-full w-full'
                    />
                  </div>
                ) : (
                  <div className='flex aspect-video w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50'>
                    <p className='text-muted-foreground'>
                      Unable to load video
                    </p>
                  </div>
                )}

                {/* Speaker Summary */}
                <div className='mt-4 space-y-2'>
                  <h4 className='text-sm font-semibold'>Speakers</h4>
                  <div className='flex flex-wrap gap-2'>
                    {uniqueSpeakers.map((speaker) => (
                      <Badge
                        key={speaker}
                        variant='outline'
                        className='text-xs'
                      >
                        {speakerMappings[speaker] || speaker}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* URL */}
                <div className='mt-4'>
                  <Label className='text-muted-foreground text-xs'>
                    Source
                  </Label>
                  <a
                    href={transcription.youtubeUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-1 block truncate text-sm text-blue-400 hover:underline'
                  >
                    {transcription.youtubeUrl}
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Speaker Assignment Modal */}
        <Dialog open={isSpeakerModalOpen} onOpenChange={setIsSpeakerModalOpen}>
          <DialogContent className='max-w-2xl border-zinc-800'>
            <DialogHeader>
              <DialogTitle>Assign Speaker Names</DialogTitle>
              <DialogDescription>
                Customize speaker labels to make the transcript more readable
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              {uniqueSpeakers.map((speaker) => (
                <div key={speaker} className='space-y-2'>
                  <Label htmlFor={speaker} className='text-sm font-medium'>
                    {speaker}
                  </Label>
                  <Input
                    id={speaker}
                    value={speakerMappings[speaker] || speaker}
                    onChange={(e) =>
                      updateSpeakerMapping(speaker, e.target.value)
                    }
                    placeholder='Enter speaker name...'
                  />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsSpeakerModalOpen(false)}
                disabled={isSaving}
              >
                <X className='mr-2 h-4 w-4' />
                Cancel
              </Button>
              <Button
                variant='outline'
                onClick={handleSaveSpeakers}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='mr-2 h-4 w-4' />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
