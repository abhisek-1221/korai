'use client';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import React from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Generate Viral Shorts',
    description: 'AI-powered clip identification',
    iconPath: '/icons/clips.png',
    href: '/dashboard/clips'
  },
  {
    title: 'Clip to Quiz',
    description: 'Create interactive quizzes',
    iconPath: '/icons/quiz.png',
    href: '/dashboard/quiz'
  },
  {
    title: 'Chat with Video',
    description: 'AI-powered conversations',
    iconPath: '/icons/chat.png',
    href: '/dashboard/chat'
  },
  {
    title: 'Transcribe Video',
    description: 'Extract text from videos',
    iconPath: '/icons/transcript.png',
    href: '/dashboard/transcribe'
  }
];

export default function OverViewLayout({
  sales,
  bar_stats
}: {
  sales: React.ReactNode;
  bar_stats: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Hi, Welcome back 👋
          </h2>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {features.map((feature, index) => (
            <Card
              key={index}
              className='cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg'
              onClick={() => router.push(feature.href)}
            >
              <CardHeader className='space-y-4'>
                <div className='flex w-full items-center justify-center py-4'>
                  <Image
                    src={feature.iconPath}
                    alt={feature.title}
                    width={80}
                    height={80}
                    className='object-contain'
                  />
                </div>
                <div className='space-y-1.5 text-center'>
                  <CardTitle className='text-xl font-semibold'>
                    {feature.title}
                  </CardTitle>
                  <CardDescription className='text-sm'>
                    {feature.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                <Button variant='ghost' className='w-full'>
                  Try Now →
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <div className='col-span-1'>{bar_stats}</div>
          <div className='col-span-1'>
            {/* sales parallel routes */}
            {sales}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
