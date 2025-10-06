'use client';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaGraph } from './area-graph';
import { BarGraph } from './bar-graph';
import { PieGraph } from './pie-graph';
import { RecentSales } from './recent-sales';
import { Scissors, MessageSquare, FileText, BrainCircuit } from 'lucide-react';
import { useRouter } from 'next/navigation';

const features = [
  {
    title: 'Generate Viral Shorts',
    description: 'AI-powered clip identification',
    icon: Scissors,
    href: '/dashboard/clips',
    gradient: 'from-purple-500/10 to-pink-500/10'
  },
  {
    title: 'Clip to Quiz',
    description: 'Create interactive quizzes',
    icon: BrainCircuit,
    href: '/dashboard/quiz',
    gradient: 'from-blue-500/10 to-cyan-500/10'
  },
  {
    title: 'Chat with Video',
    description: 'AI-powered conversations',
    icon: MessageSquare,
    href: '/dashboard/chat',
    gradient: 'from-green-500/10 to-emerald-500/10'
  },
  {
    title: 'Transcribe Video',
    description: 'Extract text from videos',
    icon: FileText,
    href: '/dashboard/transcribe',
    gradient: 'from-orange-500/10 to-yellow-500/10'
  }
];

export default function OverViewPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-2'>
        <div className='flex items-center justify-between space-y-2'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Hi, Welcome back 👋
          </h2>
          <div className='hidden items-center space-x-2 md:flex'>
            <Button>Download</Button>
          </div>
        </div>
        <Tabs defaultValue='overview' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='overview'>Overview</TabsTrigger>
            <TabsTrigger value='analytics' disabled>
              Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4'>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className={`cursor-pointer bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg ${feature.gradient}`}
                    onClick={() => router.push(feature.href)}
                  >
                    <CardHeader className='space-y-4'>
                      <div className='bg-background/80 flex h-12 w-12 items-center justify-center rounded-xl'>
                        <Icon className='text-primary h-6 w-6' />
                      </div>
                      <div className='space-y-1.5'>
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
                );
              })}
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
              <div className='col-span-4'>
                <BarGraph />
              </div>
              <Card className='col-span-4 md:col-span-3'>
                <RecentSales />
              </Card>
              <div className='col-span-4'>
                <AreaGraph />
              </div>
              <div className='col-span-4 md:col-span-3'>
                <PieGraph />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
