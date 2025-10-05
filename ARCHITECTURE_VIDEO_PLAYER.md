# Architecture: S3 Signed URLs & Video Player

## 🔄 Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. Click Exported Clip
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Component State                         │
│  • selectedExportedClip                                          │
│  • clipVideoUrls (cache)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. useEffect Triggers
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              getSignedUrl(s3Key, clipId)                         │
│  • Check cache for existing URL                                  │
│  • If exists: return cached URL                                  │
│  • If not: call API                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. POST Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         /api/clips/videos/[id]/download                          │
│  • Verify Clerk authentication                                   │
│  • Extract s3Key from body                                       │
│  • Call getSignedUrlForObject()                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. AWS SDK Call
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              AWS S3 Client (lib/aws-s3.ts)                       │
│  • Create GetObjectCommand                                       │
│  • Generate signed URL                                           │
│  • Set expiration: 1 hour                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 5. Return Signed URL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Response: { url: "https://..." }                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 6. Cache & Use
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Video Player                                │
│  <video src={signedUrl} controls autoPlay />                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 7. HTTP GET Request
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS S3 Bucket                                 │
│  • Validates signature                                           │
│  • Checks expiration                                             │
│  • Streams video file                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 8. Video Stream
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Video Element                         │
│  • Renders video                                                 │
│  • Shows controls                                                │
│  • Enables playback                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Component Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                 VideoDetailPage Component                         │
├──────────────────────────────────────────────────────────────────┤
│  State:                                                           │
│  • video: Video | null                                            │
│  • exportedClips: ExportedClip[]                                  │
│  • selectedExportedClip: ExportedClip | null                      │
│  • clipVideoUrls: Record<string, string>                          │
│                                                                   │
│  Effects:                                                         │
│  • fetchVideoDetails()                                            │
│  • fetchExportedClips()                                           │
│  • Auto-load video URL on clip selection                          │
│                                                                   │
│  Functions:                                                       │
│  • getSignedUrl(s3Key, clipId) -> Promise<string | null>         │
│  • handleDownloadClip(clip) -> void                               │
│  • toggleClipSelection(clipId) -> void                            │
│  • handleGenerateShorts() -> void                                 │
│  • handleExportClips() -> Promise<void>                           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────────┐                    ┌──────────────────────┐
│  Tabs Component  │                    │   Dialog Component   │
├──────────────────┤                    ├──────────────────────┤
│ • Identified     │                    │ Export Config Modal  │
│ • Exported       │                    │ • Aspect Ratio       │
└──────────────────┘                    │ • Language           │
        │                               └──────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Exported Tab Content                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐    ┌────────────────────────────────────┐   │
│  │  Clip List     │    │     Video Player Section           │   │
│  │                │    │                                     │   │
│  │  • Clip 1 ✓    │    │  ┌──────────────────────────────┐  │   │
│  │  • Clip 2      │    │  │                              │  │   │
│  │  • Clip 3      │    │  │   <video controls autoPlay>  │  │   │
│  │  • Clip 4      │    │  │                              │  │   │
│  │                │    │  └──────────────────────────────┘  │   │
│  │  [Scrollable]  │    │                                     │   │
│  │                │    │  Clip Details Card:                 │   │
│  │                │    │  • Duration                         │   │
│  │                │    │  • Aspect Ratio                     │   │
│  │                │    │  • Language                         │   │
│  │                │    │  • S3 Key                           │   │
│  │                │    │  • Download Button                  │   │
│  │                │    │  • Copy S3 Key                      │   │
│  └────────────────┘    └────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (Browser)                         │
│  • No AWS credentials                                            │
│  • Only has clip metadata (s3Key)                                │
│  • Cannot directly access S3                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/clips/.../download
                              │ Header: Cookie (Clerk session)
                              │ Body: { s3Key: "..." }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Route                             │
