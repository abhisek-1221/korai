# Korai 🎬

An AI-powered platform for YouTube content analysis, transformation, and interaction. Korai helps content creators and analysts extract maximum value from YouTube videos through intelligent clip identification, transcription, quiz generation, and interactive AI chat.

![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?style=flat&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.16.3-2D3748?style=flat&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=flat&logo=tailwind-css)

## 🌟 Features

### 🎯 Core Features

#### 1. **Viral Clips Identification**
- AI-powered analysis to identify the most engaging moments in YouTube videos
- Automatic timestamp generation with precise start/end times
- Virality scoring algorithm to rank clips by potential engagement
- Custom prompt support for targeted clip identification
- Related topics extraction for each clip
- Complete transcript preservation for context

#### 2. **Video Transcription**
- High-quality transcription extraction from YouTube videos
- Support for multiple languages with automatic language detection
- Structured transcript with timestamps
- Rate-limited API to ensure fair usage
- Retry logic for reliable transcript extraction

#### 3. **Interactive AI Chat**
- Multi-model AI chat support (Gemini, Groq)
- Web search integration via Perplexity AI
- Streaming responses with smooth UI updates
- Source citation and reasoning display
- Rate limiting (30 chats per user per day)
- Context-aware conversations

#### 4. **Voice Chat**
- Voice-to-text input for hands-free multinlingual interaction
- YouTube video context integration
- Microphone permission handling
- Real-time recording status indicators
- AI-powered voice chat responses

#### 5. **Quiz Generation**
- Automated quiz creation from video content
- Multiple question types support
- Interactive quiz interface
- Educational content transformation

#### 6. **Playlist Analysis**
- Batch processing of YouTube playlists
- Aggregate insights across multiple videos
- Comprehensive playlist analytics

#### 7. **Project Management**
- Kanban board for content organization
- Drag-and-drop task management
- Visual workflow management
- Product catalog with data tables

## 🏗️ Architecture

### **Tech Stack**

#### **Frontend**
- **Framework**: Next.js 15.3.2 (App Router with Turbopack)
- **UI Library**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Styling**: TailwindCSS 4.0 + CSS Modules
- **Component Library**: Radix UI + shadcn/ui
- **State Management**: Zustand
- **Animations**: Motion (Framer Motion)
- **Form Handling**: React Hook Form + Zod validation
- **Data Tables**: TanStack Table

#### **Backend**
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM 6.16.3
- **Authentication**: Clerk (complete user management)
- **Background Jobs**: Inngest (event-driven workflows)
- **File Storage**: AWS S3 (via AWS SDK v3)
- **Rate Limiting**: Upstash Redis

#### **AI & ML**
- **AI SDK**: Vercel AI SDK 5.0
- **LLM Providers**:
  - Google Gemini (via @ai-sdk/google)
  - Cerebras (via @ai-sdk/cerebras)
  - Perplexity (for web search)
- **Video Processing**: YouTubei.js (official YouTube API wrapper)
- **Text Processing**: Marked, React Markdown, Remark GFM

#### **Monitoring & Error Tracking**
- **Error Tracking**: Sentry (client + server monitoring)
- **Development**: Spotlight integration for local debugging

#### **Development Tools**
- **Runtime**: Bun (fast JavaScript runtime)
- **Linting**: ESLint + TypeScript ESLint
- **Formatting**: Prettier with Tailwind plugin
- **Git Hooks**: Husky + Lint-staged
- **Package Manager**: Bun

### **Project Structure**

