# Python Video Processing Server

> **⚠️ Note**: This Python server is kept in this repository for reference only. It is deployed and managed separately from a different repository. Vercel will ignore this folder during the Next.js build process.

## 1. Overview

`main.py` is a serverless video processing pipeline built using the [Modal](https://modal.com/) framework. It automates the process of creating short, engaging video clips from longer videos, with features like transcription, translation, dynamic subtitles, face tracking, and more.

The primary goal of this application is to take a source video (from an S3 bucket or a YouTube URL), identify the most "viral" or compelling moments using a generative AI model, and then generate a specified number of short-form clips (e.g., for TikTok, Instagram Reels, YouTube Shorts) in the desired aspect ratio.

### Core Features:

- **Video Ingestion**: Supports videos from AWS S3 or any YouTube URL.
- **AI-Powered Clip Selection**: Uses **Meta's Llama model** to analyze the video transcript and identify compelling stories, insights, or engaging moments based on a virality-focused prompt.
- **Automatic Transcription**: Employs `whisperx` for accurate, word-level speech-to-text transcription.
- **Speaker Diarization**: Identifies different speakers in the video using `pyannote.audio`, enabling multi-voice TTS for translated content.
- **Multilingual Support**:
    - **Translation**: Translates the transcript into various target languages using the Llama model.
    - **Text-to-Speech (TTS)**: Generates new audio in the target language using a multi-voice approach (AWS Polly for general languages, Sarvam AI for Indian languages).
- **Dynamic Face Tracking**: A custom face-tracking implementation (`Columbia_test.py`) ensures the active speaker is always in the frame, automatically cropping and centering the video.
- **Highly Customizable Subtitles**: Generates `.ass` subtitles with extensive styling options, including karaoke-style highlighting, custom fonts, colors, shadows, and animations.
- **Post-Processing**: Seamlessly adds watermarks and background music to the final clips.
- **Four Main Endpoints**:
    1.  `/process_video`: An all-in-one pipeline that identifies and processes clips automatically.
    2.  `/identify_clips`: A fast, "dry-run" endpoint to get clip suggestions from the AI without processing the video.
    3.  `/process_clips`: Processes specific video segments when the user provides the start and end times.
    4.  `/add_subtitles`: A utility endpoint to add or burn subtitles into an existing video.

## 2. Architecture

The application is built around a `modal.App` which defines the serverless environment and exposes FastAPI endpoints.

### Environment (`modal.Image`)

The script defines a custom Docker image to run the code. This image is based on an NVIDIA CUDA image (`nvidia/cuda:12.4.0-devel-ubuntu22.04`) to leverage GPU acceleration for the machine learning models.

**Key components of the environment:**
- **System Packages**: `ffmpeg`, `libgl1-mesa-glx`, and various font packages (`fonts-noto-*`, `fonts-dejavu-core`, etc.) are installed to handle video processing and ensure broad language support for subtitles.
- **Python Dependencies**: All required Python packages are installed from `requirements.txt`. Key libraries include `openai`, `ffmpegcv`, `modal`, `boto3`, `pydantic`, `whisperx`, `pyannote.audio`, `yt-dlp`, and `pysubs2`.
- **Custom Fonts**: The image downloads and installs several Google Fonts (like Anton and Noto Sans for Indian languages) to ensure high-quality, consistent subtitle rendering.
- **Model Caching**: A `modal.Volume` is used to cache the large ML models (like `whisperx`) between runs, significantly speeding up cold starts.

### Main Class (`AiPodcastClipper`)

This class encapsulates the entire logic of the application.
- **`@modal.enter()` (`load_model`)**: This method is run once when the container starts. It pre-loads the `whisperx` model, the `DiarizationPipeline`, and initializes clients for the OpenRouter (Llama) and Sarvam AI. This ensures that the models are "warm" and ready to process requests immediately.
- **FastAPI Endpoints**: The class exposes its methods as web endpoints using `@modal.fastapi_endpoint`.

## 3. API Endpoints and Data Models

The application exposes its functionality through a secure, token-authenticated API.

### 3.1. Data Models (Pydantic)

These models define the structure of the API request bodies, providing clear, validated inputs.

#### `ProcessVideoRequest`
This is the main request body for the all-in-one clip generation endpoint.

| Field | Type | Description |
|---|---|---|
| `s3_key` | str | The S3 key of the source video in the `jif-backend` bucket. |
| `youtube_url` | str | Alternative to `s3_key`. A URL to a YouTube video. |
| `s3_key_yt` | str | Custom S3 key to store the downloaded YouTube video and its clips. |
| `number_of_clips` | int | The number of clips to generate. Use `-1` to generate all identified clips. |
| `prompt` | str | A specific instruction for the AI to focus on when selecting clips (e.g., "find moments about entrepreneurship"). |
| `target_language` | str | The language code for translation (e.g., "es-ES", "hi-IN"). If `None`, no translation is performed. |
| `aspect_ratio` | str | The target aspect ratio for the clips: "9:16", "16:9", or "1:1". |
| `subtitles` | bool | A simple toggle for subtitles. For advanced control, use `subtitle_customization`. |
| `watermark_s3_key`| str | S3 key of the watermark image (PNG). |
| `subtitle_customization`| `SubtitleCustomization` | A nested object containing all subtitle styling options. |
| `background_music_s3_key`| str | S3 key of the background music audio file. |
| `background_music_volume`| float | Volume of the background music (0.0 to 1.0). |

---
#### `IdentifyClipsRequest`
The request body for the clip identification endpoint.

| Field | Type | Description |
|---|---|---|
| `s3_key` | str | The S3 key of the source video. |
| `youtube_url` | str | Alternative to `s3_key`. A URL to a YouTube video. |
| `prompt` | str | A specific instruction for the AI to focus on when selecting clips. |

---
#### `ProcessClipsRequest`
The request body for processing user-specified clips.

| Field | Type | Description |
|---|---|---|
| `s3_key` | str | The S3 key of the source video. |
| `youtube_url` | str | Alternative to `s3_key`. A URL to a YouTube video. |
| `clips` | list[`ClipTime`] | A list of objects, each with a `start` and `end` time in seconds for a clip to be generated. |
| `target_language` | str | Optional language for translation and TTS. |
| `aspect_ratio` | str | Target aspect ratio for the clips. |
| `subtitle_customization`| `SubtitleCustomization` | Subtitle styling options. |
| ... | | Other fields from `ProcessVideoRequest` are also applicable. |

---
#### `AddSubtitlesRequest`
The request body for the subtitle utility endpoint.

| Field | Type | Description |
|---|---|---|
| `s3_key` | str | S3 key of the source video. |
| `output_s3_key` | str | Optional. Custom S3 key for the output video. If not provided, `_subtitled` is appended to the original filename. |
| `target_language` | str | Optional. If provided, the video is translated and new audio is generated. |
| `aspect_ratio` | str | Aspect ratio used for positioning subtitles correctly. |
| `subtitle_customization`| `SubtitleCustomization` | Subtitle styling options. |


### 3.2. Endpoint: `/process_video`

**Method**: `POST`

This is the main, all-in-one entry point of the pipeline. It orchestrates the entire workflow from video download to final clip generation and upload.

**Workflow:**
1.  **Authentication & Input**: Validates the token and downloads the video from S3 or YouTube.
2.  **Transcription**: Calls `transcribe_video` to get a word-level transcript and speaker diarization data.
3.  **Moment Identification**: Sends the transcript to the **Llama model** via `identify_moments` to find the best moments for clips.
4.  **Clip Processing**: Iterates through the moments identified by the AI and calls the internal `process_clip` function for each one, which performs the full pipeline of cutting, reframing, audio processing, and subtitling.
5.  **Response**: Returns a JSON object containing a list of `processed_clips`, each with its metadata (title, summary, S3 key, etc.).

### 3.3. Endpoint: `/identify_clips`

**Method**: `POST`

This endpoint serves as a fast "dry run" to get clip suggestions without the time and cost of full video processing. It's designed to give a quick preview of the most compelling moments.

**Workflow:**
1.  **Authentication & Input**: Validates the token and downloads the video.
2.  **Fast Transcription**: Calls `transcribe_video_fast`, which uses `whisperx` but skips the slower alignment and diarization steps.
3.  **Moment Identification**: Sends the raw transcript to the **Llama model** to get clip suggestions, just like the `/process_video` endpoint.
4.  **Response**: Returns a JSON object containing the list of `identified_clips` with their metadata, the total number of clips found, the video duration, and the detected language. No video files are created.

### 3.4. Endpoint: `/process_clips`

**Method**: `POST`

This endpoint is used when the user already knows which segments they want to create. Instead of using AI to find moments, it processes a list of start and end times provided by the user.

**Workflow:**
1.  **Authentication & Input**: Validates the token, downloads the video, and receives a list of `clips` (with `start` and `end` times).
2.  **Full Transcription**: Calls `transcribe_video` to get a complete, accurate, and speaker-diarized transcript for the entire video. This is necessary for accurate translation and multi-speaker TTS.
3.  **Clip Processing**: Iterates through the user-provided list of `clips`. For each one, it calls the same internal `process_clip` function used by `/process_video` to perform the full rendering pipeline.
4.  **Response**: Returns a list of the final `processed_clips` with their new S3 keys.

### 3.5. Endpoint: `/add_subtitles`

**Method**: `POST`

This is a utility endpoint designed to add subtitles to an existing video without creating clips.

**Workflow:**
1.  **Authentication & Download**: Validates the token and downloads the source video from S3.
2.  **Transcription**: Transcribes the video to get word-level segments.
3.  **Translation & TTS (Optional)**: If a `target_language` is provided, it translates the entire transcript and generates new audio, similar to the main pipeline. It then replaces the audio in the original video.
4.  **Subtitle Generation**: Calls `create_subtitles_with_ffmpeg` to generate and burn the subtitles onto the video.
5.  **Upload**: Uploads the final subtitled video to the specified `output_s3_key` in S3.
6.  **Response**: Returns a success message with the input and output S3 keys.