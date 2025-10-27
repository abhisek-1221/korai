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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Users, Clock, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranscriptionStore } from '@/features/transcription/store/transcription-store';
import PageContainer from '@/components/layout/page-container';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function TranscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);

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

  useEffect(() => {
    fetchTranscription();
    return () => reset();
  }, [params.id]);

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

  // Get unique speakers
  const uniqueSpeakers = transcription
    ? Array.from(new Set(transcription.segments.map((s) => s.speaker))).sort()
    : [];

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
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-16'>
              <p className='text-muted-foreground mb-4'>
                Transcription not found
              </p>
              <Button
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
      <div className='container mx-auto max-h-screen overflow-y-auto px-4 py-6'>
        <div className='mb-6'>
          <Button
            variant='ghost'
            onClick={() => router.push('/dashboard/transcription/list')}
            className='mb-4'
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to List
          </Button>
          <div className='flex items-start justify-between'>
            <div>
              <h1 className='mb-2 text-3xl font-bold tracking-tight'>
                Video Transcription
              </h1>
              <p className='text-muted-foreground'>
                {transcription.segments.length} segments
              </p>
            </div>
            <Button onClick={() => setIsSpeakerModalOpen(true)}>
              <Users className='mr-2 h-4 w-4' />
              Assign Speakers
            </Button>
          </div>
        </div>

        {/* Transcription Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
            <CardDescription>
              Timestamped dialogue with speaker identification
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {transcription.segments.map((segment) => (
              <div
                key={segment.id}
                className='border-border border-b pb-4 last:border-0 last:pb-0'
              >
                <div className='mb-2 flex items-center gap-3'>
                  <Badge variant='outline' className='font-mono text-xs'>
                    <Clock className='mr-1 h-3 w-3' />
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </Badge>
                  <Badge variant='secondary'>
                    <Users className='mr-1 h-3 w-3' />
                    {segment.speakerName || segment.speaker}
                  </Badge>
                </div>
                <p className='text-sm leading-relaxed'>{segment.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Speaker Assignment Modal */}
        <Dialog open={isSpeakerModalOpen} onOpenChange={setIsSpeakerModalOpen}>
          <DialogContent className='max-w-2xl'>
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
              <Button onClick={handleSaveSpeakers} disabled={isSaving}>
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