```
korai/
├── prisma/                      # Database schema and migrations
│   └── schema.prisma           # Prisma schema (Video, Clip models)
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── chat/          # AI chat endpoints
│   │   │   ├── clips/         # Clip identification & management
│   │   │   ├── transcribe/    # Video transcription
│   │   │   ├── voice-chat/    # Voice chat functionality
│   │   │   ├── quiz/          # Quiz generation
│   │   │   ├── playlist/      # Playlist analysis
│   │   │   └── inngest/       # Inngest webhook handler
│   │   │
│   │   ├── auth/              # Authentication pages (Clerk)
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   │
│   │   └── dashboard/         # Protected dashboard routes
│   │       ├── overview/      # Dashboard home
│   │       ├── clips/         # Clip management
│   │       ├── transcribe/    # Transcription interface
│   │       ├── chat/          # AI chat interface
│   │       ├── voice-chat/    # Voice interaction
│   │       ├── quiz/          # Quiz generator
│   │       ├── analyze/       # Playlist analysis
│   │       ├── kanban/        # Project board
│   │
│   ├── components/            # Reusable React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── ai-elements/      # AI chat components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   └── ...
│   │
│   ├── features/             # Feature-specific modules
│   │   ├── chat/            # Chat feature logic
│   │   ├── transcribe/      # Transcription logic
│   │   ├── quiz/            # Quiz generation
│   │   ├── voice-chat/      # Voice chat logic
│   │   └── ...
│   │
│   ├── lib/                 # Utility libraries
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── providers.ts    # AI model providers
│   │   ├── ratelimit.ts    # Rate limiting config
│   │   ├── aws-s3.ts       # AWS S3 utilities
│   │   ├── youtube.ts      # YouTube helpers
│   │   ├── ythelper.ts     # YouTube transcript extraction
│   │   └── utils.ts        # General utilities
│   │
│   ├── inngest/            # Background job definitions
│   │   └── functions.ts    # Inngest function handlers
│   │
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── constants/          # Application constants
│
├── public/                 # Static assets
└── config files           # Configuration files
```

### **Database Schema**

```prisma
model Video {
  id               String   @id @default(cuid())
  userId           String   // Clerk user ID
  youtubeUrl       String
  s3Key            String   // Storage key: youtube-videos/{uuid}
  prompt           String?  // Custom analysis prompt
  
  // Metadata
  totalClips       Int?
  videoDuration    String?
  detectedLanguage String?
  s3Path           String?
  
  clips            Clip[]
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@index([userId])
  @@index([s3Key])
}

model Clip {
  id             String   @id @default(cuid())
  videoId        String
  video          Video    @relation(fields: [videoId], references: [id])
  
  start          String   // Timestamp
  end            String   // Timestamp
  title          String
  summary        String   @db.Text
  viralityScore  String
  relatedTopics  String[] // Array of topics
  transcript     String   @db.Text
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([videoId])
  @@index([viralityScore])
}
```

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18+ or **Bun** runtime
- **PostgreSQL** database
- **AWS Account** (for S3 storage)
- **Clerk Account** (for authentication)
- **Upstash Redis** (for rate limiting)
- **API Keys** for:
  - Google Gemini AI and LLama
  - Cerebras
  - Custom Clips API endpoint

### **Environment Variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/auth/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/auth/sign-up"

# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY="..."
GROQ_API_KEY="..."
CEREBRAS_API_KEY="..."

# AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="..."
AWS_S3_BUCKET_NAME="..."

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# Custom Clips API
CLIPS_API_URL="..."
CLIPS_API_TOKEN="..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Sentry (Optional)
NEXT_PUBLIC_SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_ORG="..."
NEXT_PUBLIC_SENTRY_PROJECT="..."
NEXT_PUBLIC_SENTRY_DISABLED="false"
```

### **Installation**

1. **Clone the repository**
```bash
git clone https://github.com/abhisek-1221/korai.git
cd korai
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Set up the database**
```bash
npx prisma generate
npx prisma db push
# or for migrations
npx prisma migrate dev
```

4. **Run the development server**
```bash
bun run dev
# or
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

```bash
# Development
bun run dev              # Start development server with Turbopack

# Production
bun run build           # Build for production
bun run start           # Start production server

# Code Quality
bun run lint            # Run ESLint
bun run lint:fix        # Fix ESLint errors and format
bun run lint:strict     # Strict linting with no warnings
bun run format          # Format code with Prettier
bun run format:check    # Check code formatting

# Git Hooks
bun run prepare         # Set up Husky git hooks
```


## 🔄 Background Processing

The application uses **Inngest** for reliable background job processing:

- **Event-Driven Architecture**: Triggered by `video/identify.clips` events
- **Multi-Step Functions**: Sequential processing with built-in retries
- **Database Integration**: Automatic clip storage after processing
- **Error Handling**: Graceful failure recovery
- **Webhook Support**: `/api/inngest` endpoint for Inngest platform

## 📊 API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/chat` | 30 requests | per user per day |
| `/api/transcribe` | Rate limited | per IP address |
| `/api/clips/identify` | User authenticated | - | Identify Viral Moments


## Documention
Documention can be found at the docs page of [korai web app](http://docs.korai.run/)

---
