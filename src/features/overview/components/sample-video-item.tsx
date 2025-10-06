'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check, Play } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useVideoPlayerStore } from '../store/video-player-store';

interface SampleVideoItemProps {
  video: {
    id: string;
    url: string;
    thumbnail: string;
    title: string;
  };
}

export function SampleVideoItem({ video }: SampleVideoItemProps) {
  const [copied, setCopied] = useState(false);
  const { selectedVideoId, setSelectedVideoId } = useVideoPlayerStore();
  const isSelected = selectedVideoId === video.id;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(video.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePlay = () => {
    setSelectedVideoId(video.id);
  };

  return (
    <div
      className={`hover:bg-muted/50 flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors ${
        isSelected ? 'bg-primary/5 ring-primary/20 ring-1' : ''
      }`}
      onClick={handlePlay}
    >
      <div className='relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg'>
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className='object-cover'
          unoptimized
        />
        {!isSelected && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity hover:opacity-100'>
            <Play className='h-6 w-6 text-white' fill='white' />
          </div>
        )}
      </div>
      <div className='flex-1 space-y-1'>
        <p className='line-clamp-2 text-sm leading-tight font-medium'>
          {video.title}
        </p>
      </div>
      <Button
        variant='outline'
        size='sm'
        onClick={handleCopy}
        className='flex-shrink-0'
      >
        {copied ? (
          <>
            <Check className='mr-1 h-3 w-3' />
            Copied
          </>
        ) : (
          <>
            <Copy className='mr-1 h-3 w-3' />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
