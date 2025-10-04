'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FancyButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  success?: boolean;
  label: string;
}

export const FancyButton = ({
  onClick,
  loading = false,
  success = false,
  label
}: FancyButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyles = {
    background: `linear-gradient(to bottom, rgb(255, 87, 34), rgb(211, 47, 47))`,
    boxShadow: `0 2px 8px 0 rgba(211, 47, 47, 0.35), 0 1.5px 0 0 rgba(255,255,255,0.25) inset, 0 -2px 8px 0 rgba(211, 47, 47, 0.5) inset`
  };

  return (
    <motion.button
      className={cn(
        'relative flex h-10 items-center justify-center overflow-hidden rounded-full px-6 font-medium text-white',
        'transition-all duration-200 active:scale-[0.98]',
        {
          'hover:scale-[1.02]': !loading && !success,
          'cursor-not-allowed opacity-50': loading || success
        }
      )}
      style={buttonStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      disabled={loading || success}
    >
      <AnimatePresence mode='wait' initial={false}>
        {loading ? (
          <motion.div
            key='loading'
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className='absolute'
          >
            <Loader2 className='h-4 w-4 animate-spin' />
          </motion.div>
        ) : success ? (
          <motion.div
            key='success'
            className='absolute inset-0 flex items-center justify-center bg-green-500'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.4,
                type: 'spring',
                stiffness: 200
              }}
            >
              <Check className='h-4 w-4' strokeWidth={3} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.span
            key='label'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
<style jsx>{`
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`}</style>;
