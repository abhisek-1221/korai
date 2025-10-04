import React from 'react';
import { Card } from '../ui/card';
import {
  Clock,
  Eye,
  Zap,
  Timer,
  ScanSearch,
  Languages,
  Volleyball,
  List,
  Download,
  BarChart2,
  PieChart,
  Activity,
  Mic,
  Bot
} from 'lucide-react';

interface FeatureCardProps {
  type:
    | 'analyze'
    | 'transcribe'
    | 'summarize'
    | 'compare'
    | 'stats'
    | 'quiz'
    | 'voice-chat';
}

const object = {
  analyze: {
    heading: 'Playlist Analyzer',
    subheading: 'Analyze and filter your playlist',
    value: 'including duration, views, and more.',
    caption:
      'Enter your playlist ID below to get started with detailed analytics',
    fh1: 'Duration Analysis',
    fc1: 'Track total watching time',
    fh2: 'Search & Filter',
    fc2: 'Filter by query, range, and more',
    fh3: 'Playback Control',
    fc3: 'Adjust playback speed',
    icons: [Clock, Eye, Zap]
  },
  transcribe: {
    heading: 'Transcript Generator',
    subheading: 'Generate transcripts from YouTube videos',
    value: 'with timestamps and more.',
    caption: 'Enter a YouTube video URL to get started with transcription',
    fh1: 'Timestamps',
    fc1: 'Get timestamps for each segment',
    fh2: 'Search & Filter',
    fc2: 'Filter timestamps by query',
    fh3: 'Export and Translate',
    fc3: 'Export to text, translate to other languages',
    icons: [Timer, ScanSearch, Languages]
  },
  summarize: {
    heading: 'Summarization Tool',
    subheading: 'Summarize text and videos',
    value: 'with multiple GenAI models.',
    caption: 'Enter YouTube video URL to get started with summarization',
    fh1: 'Summarize Video',
    fc1: 'Summarize video content',
    fh2: 'Detailed Insights',
    fc2: 'Get detailed insights on video',
    fh3: 'Export and Share',
    fc3: 'Export to text, share with others',
    icons: [Volleyball, List, Download]
  },
  compare: {
    heading: 'Video Comparison',
    subheading: 'Compare any two YouTube videos',
    value: 'with detailed analytics and insights.',
    caption: 'Enter two YouTube URLs below to start comparing',
    fh1: 'Engagement Stats',
    fc1: 'Compare views, likes, and comments',
    fh2: 'Visual Analysis',
    fc2: 'See distribution and ratios',
    fh3: 'Deep Insights',
    fc3: 'Get detailed engagement metrics',
    icons: [BarChart2, PieChart, Activity]
  },
  stats: {
    heading: 'Channel Analytics',
    subheading: 'Deep dive into channel statistics',
    value: 'with AI-powered insights and trends.',
    caption: 'Enter your YouTube channel URL below to analyze performance',
    fh1: 'Engagement Metrics',
    fc1: 'Track views, subs, and revenue',
    fh2: 'Content Analysis',
    fc2: 'Compare shorts vs long form',
    fh3: 'Growth Trends',
    fc3: 'View historical performance',
    icons: [BarChart2, PieChart, Activity]
  },
  quiz: {
    heading: 'Quiz Generator',
    subheading: 'Generate interactive quizzes from videos',
    value: 'with AI-powered multiple choice questions.',
    caption: 'Enter YouTube video URL to create an interactive quiz',
    fh1: 'Smart Questions',
    fc1: 'Generate MCQs from video content',
    fh2: 'Interactive Quiz',
    fc2: 'Take quiz with instant scoring',
    fh3: 'Export Results',
    fc3: 'Download quiz and share results',
    icons: [BarChart2, PieChart, Activity]
  },
  'voice-chat': {
    heading: 'Multilingual Voice Agent',
    subheading: 'Speak in your language and get voice responses',
    value: 'about YouTube videos.',
    caption: 'Enter a YouTube video URL to start a voice conversation',
    fh1: 'Voice Input',
    fc1: 'Use your voice to ask questions',
    fh2: 'Multilingual Support',
    fc2: 'Supports multiple languages for input and output',
    fh3: 'AI-Powered Responses',
    fc3: 'Get intelligent answers from an AI agent',
    icons: [Mic, Languages, Bot]
  }
};

const FeatureCard = ({ type }: FeatureCardProps) => {
  const content = object[type];
  const [Icon1, Icon2, Icon3] = [...content.icons];

  return (
    <div className='my-6 text-center sm:my-8 md:my-10 lg:my-12'>
      <h1 className='mb-1 text-lg font-semibold sm:mb-2 sm:text-xl md:text-2xl lg:text-3xl'>
        {content.heading}
      </h1>
      <h2 className='mb-2 text-base text-zinc-400 sm:mb-3 sm:text-lg md:mb-4 md:text-xl lg:text-2xl'>
        {content.subheading}
      </h2>
      <p className='mb-4 px-2 text-xs text-zinc-500 sm:mb-6 sm:px-4 sm:text-sm md:mb-8 md:text-base'>
        {content.caption}
        <br />
        {content.value}
      </p>

      {/* Feature Cards */}
      <div className='mx-auto mt-8 grid w-full grid-cols-1 gap-3 px-4 sm:mt-12 sm:w-5/6 sm:grid-cols-2 sm:gap-4 sm:px-6 md:mt-16 md:w-4/5 md:px-8 lg:mt-32 lg:w-3/4 lg:grid-cols-3 lg:px-10'>
        <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900 p-3 sm:p-4'>
          <div className='mt-1 flex space-x-2 sm:mt-2 sm:space-x-3'>
            <Icon1 className='mb-1 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5' />
            <h3 className='mb-1 text-sm font-medium sm:text-base'>
              {content.fh1}
            </h3>
          </div>
          <p className='ml-6 text-xs text-zinc-400 sm:ml-8 sm:text-sm'>
            {content.fc1}
          </p>
        </Card>

        <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900 p-3 sm:p-4'>
          <div className='mt-1 flex space-x-2 sm:mt-2 sm:space-x-3'>
            <Icon2 className='mb-1 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5' />
            <h3 className='mb-1 text-sm font-medium sm:text-base'>
              {content.fh2}
            </h3>
          </div>
          <p className='ml-6 text-xs text-zinc-400 sm:ml-8 sm:text-sm'>
            {content.fc2}
          </p>
        </Card>

        <Card className='border-zinc-700 bg-gradient-to-br from-stone-700 via-transparent to-gray-900 p-3 sm:col-span-2 sm:p-4 lg:col-span-1'>
          <div className='mt-1 flex space-x-2 sm:mt-2 sm:space-x-3'>
            <Icon3 className='mb-1 h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5' />
            <h3 className='mb-1 text-sm font-medium sm:text-base'>
              {content.fh3}
            </h3>
          </div>
          <p className='ml-6 text-xs text-zinc-400 sm:ml-8 sm:text-sm'>
            {content.fc3}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FeatureCard;
