import { FileText, Search, SquareActivity, LucideIcon } from 'lucide-react';

export interface SuggestionGroup {
  label: string;
  highlight: string;
  icon: LucideIcon;
  items: string[];
}

export const suggestionGroups: SuggestionGroup[] = [
  {
    label: 'Summary',
    highlight: 'Summarize',
    icon: FileText,
    items: [
      'Summarize this video in one or two sentences',
      'What is the central idea of the video?',
      'What are the main points or segments covered?',
      'How clearly is the message delivered overall?'
    ]
  },
  {
    label: 'Comprehension',
    highlight: 'Understand',
    icon: Search,
    items: [
      'What is the main topic or purpose of this video?',
      'What are the key takeaways?',
      'Who is the target audience?',
      'What is the creator trying to convey?'
    ]
  },
  {
    label: 'Reflect',
    highlight: 'Reflect',
    icon: SquareActivity,
    items: [
      'How did this video make you feel?',
      'Did it change your perspective on the topic?',
      'Was the video inspiring, upsetting, or neutral?',
      'What emotional tone did the speaker use?'
    ]
  }
];
