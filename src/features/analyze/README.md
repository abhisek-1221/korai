# Analyze Playlist Feature

A clean, modular implementation of the YouTube playlist analyzer using Zustand for state management.

## Structure

```
features/analyze/
├── components/
│   └── analyze-view-page.tsx       # Main component
├── hooks/
│   ├── index.ts                     # Exports all hooks
│   ├── use-fetch-playlist.ts        # API calls for fetching playlist data
│   └── use-playlist-filters.ts      # Filtering, sorting, and calculations
└── store/
    └── analyze-store.ts             # Zustand store for state management
```

## Key Features

### 1. **Zustand Store** (`analyze-store.ts`)
- Centralized state management for all analyze-related data
- Manages playlist URL, data, filters, and UI states
- Clean separation of state and actions

### 2. **Custom Hooks**

#### `useFetchPlaylist`
- Handles API calls to fetch playlist data from YouTube
- Manages loading, success, and error states
- Displays appropriate toast notifications
- Auto-resets success/error states after animation

#### `usePlaylistFilters`
- Filters videos by range (start/end position)
- Filters videos by search query
- Sorts videos by multiple criteria (position, duration, views, likes, publish date)
- Calculates total and adjusted duration based on playback speed
- Generates range options for dropdowns
- All filtering/sorting logic is memoized for optimal performance

### 3. **Component** (`analyze-view-page.tsx`)
- Clean, presentation-focused component
- Uses custom hooks for all logic
- Responsive grid layout for videos
- Integrated with dashboard layout using PageContainer
- Proper state management for user interactions

## Features

### Playlist Analysis
- Fetch and display YouTube playlist information
- Show total videos and total duration
- Display video thumbnails, titles, and metadata

### Filtering & Sorting
- **Range Filter**: Select specific video range (e.g., videos 1-50)
- **Search Filter**: Search videos by title
- **Sort Options**: 
  - Position (default order)
  - Duration (longest first)
  - Views (most viewed first)
  - Likes (most liked first)
  - Publish Date (newest first)

### Playback Speed Adjustment
- Adjust playback speed from 0.25x to 2x
- Automatically recalculates total duration based on selected speed
- Useful for planning study/watch time

### Video Cards
- Displays video thumbnails
- Shows duration, views, and likes
- Highlights search query matches
- Clickable to open video

## Usage

```tsx
import AnalyzeViewPage from '@/features/analyze/components/analyze-view-page';

export default function Page() {
  return <AnalyzeViewPage />;
}
```

## State Management

Access the store directly if needed:
```tsx
import { useAnalyzeStore } from '@/features/analyze/store/analyze-store';

const { playlistData, sortedVideos } = useAnalyzeStore();
```

## Performance Optimizations

1. **Memoized Filtering**: Videos are filtered only when dependencies change
2. **Memoized Sorting**: Sorted videos are cached until sort criteria or filtered videos change
3. **Memoized Calculations**: Duration calculations are optimized
4. **Callback Functions**: Event handlers use useCallback to prevent unnecessary re-renders

## Benefits

1. ✅ **Clean Architecture**: Logic separated into focused hooks
2. ✅ **Reusability**: Hooks can be used across different components
3. ✅ **Testability**: Each piece can be tested independently
4. ✅ **Maintainability**: Clear structure makes updates easier
5. ✅ **Performance**: Memoization prevents unnecessary computations
6. ✅ **Type Safety**: Full TypeScript support with proper types
7. ✅ **Consistent**: Follows the same pattern as other features (Transcribe, Kanban)

## API Integration

The feature integrates with `/api/playlist` endpoint which returns:
```typescript
{
  playlistDetails: PlaylistDetails;
  videos: VideoItem[];
  totalDuration: number;
  totalVideos: number;
}
```

## Dashboard Integration

Accessible from the sidebar under "Analyze Playlist" with keyboard shortcut `a + a`.
