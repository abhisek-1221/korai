# Korai

An AI-powered platform for YouTube Content Engine. Korai helps content creators and analysts extract maximum value from YouTube videos through intelligent clip identification, transcription, quiz generation, and interactive AI chat and short form content generation.

<img width="5088" height="3468" alt="image" src="https://github.com/user-attachments/assets/2e8e2f27-df1b-4bb3-9384-a11845ef894b" />



![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black?style=flat&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?style=flat&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.16.3-2D3748?style=flat&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=flat&logo=tailwind-css)

## Features

### Core Features

### Korai Features

#### Viral Shorts Generator

* Intelligent reframing for optimal subject focus
* Dynamic captioning with adaptive styling
* Automated resizing across social formats

#### Chat with Videos

* Context-aware Q&A and content summarization
* Integrate apps like notion/slack etc for automated workflows
* AI-driven automation triggered directly from conversations

#### Talk to Videos

* Natural, multilingual voice interactions with video content
* Real-time speech-to-response in multiple Indian languages
* Dual output: synchronized text and audio responses

#### Transcript Generation

* High-precision transcripts with temporal alignment
* Contextual search and semantic querying within transcripts
* Export-ready formats for analysis or integration

#### Interactive Quizzes

* AI-generated quizzes derived from video context
* Adaptive difficulty and diverse question formats
* Immersive, feedback-rich learning experiences


#### 6. **Playlist Analysis**
- Batch processing of YouTube playlists
- Aggregate insights across multiple videos
- Comprehensive playlist analytics

---

### **Tech Stack**

| **Category**                | **Technology**                           | **Description**                                    |
| --------------------------- | ---------------------------------------- | -------------------------------------------------- |
| **Frontend**                | **Next.js 15.3.2**                       | App Router with Turbopack                          |
|                             | **React 19 + TypeScript 5.7.2**          | Modern UI and language foundation                  |
|                             | **TailwindCSS 4.0 + CSS Modules**        | Utility-first and modular styling                  |
|                             | **Radix UI + shadcn/ui**                 | Accessible, composable UI components               |
|                             | **Zustand**                              | Lightweight state management                       |
|                             | **Framer Motion**                        | Smooth, production-grade animations                |
|                             | **React Hook Form + Zod**                | Form handling and schema validation                |
|                             | **TanStack Table**                       | Advanced, performant data tables                   |
| **Backend**                 | **Next.js API Routes**                   | Unified serverless backend                         |
|                             | **PostgreSQL + Prisma 6.16.3**           | Type-safe ORM and relational database              |
|                             | **Clerk**                                | Authentication and user management                 |
|                             | **Inngest**                              | Event-driven background jobs                       |
|                             | **AWS S3 (SDK v3)**                      | Scalable file storage                              |
|                             | **Upstash Redis**                        | Distributed rate limiting                          |
| **AI & ML Backend**         | **Modal**                                | Serverless AI infrastructure                       |
|                             | **FastAPI**                              | High-performance inference API                     |
|                             | **Hugging Face / TensorFlow**            | Model hosting and deep learning                    |
|                             | **FFmpeg**                               | Video/audio processing and transcoding             |
|                             | **WhisperX**                             | Accurate multilingual transcription with alignment |
|                             | **LR-ASD**                               | Active Speaker Detection model                     |
|                             | **Vercel AI SDK 5.0**                    | Unified AI orchestration layer                     |
|                             | **LLMs:** Gemini, Cerebras, LLama   | Multi-provider large language models               |
| **Video & Text Processing** | **YouTubei Data v3 API**                          | YouTube Fetures                        |
|                             | **Marked / React Markdown / Remark GFM** | Markdown rendering and processing                  |
| **Monitoring & Debugging**  | **Sentry**                               | Client + server error tracking                     |
|                             | **Spotlight**                            | Local development debugging                        |
| **Development Tools**       | **Bun Runtime**                          | Fast, modern JavaScript runtime                    |
|                             | **ESLint + Prettier**                    | Linting and formatting                             |
|                             | **Husky + Lint-staged**                  | Pre-commit quality checks                          |
|                             | **Bun Package Manager**                  | Blazing-fast dependency management                 |

---


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


# Documention
Developer Documention can be found at the [docs page](https://docs.korai.run/) of [korai web app](https://korai.run/)

---


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
