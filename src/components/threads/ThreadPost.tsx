'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

interface ThreadPostProps {
  post: number;
  total: number;
  content: string;
  index: number;
  isConnected?: boolean;
  thumbnail?: string;
}

export default function ThreadPost({
  post,
  total,
  content,
  index,
  isConnected = true,
  thumbnail
}: ThreadPostProps) {
  const [isHovered, setIsHovered] = useState(false);
  const characterCount = content.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className='relative'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thread connector line */}
      {isConnected && post < total && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 0.8, delay: index * 0.15 + 0.3 }}
          className='absolute top-16 left-6 z-0 w-0.5 bg-gradient-to-b from-zinc-600 to-zinc-700'
        />
      )}

      <motion.div
        className='relative z-10 rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-4 backdrop-blur-sm transition-all duration-300 hover:border-zinc-600/50'
        whileHover={{
          scale: 1.02,
          y: -5,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className='mb-3 flex items-start justify-between'>
          <div className='flex items-center space-x-3'>
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <Avatar className='h-10 w-10 border-2 border-zinc-600'>
                <AvatarImage src='https://github.com/abhisek-1221.png' />
                <AvatarFallback>YT</AvatarFallback>
              </Avatar>
            </motion.div>
            <div>
              <div className='flex items-center space-x-2'>
                <span className='font-semibold text-white'>sek</span>
                <div className='flex h-4 w-4 items-center justify-center rounded-full bg-blue-500'>
                  <span className='text-xs text-white'>✓</span>
                </div>
                <span className='text-sm text-zinc-400'>@Abhisektwts</span>
                <span className='text-sm text-zinc-500'>·</span>
                <span className='text-sm text-zinc-500'>now</span>
              </div>
            </div>
          </div>

          {/* Thread indicator */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.15 + 0.2 }}
            className='rounded-full bg-gradient-to-r from-red-600 to-red-700 px-3 py-1 text-xs font-medium text-white shadow-lg'
          >
            {post}/{total}
          </motion.div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: index * 0.15 + 0.4 }}
          className='mb-4 text-[15px] leading-relaxed text-white'
        >
          {content}
        </motion.div>

        {/* Thumbnail for first post */}
        {thumbnail && post === 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: index * 0.15 + 0.5 }}
            className='mb-4 overflow-hidden rounded-xl border border-zinc-700/50'
          >
            <img
              src={thumbnail}
              alt='Video thumbnail'
              className='h-48 w-full object-cover transition-transform duration-300 hover:scale-105'
            />
          </motion.div>
        )}

        {/* Character count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: index * 0.15 + 0.6 }}
          className='flex justify-end border-t border-zinc-700/50 pt-2'
        >
          <div
            className={`rounded-full px-2 py-1 text-xs ${
              characterCount > 250
                ? 'bg-red-500/20 text-red-400'
                : characterCount > 200
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
            }`}
          >
            {characterCount}/280
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
