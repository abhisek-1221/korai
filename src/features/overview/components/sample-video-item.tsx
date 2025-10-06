'use client';

import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(video.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className='flex items-center gap-4'>
      <div className='relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg'>
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className='object-cover'
          unoptimized
        />
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