│  1. await auth() - Verify Clerk session                          │
│  2. if (!userId) -> 401 Unauthorized                             │
│  3. Extract s3Key from request                                   │
│  4. Validate s3Key format                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Call AWS SDK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS SDK (Server-side)                       │
│  • Reads AWS_ACCESS_KEY_ID from env                              │
│  • Reads AWS_SECRET_ACCESS_KEY from env                          │
│  • Creates GetObjectCommand                                      │
│  • Calls getSignedUrl() with 3600s expiration                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Return signed URL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Response                                │
│  { url: "https://jif-backend.s3.ap-south-1.amazonaws.com/       │
│         youtube-videos/uuid/clip.mp4?                            │
│         X-Amz-Algorithm=AWS4-HMAC-SHA256&                        │
│         X-Amz-Credential=...&                                    │
│         X-Amz-Date=20251005T120000Z&                             │
│         X-Amz-Expires=3600&                                      │
│         X-Amz-SignedHeaders=host&                                │
│         X-Amz-Signature=abc123..." }                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Use signed URL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Video Element                               │
│  <video src={signedUrl} />                                       │
│  • Browser makes GET request to S3                               │
│  • AWS validates signature                                       │
│  • AWS checks expiration                                         │
│  • AWS streams video if valid                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         Database (Prisma)                         │
├──────────────────────────────────────────────────────────────────┤
│  ExportedClip {                                                   │
│    id: "clip_abc123"                                              │
│    videoId: "video_xyz789"                                        │
│    start: "125.007"                                               │
│    end: "221.043"                                                 │
│    s3Key: "youtube-videos/uuid/exported/clip_1.mp4" ← Important  │
│    aspectRatio: "9:16"                                            │
│    targetLanguage: "en"                                           │
│    createdAt: "2025-10-05T12:00:00Z"                              │
│  }                                                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ GET /api/clips/videos/[id]/exported
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend State Update                          │
│  setExportedClips([clip1, clip2, clip3])                          │
│  setSelectedExportedClip(clip1)                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ useEffect triggered
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    getSignedUrl(s3Key, clipId)                    │
│  1. Check clipVideoUrls cache                                     │
│  2. If not cached: POST to download API                           │
│  3. Receive signed URL                                            │
│  4. Cache in clipVideoUrls[clipId] = url                          │
│  5. Return URL                                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ State update
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Video Player Renders                         │
│  <video src={clipVideoUrls[clip.id]} controls autoPlay />        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Caching Strategy

```
Component Mount
    │
    ├─→ fetchExportedClips()
    │     └─→ setExportedClips([...])
    │     └─→ setSelectedExportedClip(clips[0])
    │
    └─→ useEffect on selectedExportedClip
          │
          ├─→ Check: clipVideoUrls[clip.id] exists?
          │     │
          │     ├─→ YES: Use cached URL (instant)
          │     │
          │     └─→ NO: Call getSignedUrl()
          │           │
          │           ├─→ POST /api/.../download
          │           ├─→ Get signed URL
          │           ├─→ Cache in clipVideoUrls[clip.id]
          │           └─→ Trigger re-render

Re-select Same Clip
    │
    └─→ useEffect skips (URL already cached)
          └─→ Video loads instantly

After 1 Hour
    │
    └─→ URL expires
          └─→ User clicks clip again
                └─→ New signed URL generated
```

---

## 🔄 Aspect Ratio Handling

```
┌──────────────────────────────────────────────────────────────────┐
│                     Aspect Ratio Logic                            │
└──────────────────────────────────────────────────────────────────┘

IF aspectRatio === "9:16" (Portrait/Stories)
  ┌──────────────┐
  │              │  • maxWidth: 360px
  │              │  • aspectRatio: 9/16
  │              │  • margin: auto (centered)
  │              │  • Use case: Instagram/TikTok stories
  └──────────────┘

IF aspectRatio === "1:1" (Square)
  ┌────────────────────┐
  │                    │  • maxWidth: 500px
  │                    │  • aspectRatio: 1/1
  │                    │  • margin: auto (centered)
  │                    │  • Use case: Instagram posts
  └────────────────────┘

IF aspectRatio === "16:9" (Landscape)
  ┌────────────────────────────────────┐
  │                                    │  • maxWidth: 100%
  │                                    │  • aspectRatio: 16/9
  └────────────────────────────────────┘  • Use case: YouTube

Container Styling:
  • background: black
  • overflow: hidden
  • borderRadius: rounded-lg
  • position: relative
```

---

## 🛠️ Error Handling Flow

```
User Action: Click Exported Clip
    │
    ├─→ selectedExportedClip updated
    │
    └─→ useEffect: getSignedUrl(s3Key, clipId)
          │
          ├─→ Try: POST /api/.../download
          │     │
          │     ├─→ SUCCESS (200)
          │     │     │
          │     │     ├─→ Cache URL
          │     │     └─→ Video loads
          │     │
          │     ├─→ AUTH ERROR (401)
          │     │     │
          │     │     └─→ Toast: "Unauthorized"
          │     │           └─→ Redirect to sign-in
          │     │
          │     ├─→ NOT FOUND (404)
          │     │     │
          │     │     └─→ Toast: "Clip not found"
          │     │           └─→ Show fallback UI
          │     │
          │     ├─→ SERVER ERROR (500)
          │     │     │
          │     │     └─→ Toast: "Failed to generate URL"
          │     │           └─→ Show "Load Video" button
          │     │
          │     └─→ NETWORK ERROR
          │           │
          │           └─→ Toast: "Network error"
          │                 └─→ Allow retry

User Action: Click Download Button
    │
    ├─→ handleDownloadClip(clip)
    │     │
    │     ├─→ Try: getSignedUrl(s3Key, clipId)
    │     │     │
    │     │     ├─→ SUCCESS
    │     │     │     └─→ window.open(url, '_blank')
    │     │     │
    │     │     └─→ ERROR
    │     │           └─→ Toast: "Failed to download"
    │     │
    │     └─→ Browser handles download
```

---

## 📱 Responsive Behavior

```
Mobile (<768px)
├─ Stack layout
│  ├─ Clip list (full width, height: 300px)
│  └─ Video player (full width)

Tablet (768px - 1024px)
├─ Two-column grid
│  ├─ Clip list (1/3 width)
│  └─ Video player (2/3 width)

Desktop (>1024px)
├─ Three-column grid
│  ├─ Clip list (1 column)
│  └─ Video + Details (2 columns)
```

---

This architecture ensures:
✅ **Security**: AWS credentials never exposed
✅ **Performance**: URLs cached for 1 hour
✅ **UX**: Auto-load and smooth playback
✅ **Scalability**: Efficient S3 access patterns
