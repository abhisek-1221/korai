# Mindmap Feature for Transcriptions

This feature adds interactive mindmap visualization to transcription pages using React Flow.

## Installation

Install the required dependency:

```bash
bun add @xyflow/react
```

## Features

- **AI-Generated Mindmaps**: Uses LLM (Gemini 2.5 Flash) to analyze transcriptions and create hierarchical mindmaps
- **Interactive Visualization**: Built with React Flow for smooth interactions
- **Node Categories**: 
  - Main (central topic)
  - Topic (major themes)
  - Subtopic (supporting ideas)
  - Detail (specific points)
- **Custom Styling**: Color-coded nodes based on hierarchy
- **Export**: Download mindmap data as JSON
- **Regenerate**: Create new mindmaps on demand

## Usage

1. Navigate to a transcription detail page
2. Click the "Mindmap" tab at the top
3. Click "Create Mindmap" to generate the visualization
4. Interact with the mindmap:
   - Zoom in/out using controls
   - Pan by dragging
   - Download the mindmap data

## API Route

**POST** `/api/transcription/[id]/mindmap`

Generates a mindmap structure from the transcription text using AI.

**Response:**
```json
{
  "mindmap": {
    "title": "string",
    "nodes": [
      {
        "id": "string",
        "label": "string",
        "description": "string",
        "category": "main|topic|subtopic|detail"
      }
    ],
    "edges": [
      {
        "source": "string",
        "target": "string"
      }
    ]
  },
  "transcriptionTitle": "string"
}
```

## Files Created

- `/src/app/api/transcription/[id]/mindmap/route.ts` - API endpoint for mindmap generation
- `/src/features/transcription/components/mindmap-viewer.tsx` - React Flow mindmap component
- Updated `/src/app/dashboard/transcription/[id]/page.tsx` - Added mindmap view toggle

## Technical Details

- Uses `generateObject` from AI SDK for structured output
- Implements Zod schemas for type-safe mindmap data
- Automatic node positioning based on hierarchy levels
- Animated edges with arrow markers
- Responsive layout with React Flow controls
