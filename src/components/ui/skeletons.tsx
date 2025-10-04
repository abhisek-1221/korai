import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './card';
import { ScrollArea } from './scroll-area';

// Video loading skeleton component
export const VideoSkeleton = () => (
  <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900'>
    <CardContent className='p-4'>
      <div className='mb-4 flex items-center justify-center'>
        <div className='flex items-center gap-2'>
          <div className='h-2 w-2 animate-bounce rounded-full bg-blue-400'></div>
          <div
            className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
            style={{ animationDelay: '0.2s' }}
          ></div>
          <span className='ml-2 text-sm text-zinc-400'>
            Loading video details...
          </span>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-[1fr,2fr]'>
        <div className='relative aspect-video animate-[shimmer_2s_infinite] overflow-hidden rounded-lg bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
        <div className='space-y-3'>
          <div className='h-6 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          <div className='h-4 w-2/3 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          <div className='flex flex-wrap gap-2'>
            <div className='h-6 w-24 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
            <div className='h-6 w-20 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
            <div className='h-6 w-16 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          </div>
          <div className='space-y-2'>
            <div className='h-4 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
            <div className='h-4 w-4/5 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Quiz generation skeleton component
export const QuizSkeleton = ({
  questionsCount = 3
}: {
  questionsCount?: number;
}) => (
  <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900'>
    <CardContent className='p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='h-6 w-32 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          <div className='flex items-center gap-2'>
            <div className='h-2 w-2 animate-bounce rounded-full bg-blue-400'></div>
            <div
              className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div
              className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
              style={{ animationDelay: '0.2s' }}
            ></div>
            <span className='ml-1 text-sm text-zinc-400'>
              Generating quiz...
            </span>
          </div>
        </div>
        <div className='flex gap-2'>
          <div className='h-8 w-8 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          <div className='h-8 w-8 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
          <div className='h-8 w-8 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
        </div>
      </div>

      <ScrollArea className='h-[400px] overflow-y-auto'>
        <div className='space-y-6'>
          {Array.from({ length: questionsCount }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className='rounded-lg border border-zinc-700 bg-zinc-800/30 p-4'
            >
              <div className='mb-3 flex items-start gap-2'>
                <div className='h-6 w-8 animate-[shimmer_2s_infinite] rounded-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%] px-2 py-1 text-sm font-medium text-transparent'>
                  {index + 1}
                </div>
                <div className='h-5 flex-1 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
              </div>

              <div className='space-y-2'>
                {Array.from({ length: 4 }).map((_, optionIndex) => (
                  <div
                    key={optionIndex}
                    className='w-full rounded-md border border-zinc-600 bg-zinc-700/50 p-3'
                  >
                    <div className='flex items-center gap-2'>
                      <div className='h-4 w-4 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
                      <div className='h-4 flex-1 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      <div className='mt-4 flex justify-center'>
        <div className='h-10 w-32 animate-[shimmer_2s_infinite] rounded bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 bg-[length:200%_100%]'></div>
      </div>
    </CardContent>
  </Card>
);

// Loading dots component that can be reused
export const LoadingDots = ({ text = 'Loading...' }: { text?: string }) => (
  <div className='flex items-center gap-2'>
    <div className='h-2 w-2 animate-bounce rounded-full bg-blue-400'></div>
    <div
      className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
      style={{ animationDelay: '0.1s' }}
    ></div>
    <div
      className='h-2 w-2 animate-bounce rounded-full bg-blue-400'
      style={{ animationDelay: '0.2s' }}
    ></div>
    <span className='ml-2 text-sm text-zinc-400'>{text}</span>
  </div>
);
