'use client';

import { motion } from 'framer-motion';

interface ThreadSkeletonProps {
  count?: number;
}

export default function ThreadSkeleton({ count = 5 }: ThreadSkeletonProps) {
  return (
    <div className='space-y-6'>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className='relative'
        >
          {/* Thread connector line */}
          {index < count - 1 && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: '100%' }}
              transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
              className='absolute top-16 left-6 z-0 w-0.5 bg-gradient-to-b from-zinc-600 to-zinc-700'
            />
          )}

          <div className='relative z-10 rounded-2xl border border-zinc-700/50 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 p-4 backdrop-blur-sm'>
            {/* Header skeleton */}
            <div className='mb-3 flex items-start justify-between'>
              <div className='flex items-center space-x-3'>
                {/* Avatar skeleton */}
                <motion.div
                  animate={{
                    background: [
                      'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                      'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                      'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className='h-10 w-10 rounded-full border-2 border-zinc-600'
                />
                <div className='space-y-2'>
                  {/* Name skeleton */}
                  <motion.div
                    animate={{
                      background: [
                        'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                        'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                        'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                    className='h-4 w-32 rounded'
                  />
                  {/* Handle skeleton */}
                  <motion.div
                    animate={{
                      background: [
                        'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                        'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                        'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className='h-3 w-20 rounded'
                  />
                </div>
              </div>

              {/* Thread indicator skeleton */}
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%)',
                    'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #ef4444 100%)',
                    'linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%)'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className='h-6 w-12 rounded-full'
              />
            </div>

            {/* Content skeleton */}
            <div className='mb-4 space-y-2'>
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                    'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className='h-4 w-full rounded'
              />
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                    'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                className='h-4 w-4/5 rounded'
              />
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                    'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                    'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                className='h-4 w-3/4 rounded'
              />
            </div>

            {/* Action buttons skeleton */}
            <div className='flex items-center justify-between border-t border-zinc-700/50 pt-2'>
              {Array.from({ length: 5 }).map((_, buttonIndex) => (
                <motion.div
                  key={buttonIndex}
                  animate={{
                    background: [
                      'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)',
                      'linear-gradient(90deg, #52525b 0%, #71717a 50%, #52525b 100%)',
                      'linear-gradient(90deg, #3f3f46 0%, #52525b 50%, #3f3f46 100%)'
                    ]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: 0.7 + buttonIndex * 0.1
                  }}
                  className='h-8 w-12 rounded-full'
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
