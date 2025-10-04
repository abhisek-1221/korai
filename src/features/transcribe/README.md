# Transcribe Feature

A clean, modular implementation of the YouTube video transcription feature using Zustand for state management.

## Structure

```
features/transcribe/
├── components/
│   └── transcribe-view-page.tsx    # Main component
├── hooks/
│   ├── index.ts                     # Exports all hooks
│   ├── use-fetch-transcript.ts      # API calls for fetching transcripts
│   ├── use-youtube-player.ts        # YouTube iframe API management
│   └── use-transcript-download.ts   # Download functionality (TXT, SRT)
└── store/
    └── transcribe-store.ts          # Zustand store for state management
```

## Key Features

### 1. **Zustand Store** (`transcribe-store.ts`)
- Centralized state management for all transcribe-related data
- Clean separation of state and actions
- Easy to test and maintain

### 2. **Custom Hooks**

#### `useFetchTranscript`
- Handles API calls to fetch video details and transcripts
- Manages loading and error states
- Processes transcript data into normalized format

#### `useYoutubePlayer`
- Manages YouTube IFrame API lifecycle
- Ensures script is loaded only once
- Provides methods to initialize and control the player
- Fixes the black iframe issue by properly handling API loading

#### `useTranscriptDownload`
- Provides download functionality for transcripts
- Supports multiple formats: TXT (full), TXT (timestamped), SRT
- Clean file handling with proper cleanup

### 3. **Component** (`transcribe-view-page.tsx`)
- Clean, readable component focused on presentation
- Uses custom hooks for all logic
- Memoized computed values for performance
- Proper lifecycle management for YouTube player

## YouTube Player Fix

The black iframe issue was fixed by:
1. **Proper script loading**: Only loads the YouTube API script once
2. **State tracking**: Tracks both script load and API ready states
3. **Key prop**: Uses video ID as key to force re-render on video change
4. **Delayed initialization**: Waits for DOM element to be ready before initializing
5. **Using div instead of iframe**: Lets YouTube API create the iframe properly

## Usage

```tsx
import TranscribeViewPage from '@/features/transcribe/components/transcribe-view-page';

export default function Page() {
  return <TranscribeViewPage />;
}
```

## State Management

Access the store directly if needed:
```tsx
import { useTranscribeStore } from '@/features/transcribe/store/transcribe-store';

const { videoDetails, transcriptData } = useTranscribeStore();
```

## Benefits

1. **Separation of Concerns**: Logic is separated into focused hooks
2. **Reusability**: Hooks can be used in other components if needed
3. **Testability**: Each hook can be tested independently
4. **Maintainability**: Clear structure makes updates easier
5. **Performance**: Memoized values prevent unnecessary re-renders
6. **Type Safety**: Full TypeScript support with proper types
