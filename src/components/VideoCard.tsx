'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { VideoItem } from '@/lib/youtube';
import { ThumbsUp, Eye, Calendar, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { formatDuration, formatNumber } from '@/lib/ythelper';

interface VideoCardProps {
  video: VideoItem;
  searchQuery: string;
}

export function VideoCard({ video, searchQuery }: VideoCardProps) {
  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <span key={index} className='bg-yellow-800'>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className='h-full'
    >
      <Card className='h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
        <div className='relative'>
          <img
            src={video.thumbnails.medium.url || '/placeholder.svg'}
            alt={video.title}
            className='h-48 w-full object-cover'
          />
          <div className='bg-opacity-70 absolute right-2 bottom-2 rounded bg-black px-2 py-1 text-xs font-medium text-white'>
            {formatDuration(video.duration)}
          </div>
        </div>
        <CardContent className='p-4'>
          <h3 className='mb-2 line-clamp-2 h-14 text-lg font-semibold'>
            {highlightText(video.title)}
          </h3>
          <div className='mt-2 flex flex-wrap gap-2'>
            <Badge variant='secondary' className='flex items-center'>
              <Eye className='mr-1 h-3 w-3 text-blue-500' />
              <span>{formatNumber(video.viewCount)}</span>
            </Badge>
            <Badge variant='secondary' className='flex items-center'>
              <ThumbsUp className='mr-1 h-3 w-3 text-green-500' />
              <span>{formatNumber(video.likeCount)}</span>
            </Badge>
            <Badge variant='secondary' className='flex items-center'>
              <Calendar className='mr-1 h-3 w-3 text-red-500' />
              <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
            </Badge>
            <Button
              variant='secondary'
              className='flex items-center space-x-1 hover:bg-blue-950'
              onClick={() =>
                window.open(
                  `https://youtube.com/watch?v=${video.id}`,
                  '_blank',
                  'noopener,noreferrer'
                )
              }
            >
              <ExternalLink className='h-3 w-3' />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
