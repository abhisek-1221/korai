# Quiz Generator Feature

A clean, modular implementation of the YouTube video quiz generator using Zustand for state management with **robust JSON parsing** to handle LLM response variations.

## Structure

```
features/quiz/
├── components/
│   └── quiz-view-page.tsx           # Main component
├── hooks/
│   ├── index.ts                      # Exports all hooks
│   ├── use-fetch-usage.ts            # Fetch user's quiz usage/limits
│   ├── use-generate-quiz.ts          # Quiz generation with robust JSON parsing
│   ├── use-fetch-video-transcript.ts # Fetch video details & transcript
│   └── use-quiz-actions.ts           # Quiz interaction handlers
└── store/
    └── quiz-store.ts                 # Zustand store for state management
```

## Key Features

### 1. **Zustand Store** (`quiz-store.ts`)
- Centralized state management for all quiz-related data
- Manages video data, quiz questions, user answers, and UI states
- Clean separation of state and actions

### 2. **Custom Hooks**

#### `useFetchUsage`
- Fetches user's quiz generation limits
- Displays remaining attempts and reset time
- Auto-refreshes after quiz generation

#### `useGenerateQuiz` - **IMPROVED JSON PARSING**
- **Robust JSON parser** that handles multiple edge cases:
  - Removes markdown code blocks (```json, ```)
  - Extracts JSON from mixed content
  - Handles different response formats (array, object with 'questions', 'quiz' property)
  - Converts letter answers (A, B, C) to numeric indices
  - Validates question structure
  - Provides detailed error messages
- Streams quiz generation from LLM
- Handles rate limiting and authentication
- Updates usage info in real-time

#### `useFetchVideoAndTranscript`
- Fetches YouTube video details
- Gets video transcript
- Validates transcript quality (min length)
- Triggers quiz generation automatically
- User-friendly error messages for common issues

#### `useQuizActions`
- `handleAnswerSelect`: Select answer for a question
- `handleQuizSubmit`: Submit and grade quiz
- `handleRetry`: Reset quiz to retake
- `handleCopy`: Copy quiz to clipboard
- `handleDownload`: Download quiz as text file

### 3. **Component** (`quiz-view-page.tsx`)
- Clean, presentation-focused component
- Uses custom hooks for all logic
- Responsive layout with proper scrolling
- Loading skeletons for better UX
- Integrated with dashboard layout

## JSON Parsing Improvements

### Problem Solved
The original implementation frequently failed because LLMs return quiz data in various formats:
- With markdown code blocks: ` ```json ... ``` `
- Different object structures
- Letter-based answers instead of numbers
- Extra text before/after JSON

### Solution
```typescript
function parseQuizJSON(rawContent: string): QuizQuestion[] {
  // 1. Clean markdown
  cleanedContent = cleanedContent
    .replace(/^```(?:json)?\s*/gm, '')
    .replace(/\s*```$/gm, '');

  // 2. Extract JSON
  const jsonMatch =
    cleanedContent.match(/\[[\s\S]*\]/) ||
    cleanedContent.match(/\{[\s\S]*\}/);

  // 3. Handle multiple formats
  if (Array.isArray(parsed)) {
    questions = parsed;
  } else if (parsed.questions) {
    questions = parsed.questions;
  } else if (parsed.quiz) {
    questions = parsed.quiz;
  }

  // 4. Convert letter answers (A, B, C) to numbers (0, 1, 2)
  if (typeof correctAnswer === 'string') {
    correctAnswer = letter.charCodeAt(0) - 65;
  }

  // 5. Validate structure
  // ... validation code
}
```

## Features

### Quiz Generation
- Generate 2-10 questions from video transcripts
- Uses AI (GPT-4o-mini or other models)
- Streaming response for better UX
- Rate limiting protection

### Interactive Quiz Taking
- Multiple choice questions
- Real-time answer selection
- Submit and get instant results
- Visual feedback (correct/incorrect)
- Explanations for each answer

### Quiz Management
- Retry quiz with different answers
- Copy quiz to clipboard
- Download as text file
- View score and performance

### Usage Tracking
- Shows remaining daily attempts
- Displays reset time
- Prevents exceeding limits

## Usage

```tsx
import QuizViewPage from '@/features/quiz/components/quiz-view-page';

export default function Page() {
  return <QuizViewPage />;
}
```

## State Management

Access the store directly if needed:
```tsx
import { useQuizStore } from '@/features/quiz/store/quiz-store';

const { quiz, userAnswers, score } = useQuizStore();
```

## Performance Optimizations

1. **Abort Controllers**: Cancel ongoing requests when needed
2. **Memoized Callbacks**: Prevent unnecessary re-renders
3. **Streaming**: Display progress during generation
4. **Efficient State Updates**: Only update what changes

## Error Handling

### User-Friendly Messages
- No transcript available → Clear message with suggestion
- Private/unavailable video → Specific error
- Rate limit exceeded → Show reset time
- Parsing errors → Log details, show generic message

### Robust Parsing
- Multiple fallback strategies
- Detailed console logs for debugging
- Graceful degradation

## Benefits

1. ✅ **Robust JSON Parsing**: Handles various LLM response formats
2. ✅ **Clean Architecture**: Logic separated into focused hooks
3. ✅ **Reusability**: Hooks can be used across components
4. ✅ **Testability**: Each piece can be tested independently
5. ✅ **Maintainability**: Clear structure makes updates easier
6. ✅ **Better UX**: Loading states, error messages, usage tracking
7. ✅ **Type Safety**: Full TypeScript support

## Dashboard Integration

Accessible from the sidebar under "Quiz Generator" with keyboard shortcut `q + q`.

## API Integration

### `/api/videoDetail`
Fetches YouTube video metadata

### `/api/transcribe`
Gets video transcript

### `/api/quiz`
Generates quiz from transcript using AI
- Streams response
- Returns rate limit headers
- Handles authentication

### `/api/usage`
Returns user's quiz generation limits

## Quiz Data Format

```typescript
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  explanation?: string;
}
```

The parser automatically converts various input formats to this standard format.
