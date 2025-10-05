import glob
import json
import pathlib
import pickle
import shutil
import subprocess
import time
import uuid
import boto3
import cv2
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import ffmpegcv
import modal
import numpy as np
from pydantic import BaseModel
import os
from openai import OpenAI
from typing import Optional
import base64
import io
import re
from pydub import AudioSegment
import librosa

import pysubs2
from tqdm import tqdm
import whisperx
import yt_dlp


class SubtitleCustomization(BaseModel):
    enabled: bool = True
    position: Optional[str] = "bottom"  # "bottom", "middle", "top"
    font_size: Optional[int] = None  # Will auto-calculate based on aspect ratio if None
    font_family: Optional[str] = None  # Will auto-select based on language if None
    font_color: Optional[str] = "#FFFFFF"  # White by default
    outline_color: Optional[str] = "#000000"  # Black outline by default
    outline_width: Optional[float] = 2.0
    background_color: Optional[str] = None  # Transparent by default, use hex color for background
    background_opacity: Optional[float] = 0.7  # 0.0 to 1.0
    shadow_enabled: bool = True
    shadow_color: Optional[str] = "#000000"
    shadow_offset: Optional[float] = 2.0
    max_words_per_line: Optional[int] = 5
    margin_horizontal: Optional[int] = 50
    margin_vertical: Optional[int] = None  # Will auto-calculate if None
    fade_in_duration: Optional[float] = 0.2
    fade_out_duration: Optional[float] = 0.2
    karaoke_enabled: bool = False
    karaoke_highlight_color: Optional[str] = "#FFFF00"  # Yellow
    karaoke_popup_scale: Optional[float] = 1.2

class ProcessVideoRequest(BaseModel):
    s3_key: Optional[str] = None  # S3 key for uploaded video
    youtube_url: Optional[str] = None  # YouTube URL as alternative to S3
    s3_key_yt: Optional[str] = None  # Custom S3 key for YouTube video and its clips
    number_of_clips: int = 1
    prompt: Optional[str] = None
    target_language: Optional[str] = None
    aspect_ratio: Optional[str] = "9:16"
    subtitles: bool = True
    watermark_s3_key: Optional[str] = None
    subtitle_position: Optional[str] = "bottom"  # Deprecated, use subtitle_customization instead
    subtitle_customization: Optional[SubtitleCustomization] = None
    background_music_s3_key: Optional[str] = None  # S3 key for background music file
    background_music_volume: Optional[float] = 0.1  # Volume level (0.0 to 1.0), default is subtle
    s3_folder: Optional[str] = "youtube_videos"  # S3 folder to store downloaded YouTube videos (deprecated, use s3_key_yt)

class IdentifyClipsRequest(BaseModel):
    s3_key: Optional[str] = None  # S3 key for uploaded video
    youtube_url: Optional[str] = None  # YouTube URL as alternative to S3
    s3_key_yt: Optional[str] = None  # Custom S3 key for YouTube video
    prompt: Optional[str] = None
    s3_folder: Optional[str] = "youtube_videos"

class ClipTime(BaseModel):
    start: float
    end: float

class ProcessClipsRequest(BaseModel):
    s3_key: Optional[str] = None
    youtube_url: Optional[str] = None
    s3_key_yt: Optional[str] = None
    clips: list[ClipTime]
    target_language: Optional[str] = None
    aspect_ratio: Optional[str] = "9:16"
    subtitles: bool = True
    watermark_s3_key: Optional[str] = None
    subtitle_customization: Optional[SubtitleCustomization] = None
    background_music_s3_key: Optional[str] = None
    background_music_volume: Optional[float] = 0.1
    s3_folder: Optional[str] = "youtube_videos"

class AddSubtitlesRequest(BaseModel):
    s3_key: str  # S3 key of the source video
    output_s3_key: Optional[str] = None  # Optional custom output S3 key. If not provided, will append "_subtitled" to the original filename
    target_language: Optional[str] = None  # Optional language for translation and TTS
    aspect_ratio: Optional[str] = "9:16"  # Video aspect ratio for subtitle positioning
    subtitle_customization: Optional[SubtitleCustomization] = None  # Subtitle styling options


image = (modal.Image.from_registry(
    "nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
    .apt_install([
        "ffmpeg", "libgl1-mesa-glx", "wget", "libcudnn8", "libcudnn8-dev",
        "fonts-noto-core", "fonts-noto-ui-core", "fonts-noto-cjk", 
        "fonts-dejavu-core", "fontconfig", "fonts-liberation"
    ])
    .pip_install_from_requirements("requirements.txt")
    .pip_install(["sarvamai", "librosa", "pydub"])
    .run_commands([
        "mkdir -p /usr/share/fonts/truetype/custom",
        "wget -O /usr/share/fonts/truetype/custom/Anton-Regular.ttf https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf",
        # Download comprehensive Noto fonts for all Indian languages
        "wget -O /usr/share/fonts/truetype/custom/NotoSansDevanagari-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansBengali-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansTamil-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansGujarati-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansGujarati/NotoSansGujarati-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansKannada-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansKannada/NotoSansKannada-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansMalayalam-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansMalayalam/NotoSansMalayalam-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansTelugu-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTelugu/NotoSansTelugu-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansGurmukhi-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansGurmukhi/NotoSansGurmukhi-Regular.ttf",
        "wget -O /usr/share/fonts/truetype/custom/NotoSansOriya-Regular.ttf https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansOriya/NotoSansOriya-Regular.ttf",
        "fc-cache -f -v",
        "fc-list | grep -E '(Noto|DejaVu|Liberation)' | head -20"
    ])
    .pip_install(["pyannote.audio", "yt-dlp"])
    .add_local_dir("asd", "/asd", copy=True)
    .add_local_file("cookies.txt", "/cookies.txt"))

app = modal.App("jif", image=image)

volume = modal.Volume.from_name(
    "ai-podcast-clipper-model-cache", create_if_missing=True
)
mount_path = "/root/.cache/torch"

auth_scheme = HTTPBearer()

# Sarvam AI Constants and Utilities
TTS_MAX_CHARS = 250
TRANSLATE_MAX_CHARS = 1000

# AWS Polly Constants
INDIAN_LANGUAGES = ["hi-IN", "bn-IN", "gu-IN", "ta-IN", "mr-IN", "kn-IN", "ml-IN", "te-IN", "pa-IN", "od-IN", "as-IN", "ur-IN"]

# AWS Polly voice mapping for different languages
POLLY_VOICE_MAP = {
    "es-ES": ["Enrique", "Sergio", "Conchita", "Lucia"],
    "fr-FR": ["Celine", "Mathieu", "Lea", "Remy"],
    "de-DE": ["Marlene", "Hans", "Vicki", "Daniel"],
    "it-IT": ["Carla", "Giorgio", "Bianca", "Giorgio"],
    "pt-BR": ["Vitoria", "Ricardo", "Camila", "Thiago"],
    "ja-JP": ["Mizuki", "Takumi", "Seoyeon", "Tomoko"],
    "ko-KR": ["Seoyeon", "Jihun"],
    "zh-CN": ["Zhiyu", "Kangkang"],
    "ar-SA": ["Zeina", "Hala"],
    "en": ["Joanna", "Matthew", "Salli", "Joey", "Ivy", "Justin", "Kendra", "Kimberly"],
    "en-GB": ["Amy", "Brian", "Emma", "Arthur"],
    "ru-RU": ["Tatyana", "Maxim"],
    "nl-NL": ["Lotte", "Ruben"],
    "sv-SE": ["Astrid", "Elin"],
    "da-DK": ["Naja", "Mads"],
    "no-NO": ["Liv", "Seoyeon"],
    "fi-FI": ["Suvi"],
    "pl-PL": ["Ewa", "Jacek", "Jan"],
}

def clean_language_code_for_whisperx(language_code: str) -> str:
    """
    Clean language code for WhisperX compatibility.
    WhisperX only accepts base language codes without country specifiers.
    Example: 'ta-IN' -> 'ta', 'hi-IN' -> 'hi', 'en-US' -> 'en'
    """
    if not language_code:
        return language_code
    
    # Split on '-' and take the first part (base language)
    base_language = language_code.split('-')[0]
    
    # WhisperX accepted language codes (from the error message)
    accepted_codes = {
        'af', 'am', 'ar', 'as', 'az', 'ba', 'be', 'bg', 'bn', 'bo', 'br', 'bs', 
        'ca', 'cs', 'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'eu', 'fa', 'fi', 
        'fo', 'fr', 'gl', 'gu', 'ha', 'haw', 'he', 'hi', 'hr', 'ht', 'hu', 'hy', 
        'id', 'is', 'it', 'ja', 'jw', 'ka', 'kk', 'km', 'kn', 'ko', 'la', 'lb', 
        'ln', 'lo', 'lt', 'lv', 'mg', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 
        'my', 'ne', 'nl', 'nn', 'no', 'oc', 'pa', 'pl', 'ps', 'pt', 'ro', 'ru', 
        'sa', 'sd', 'si', 'sk', 'sl', 'sn', 'so', 'sq', 'sr', 'su', 'sv', 'sw', 
        'ta', 'te', 'tg', 'th', 'tk', 'tl', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 
        'yi', 'yo', 'zh', 'yue'
    }
    
    # Return base language if it's in accepted codes, otherwise return original
    if base_language in accepted_codes:
        return base_language
    else:
        print(f"Warning: Language code '{base_language}' not in WhisperX accepted codes, using as-is")
        return base_language

def chunk_text(text: str, max_chars: int) -> list:
    """Break long text at sentence boundaries"""
    if len(text) <= max_chars:
        return [text]
    
    sentences = re.split(r'(?<=[.!?।])\s+|\n\s*\n', text.strip())
    chunks, current_chunk = [], ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(current_chunk + " " + sentence) > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                # Sentence too long — break at word level
                words = sentence.split()
                temp_chunk = ""
                for word in words:
                    if len(temp_chunk + " " + word) <= max_chars:
                        temp_chunk += " " + word if temp_chunk else word
                    else:
                        if temp_chunk:
                            chunks.append(temp_chunk.strip())
                        temp_chunk = word
                if temp_chunk:
                    current_chunk = temp_chunk
        else:
            current_chunk += " " + sentence if current_chunk else sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    # Final safety split
    final_chunks = []
    for chunk in chunks:
        if len(chunk) <= max_chars:
            final_chunks.append(chunk)
        else:
            for i in range(0, len(chunk), max_chars):
                final_chunks.append(chunk[i:i + max_chars])
    return final_chunks

def translate_text_sarvam(text: str, source_lang: str, target_lang: str, sarvam_client) -> str:
    """Translate text using Sarvam AI with chunking"""
    chunks = chunk_text(text, TRANSLATE_MAX_CHARS)
    translated_chunks = []

    for chunk in chunks:
        try:
            response = sarvam_client.text.translate(
                input=chunk,
                source_language_code=source_lang,
                target_language_code=target_lang,
                model="mayura:v1",
                mode="modern-colloquial",
                enable_preprocessing=True
            )
            translated_chunks.append(response.translated_text)
        except Exception as e:
            print(f"Translation failed for chunk: {e}")
            translated_chunks.append(chunk)  # Fallback to original text

    return " ".join(translated_chunks)

def translate_text_openrouter(text: str, source_lang: str, target_lang: str, openrouter_client) -> str:
    """Translate text using OpenRouter AI"""
    try:
        # Convert language codes to human-readable language names
        lang_map = {
            "es-ES": "Spanish", "fr-FR": "French", "de-DE": "German", "it-IT": "Italian",
            "pt-BR": "Portuguese", "ja-JP": "Japanese", "ko-KR": "Korean", "zh-CN": "Chinese",
            "ar-SA": "Arabic", "en": "English", "en-GB": "English", "ru-RU": "Russian",
            "nl-NL": "Dutch", "sv-SE": "Swedish", "da-DK": "Danish", "no-NO": "Norwegian",
            "fi-FI": "Finnish", "pl-PL": "Polish", "hi": "Hindi"
        }
        
        source_language_name = lang_map.get(source_lang, source_lang)
        target_language_name = lang_map.get(target_lang, target_lang)
        
        prompt = f"""Translate the following {source_language_name} text to {target_language_name}.
        Provide only the translation without any additional text or explanation.
        
        Text to translate: {text}"""
        
        completion = openrouter_client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": os.environ.get("OPENROUTER_REFERRER_URL", ""),
                "X-Title": os.environ.get("OPENROUTER_SITE_NAME", ""),
            },
            model="meta-llama/llama-4-scout",
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )
        
        translated_text = completion.choices[0].message.content.strip()
        return translated_text
        
    except Exception as e:
        print(f"OpenRouter translation failed: {e}")
        return text  # Return original text on failure

def synthesize_speech_polly(text: str, target_language: str, voice_id: str) -> bytes:
    """Synthesize speech using AWS Polly"""
    polly_client = boto3.client(
        'polly',
        region_name='us-west-2',
        aws_access_key_id='AKIA4MTWHYPUQPV3OP6A',
        aws_secret_access_key='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'
    )
    
    # Map language codes to Polly language codes
    lang_map = {
        "es-ES": "es-ES", "fr-FR": "fr-FR", "de-DE": "de-DE", "it-IT": "it-IT",
        "pt-BR": "pt-BR", "ja-JP": "ja-JP", "ko-KR": "ko-KR", "zh-CN": "cmn-CN",
        "ar-SA": "arb", "en": "en-US", "en-GB": "en-GB", "ru-RU": "ru-RU",
        "nl-NL": "nl-NL", "sv-SE": "sv-SE", "da-DK": "da-DK", "no-NO": "nb-NO",
        "fi-FI": "fi-FI", "pl-PL": "pl-PL"
    }
    
    # Voices that require the neural engine
    neural_voices = {
        "Sergio", "Enrique", "Conchita", "Lucia", "Lupe", "Penelope", "Miguel",  # Spanish
        "Lea", "Remy", "Mathieu", "Celine",  # French
        "Daniel", "Vicki", "Hans", "Marlene",  # German
        "Bianca", "Giorgio", "Carla",  # Italian
        "Thiago", "Camila", "Ricardo", "Vitoria",  # Portuguese
        "Matthew", "Joanna", "Kendra", "Kimberly", "Salli", "Joey", "Justin", "Ivy",  # English US
        "Arthur", "Amy", "Brian", "Emma",  # English GB
        "Takumi", "Mizuki", "Seoyeon", "Tomoko",  # Japanese/Korean
        "Zhiyu", "Kangkang",  # Chinese
        "Zeina", "Hala"  # Arabic
    }
    
    polly_lang = lang_map.get(target_language, "en-US")
    
    try:
        # Try neural engine first for better quality, fall back to standard if it fails
        engine = "neural" if voice_id in neural_voices else "standard"
        
        try:
            response = polly_client.synthesize_speech(
                Text=text,
                OutputFormat='mp3',
                VoiceId=voice_id,
                LanguageCode=polly_lang,
                Engine=engine
            )
        except Exception as neural_error:
            if "neural" in str(neural_error).lower() and engine == "neural":
                print(f"Neural engine failed for voice {voice_id}, falling back to standard engine")
                response = polly_client.synthesize_speech(
                    Text=text,
                    OutputFormat='mp3',
                    VoiceId=voice_id,
                    LanguageCode=polly_lang,
                    Engine="standard"
                )
            else:
                raise neural_error
        
        # Convert MP3 to WAV using pydub
        audio_data = response['AudioStream'].read()
        audio_segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
        
        # Export as WAV
        wav_buffer = io.BytesIO()
        audio_segment.export(wav_buffer, format="wav")
        return wav_buffer.getvalue()
        
    except Exception as e:
        print(f"AWS Polly TTS failed: {e}")
        raise

def synthesize_speech_sarvam(text: str, target_language_code: str, sarvam_client, 
                           speaker: str = "abhilash", pitch: float = 0.0, 
                           pace: float = 1.0, loudness: float = 1.0, 
                           sample_rate: int = 16000) -> bytes:
    """Synthesize speech using Sarvam AI with chunking"""
    chunks = chunk_text(text, TTS_MAX_CHARS)
    print(f"TTS chunks: {len(chunks)}")

    if len(chunks) == 1:
        audio = sarvam_client.text_to_speech.convert(
            text=chunks[0],
            model="bulbul:v2",
            speaker=speaker.lower(),
            pitch=pitch,
            target_language_code=target_language_code,
            pace=pace,
            loudness=loudness,
            speech_sample_rate=sample_rate,
            enable_preprocessing=False
        )
        return base64.b64decode("".join(audio.audios))
    
    # Handle multiple chunks with merging
    audio_segments = []

    for i, chunk in enumerate(chunks):
        try:
            audio = sarvam_client.text_to_speech.convert(
                text=chunk,
                model="bulbul:v2",
                speaker=speaker.lower(),
                pitch=pitch,
                target_language_code=target_language_code,
                pace=pace,
                loudness=loudness,
                speech_sample_rate=sample_rate,
                enable_preprocessing=False
            )

            audio_data = base64.b64decode("".join(audio.audios))

            try:
                segment = AudioSegment.from_wav(io.BytesIO(audio_data))
            except Exception:
                try:
                    segment = AudioSegment.from_mp3(io.BytesIO(audio_data))
                except Exception:
                    segment = AudioSegment.from_raw(
                        io.BytesIO(audio_data),
                        sample_width=2,
                        frame_rate=sample_rate,
                        channels=1
                    )

            audio_segments.append(segment)
            print(f"TTS Chunk {i+1} processed — {len(segment)} ms")

        except Exception as e:
            print(f"TTS Chunk {i+1} failed: {e}")
            audio_segments.append(AudioSegment.silent(duration=1000))

    if not audio_segments:
        raise Exception("Failed to generate audio")

    # Merge all audio segments
    final_audio = audio_segments[0]
    for seg in audio_segments[1:]:
        final_audio += AudioSegment.silent(duration=200)  # 200ms gap between chunks
        final_audio += seg

    # Export as WAV
    out_buffer = io.BytesIO()
    final_audio.export(out_buffer, format="wav")
    return out_buffer.getvalue()

def download_youtube_video(youtube_url: str, cookies_path: str, output_path: str) -> str:
    """Download YouTube video using yt-dlp with cookies and return the downloaded file path."""
    try:
        # Advanced yt-dlp options for high quality 1080p downloads
        ydl_opts = {
            'cookiefile': cookies_path,
            # Prioritize 1080p quality with comprehensive fallbacks
            'format': (
                'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/'
                'bestvideo[height<=1080]+bestaudio/best[height<=1080]/'
                'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/'
                'best'
            ),
            'outtmpl': output_path,
            'writesubtitles': False,
            'writeautomaticsub': False,
            'ignoreerrors': False,
            'extract_flat': False,
            'writethumbnail': False,
            # Add user agent to avoid bot detection
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            # Enable verbose logging for debugging
            'verbose': False,  # Set to True if you need detailed logs
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"📥 Downloading YouTube video: {youtube_url}")
            
            # First, extract video info to check available formats
            try:
                info = ydl.extract_info(youtube_url, download=False)
                print(f"🔍 Video title: {info.get('title', 'Unknown')}")
                print(f"🔍 Video duration: {info.get('duration', 'Unknown')} seconds")
                
                # Show available formats for debugging
                formats = info.get('formats', [])
                quality_formats = [f for f in formats if f.get('height') and f.get('height') >= 720]
                if quality_formats:
                    print(f"🔍 Available high-quality formats:")
                    for fmt in sorted(quality_formats, key=lambda x: x.get('height', 0), reverse=True)[:5]:
                        height = fmt.get('height', 'Unknown')
                        ext = fmt.get('ext', 'Unknown')
                        filesize = fmt.get('filesize')
                        size_str = f", ~{filesize//1024//1024}MB" if filesize else ""
                        print(f"   - {height}p ({ext}){size_str}")
                else:
                    print(f"⚠️ No high-quality formats found, using best available")
                    
            except Exception as info_error:
                print(f"⚠️ Could not extract format info: {info_error}")
            
            # Download the video
            ydl.download([youtube_url])
            print(f"✅ YouTube video downloaded successfully")
            
            # Verify the downloaded file and get actual resolution
            try:
                # Get video info using ffprobe
                probe_cmd = f'ffprobe -v quiet -print_format json -show_streams "{output_path.replace("%(ext)s", "*")}"'
                result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
                
                if result.returncode == 0:
                    import json
                    probe_data = json.loads(result.stdout)
                    video_streams = [s for s in probe_data.get('streams', []) if s.get('codec_type') == 'video']
                    if video_streams:
                        stream = video_streams[0]
                        width = stream.get('width')
                        height = stream.get('height')
                        if width and height:
                            print(f"✅ Downloaded video resolution: {width}x{height}")
                            if height < 720:
                                print(f"⚠️ Warning: Video quality is lower than expected ({height}p)")
                        else:
                            print(f"✅ Video downloaded (resolution info unavailable)")
                    
            except Exception as probe_error:
                print(f"⚠️ Could not verify video resolution: {probe_error}")
            
            return output_path
            
    except Exception as e:
        print(f"❌ Failed to download YouTube video: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download YouTube video: {str(e)}"
        )

def get_font_for_language(language_code: str) -> str:
    """Get appropriate font based on language"""
    font_map = {
        "hi-IN": "Noto Sans Devanagari",  # For Hindi
        "bn-IN": "Noto Sans Bengali",     # For Bengali
        "gu-IN": "Noto Sans Gujarati",    # For Gujarati  
        "ta-IN": "Noto Sans Tamil",       # For Tamil
        "mr-IN": "Noto Sans Devanagari",  # For Marathi (uses Devanagari script)
        "kn-IN": "Noto Sans Kannada",     # For Kannada (now native support)
        "ml-IN": "Noto Sans Malayalam",   # For Malayalam (now native support)
        "te-IN": "Noto Sans Telugu",      # For Telugu (now native support)
        "pa-IN": "Noto Sans Gurmukhi",    # For Punjabi (Gurmukhi script)
        "od-IN": "Noto Sans Oriya",       # For Odia (now native support)
        "en-IN": "Anton",                 # For English (high-quality display font)
        "as-IN": "Noto Sans Bengali",     # Assamese (uses Bengali script)
        "ur-IN": "DejaVu Sans"            # Fallback for Urdu
    }
    return font_map.get(language_code, "Anton")  # Default to Anton for English/unknown

def create_video_clip(tracks, scores, pyframes_path, pyavi_path, audio_path, output_path, duration, aspect_ratio: str = "9:16", framerate=25):
    if aspect_ratio == "16:9":
        target_width = 1920
        target_height = 1080
    elif aspect_ratio == "1:1":
        target_width = 1080
        target_height = 1080
    else:  # Default to 9:16
        target_width = 1080
        target_height = 1920

    flist = glob.glob(os.path.join(pyframes_path, "*.jpg"))
    flist.sort()

    faces = [[] for _ in range(len(flist))]

    for tidx, track in enumerate(tracks):
        score_array = scores[tidx]
        for fidx, frame in enumerate(track["track"]["frame"].tolist()):
            slice_start = max(fidx - 30, 0)
            slice_end = min(fidx + 30, len(score_array))
            score_slice = score_array[slice_start:slice_end]
            avg_score = float(np.mean(score_slice)
                              if len(score_slice) > 0 else 0)

            faces[frame].append(
                {'track': tidx, 'score': avg_score, 's': track['proc_track']["s"][fidx], 'x': track['proc_track']["x"][fidx], 'y': track['proc_track']["y"][fidx]})

    temp_video_path = os.path.join(pyavi_path, "video_only.mp4")

    vout = None
    for fidx, fname in tqdm(enumerate(flist), total=len(flist), desc=f"Creating {aspect_ratio} video"):
        img = cv2.imread(fname)
        if img is None:
            continue

        current_faces = faces[fidx]

        max_score_face = max(
            current_faces, key=lambda face: face['score']) if current_faces else None

        if max_score_face and max_score_face['score'] < 0:
            max_score_face = None

        if vout is None:
            vout = ffmpegcv.VideoWriterNV(
                file=temp_video_path,
                codec=None,
                fps=framerate,
                resize=(target_width, target_height)
            )

        if max_score_face:
            mode = "crop"
        else:
            mode = "resize"

        if mode == "resize":
            scale = min(target_width / img.shape[1], target_height / img.shape[0])
            resized_width = int(img.shape[1] * scale)
            resized_height = int(img.shape[0] * scale)
            resized_image = cv2.resize(img, (resized_width, resized_height), interpolation=cv2.INTER_AREA)

            scale_for_bg = max(target_width / img.shape[1], target_height / img.shape[0])
            bg_width = int(img.shape[1] * scale_for_bg)
            bg_height = int(img.shape[0] * scale_for_bg)

            blurred_background_resized = cv2.resize(img, (bg_width, bg_height), interpolation=cv2.INTER_AREA)
            blurred_background_resized = cv2.GaussianBlur(blurred_background_resized, (121, 121), 0)

            crop_x = (bg_width - target_width) // 2
            crop_y = (bg_height - target_height) // 2
            blurred_background = blurred_background_resized[crop_y:crop_y + target_height, crop_x:crop_x + target_width]

            center_x = (target_width - resized_width) // 2
            center_y = (target_height - resized_height) // 2
            blurred_background[center_y:center_y + resized_height, center_x:center_x + resized_width] = resized_image

            vout.write(blurred_background)

        elif mode == "crop":
            scale = max(target_width / img.shape[1], target_height / img.shape[0])
            resized_width = int(img.shape[1] * scale)
            resized_height = int(img.shape[0] * scale)
            resized_image = cv2.resize(img, (resized_width, resized_height), interpolation=cv2.INTER_AREA)

            face_center_x = int(max_score_face["x"] * scale)
            face_center_y = int(max_score_face["y"] * scale)

            crop_x = max(0, min(face_center_x - target_width // 2, resized_width - target_width))
            crop_y = max(0, min(face_center_y - target_height // 2, resized_height - target_height))

            image_cropped = resized_image[crop_y:crop_y + target_height, crop_x:crop_x + target_width]

            vout.write(image_cropped)

    if vout:
        vout.release()

    fade_duration = min(1, duration)
    fade_start = max(0, duration - fade_duration)

    ffmpeg_command = (f"ffmpeg -y -i {temp_video_path} -i {audio_path} "
                      f"-af \"afade=t=out:st={fade_start}:d={fade_duration}\" "
                      f"-c:v h264 -preset fast -crf 23 -c:a aac -b:a 128k "
                      f"{output_path}")
    subprocess.run(ffmpeg_command, shell=True, check=True, text=True)

def hex_to_bgr_color(hex_color: str) -> pysubs2.Color:
    """Convert hex color to BGR Color object for pysubs2"""
    if hex_color.startswith('#'):
        hex_color = hex_color[1:]
    
    # Convert hex to RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16) 
    b = int(hex_color[4:6], 16)
    
    # pysubs2 uses BGR format
    return pysubs2.Color(b, g, r)

def create_subtitles_with_ffmpeg(transcript_segments: list, clip_start: float, clip_end: float, 
                               clip_video_path: str, output_path: str, max_words: int = 5, 
                               target_language: str = None, aspect_ratio: str = "9:16", 
                               subtitle_position: str = "bottom", subtitle_customization: SubtitleCustomization = None):
    
    # Use subtitle_customization if provided, otherwise fall back to individual parameters
    if subtitle_customization is None:
        subtitle_customization = SubtitleCustomization(
            enabled=True,
            position=subtitle_position,
            max_words_per_line=max_words
        )
    
    if not subtitle_customization.enabled:
        # If subtitles are disabled, just copy the input to output
        shutil.copy(clip_video_path, output_path)
        return
    
    temp_dir = os.path.dirname(output_path)
    subtitle_path = os.path.join(temp_dir, "temp_subtitles.ass")

    clip_segments = [segment for segment in transcript_segments
                     if segment.get("start") is not None
                     and segment.get("end") is not None
                     and segment.get("end") > clip_start
                     and segment.get("start") < clip_end
                     ]

    # Group words into lines, preserving word-level timing
    subtitle_lines = []
    if clip_segments:
        current_line_words = []
        max_words_per_line = subtitle_customization.max_words_per_line or max_words
        for segment in clip_segments:
            word = segment.get("word", "").strip()
            seg_start = segment.get("start")
            seg_end = segment.get("end")

            if not word or seg_start is None or seg_end is None:
                continue

            start_rel = max(0.0, seg_start - clip_start)
            end_rel = max(0.0, seg_end - clip_start)

            if end_rel <= 0:
                continue
            
            word_info = {"text": word, "start": start_rel, "end": end_rel}

            if len(current_line_words) >= max_words_per_line:
                subtitle_lines.append(current_line_words)
                current_line_words = [word_info]
            else:
                current_line_words.append(word_info)
        
        if current_line_words:
            subtitle_lines.append(current_line_words)

    subs = pysubs2.SSAFile()

    # Set resolution and default dimensions based on aspect ratio
    if aspect_ratio == "16:9":
        play_res_x = 1920
        play_res_y = 1080
        default_font_size = 100
        default_margin_v = 80
    elif aspect_ratio == "1:1":
        play_res_x = 1080
        play_res_y = 1080
        default_font_size = 80
        default_margin_v = 70
    else:  # Default to 9:16
        play_res_x = 1080
        play_res_y = 1920
        default_font_size = 120
        default_margin_v = 160

    subs.info["WrapStyle"] = 0
    subs.info["ScaledBorderAndShadow"] = "yes"
    subs.info["PlayResX"] = play_res_x
    subs.info["PlayResY"] = play_res_y
    subs.info["ScriptType"] = "v4.00+"

    style_name = "Default"
    new_style = pysubs2.SSAStyle()
    
    # Font configuration
    if subtitle_customization.font_family:
        new_style.fontname = subtitle_customization.font_family
    else:
        new_style.fontname = get_font_for_language(target_language) if target_language else "Anton"
    
    # Font size
    new_style.fontsize = subtitle_customization.font_size or default_font_size
    new_style.bold = True  # Make font bold for emphasis
    
    # Colors
    new_style.primarycolor = hex_to_bgr_color(subtitle_customization.font_color or "#FFFFFF")
    
    # Outline
    new_style.outline = subtitle_customization.outline_width or 2.0
    new_style.outlinecolor = hex_to_bgr_color(subtitle_customization.outline_color or "#000000")
    
    # Shadow
    if subtitle_customization.shadow_enabled:
        new_style.shadow = subtitle_customization.shadow_offset or 2.0
        new_style.shadowcolor = hex_to_bgr_color(subtitle_customization.shadow_color or "#000000")
    else:
        new_style.shadow = 0.0
    
    # Background (if specified)
    if subtitle_customization.background_color:
        # Convert background color and apply opacity
        bg_color = hex_to_bgr_color(subtitle_customization.background_color)
        opacity = int((subtitle_customization.background_opacity or 0.7) * 255)
        new_style.backcolor = pysubs2.Color(bg_color.r, bg_color.g, bg_color.b, 255 - opacity)
        new_style.borderstyle = 3  # Box background
    else:
        new_style.borderstyle = 1  # Outline only
    
    # Position alignment
    position = subtitle_customization.position or subtitle_position
    if position == "top":
        new_style.alignment = 8  # Top-center
    elif position == "middle":
        new_style.alignment = 5  # Middle-center
    else:  # bottom
        new_style.alignment = 2  # Bottom-center

    # Margins
    new_style.marginl = subtitle_customization.margin_horizontal or 50
    new_style.marginr = subtitle_customization.margin_horizontal or 50
    new_style.marginv = subtitle_customization.margin_vertical or default_margin_v
    new_style.spacing = 0.0

    subs.styles[style_name] = new_style

    for line_words in subtitle_lines:
        if not line_words:
            continue
        
        line_start_time = line_words[0]["start"]
        line_end_time = line_words[-1]["end"]
        
        event_text = ""

        if subtitle_customization.karaoke_enabled:
            highlight_color = subtitle_customization.karaoke_highlight_color or "#FFFF00"
            popup_scale = subtitle_customization.karaoke_popup_scale or 1.2
            
            highlight_bgr = hex_to_bgr_color(highlight_color)
            # ASS color format is &HBBGGRR
            highlight_ass_color = f"\\1c&H{highlight_bgr.b:02X}{highlight_bgr.g:02X}{highlight_bgr.r:02X}&"
            
            scale_x = int(100 * popup_scale)
            scale_y = int(100 * popup_scale)

            # Build text with per-word animation for instant highlighting (no fade)
            for i, word_info in enumerate(line_words):
                start_ms = int((word_info["start"] - line_start_time) * 1000)
                end_ms = int((word_info["end"] - line_start_time) * 1000)

                # Ensure we have non-zero durations for ASS animation to work properly
                # For instant effects, use 1ms transitions instead of 0ms
                start_highlight = max(1, start_ms)
                end_highlight = max(start_highlight + 1, end_ms)

                # Use instant style changes without transitions for immediate effect
                word_tag = (
                    f"{{\\r}}"  # Reset styles
                    # Instant highlight at word start (1ms transition for ASS compatibility)
                    f"{{\\t({start_ms},{start_highlight},\\fscx{scale_x}\\fscy{scale_y}{highlight_ass_color})}}"
                    # Instant revert at word end (1ms transition for ASS compatibility)
                    f"{{\\t({end_ms},{end_highlight},\\fscx100\\fscy100\\1c&HFFFFFF&)}}"
                    f"{word_info['text'].upper()}"  # Convert text to uppercase
                )
                event_text += word_tag + " "
            event_text = event_text.strip()
        else:
            # Original logic with fade for the whole line
            text = ' '.join([w['text'] for w in line_words])
            fade_in = subtitle_customization.fade_in_duration or 0.0
            fade_out = subtitle_customization.fade_out_duration or 0.0
            if fade_in > 0 or fade_out > 0:
                fade_in_ms = int(fade_in * 1000)
                fade_out_ms = int(fade_out * 1000)
                event_text = f"{{\\fad({fade_in_ms},{fade_out_ms})}}{text}"
            else:
                event_text = text

        start_time = pysubs2.make_time(s=line_start_time)
        end_time = pysubs2.make_time(s=line_end_time)
        
        line = pysubs2.SSAEvent(start=start_time, end=end_time, text=event_text, style=style_name)
        subs.events.append(line)

    subs.save(subtitle_path)

    ffmpeg_cmd = (f"ffmpeg -y -i {clip_video_path} -vf \"ass={subtitle_path}\" "
                  f"-c:v h264 -preset fast -crf 23 {output_path}")

    subprocess.run(ffmpeg_cmd, shell=True, check=True)


def add_background_music(input_video_path: str, output_video_path: str, background_music_s3_key: str, background_music_volume: float = 0.1):
    """Adds background music to a video with specified volume level."""
    music_path = os.path.join(os.path.dirname(output_video_path), "background_music.mp3")
    
    # Download the background music from S3
    try:
        s3_client = boto3.client("s3")
        s3_client.download_file("jif-backend", background_music_s3_key, music_path)
        print(f"✅ Downloaded background music from S3: {background_music_s3_key}")
    except Exception as e:
        print(f"Failed to download background music from S3: {e}")
        # If background music download fails, just copy the input to output and return
        shutil.copy(input_video_path, output_video_path)
        return

    # Get video duration to match background music length
    try:
        # Get video duration using ffprobe
        duration_cmd = f"ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {input_video_path}"
        duration_result = subprocess.run(duration_cmd, shell=True, capture_output=True, text=True, check=True)
        video_duration = float(duration_result.stdout.strip())
        
        # Clamp volume between 0.0 and 1.0
        volume = max(0.0, min(1.0, background_music_volume))
        
        # Add background music using ffmpeg with proper audio mixing
        # The amix filter mixes the original audio with the background music
        # We use volume filter to adjust the background music volume
        # We use the shortest option to ensure the output duration matches the video
        ffmpeg_cmd = (
            f"ffmpeg -y -i {input_video_path} -i {music_path} "
            f"-filter_complex \"[1:a]volume={volume}[bg]; [0:a][bg]amix=inputs=2:duration=shortest:dropout_transition=2[mixed]\" "
            f"-map 0:v -map \"[mixed]\" -c:v copy -c:a aac -b:a 128k -shortest {output_video_path}"
        )
        
        print(f"🎵 Adding background music with volume {volume:.2f}")
        subprocess.run(ffmpeg_cmd, shell=True, check=True, capture_output=True, text=True)
        print("✅ Background music added successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"Failed to add background music: {e.stderr}")
        # If ffmpeg fails, copy the input to output
        shutil.copy(input_video_path, output_video_path)
    except Exception as e:
        print(f"Error processing background music: {e}")
        # If any other error occurs, copy the input to output
        shutil.copy(input_video_path, output_video_path)

def add_watermark(input_video_path: str, output_video_path: str, watermark_s3_key: str):
    """Adds a watermark to the top-left corner of a video, scaled appropriately."""
    watermark_path = os.path.join(os.path.dirname(output_video_path), "watermark.png")
    
    # Download the watermark image from S3
    try:
        s3_client = boto3.client("s3")
        s3_client.download_file("jif-backend", watermark_s3_key, watermark_path)
    except Exception as e:
        print(f"Failed to download watermark from S3: {e}")
        # If watermark download fails, just copy the input to output and return
        shutil.copy(input_video_path, output_video_path)
        return

    # Add watermark using ffmpeg, scaling it relative to video width and placing it in the top-left corner.
    # The watermark is scaled to be 1/10th of the video's width.
    # The overlay is positioned at 40 pixels from the top and 40 pixels from the left.
    ffmpeg_cmd = (f"ffmpeg -y -i {input_video_path} -i {watermark_path} "
                  f"-filter_complex \"[1:v][0:v]scale2ref=w=main_w/10:h=-1[wm][base];[base][wm]overlay=40:40\" "
                  f"-c:v h264 -preset fast -crf 23 -c:a copy {output_video_path}")
    
    try:
        subprocess.run(ffmpeg_cmd, shell=True, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to add watermark: {e.stderr}")
        # If ffmpeg fails, copy the input to output
        shutil.copy(input_video_path, output_video_path)


def transcribe_audio_for_subtitles(audio_path: str, whisperx_model, language_code: str):
    """Transcribe an audio file to get segments for subtitles."""
    print(f"Transcribing for subtitles: {audio_path}")
    # Clean language code for WhisperX compatibility
    clean_language_code = clean_language_code_for_whisperx(language_code)
    print(f"Using cleaned language code for WhisperX: '{language_code}' -> '{clean_language_code}'")
    
    audio = whisperx.load_audio(audio_path)
    result = whisperx_model.transcribe(audio, batch_size=16, language=clean_language_code)

    # Load alignment model for the target language
    try:
        alignment_model, metadata = whisperx.load_align_model(
            language_code=clean_language_code, device="cuda"
        )
        result = whisperx.align(
            result["segments"],
            alignment_model,
            metadata,
            audio,
            device="cuda",
            return_char_alignments=False,
        )
        print(f"✅ Aligned subtitles using '{clean_language_code}' model.")
    except Exception as e:
        print(f"⚠️ Could not align subtitles for language '{clean_language_code}': {e}")

    segments = []
    if "word_segments" in result:
        for word_segment in result["word_segments"]:
            segment_data = {
                "start": word_segment.get("start"),
                "end": word_segment.get("end"),
                "word": word_segment.get("word"),
            }
            if "speaker" in word_segment:
                segment_data["speaker"] = word_segment.get("speaker")
            segments.append(segment_data)
    return segments

def process_clip(base_dir: str, original_video_path: str, s3_key: str, start_time: float, end_time: float, clip_index: int, transcript_segments: list, whisperx_model, detected_language: str, diarize_segments=None, target_language: str = None, sarvam_client=None, openrouter_client=None, aspect_ratio: str = "9:16", subtitles: bool = True, watermark_s3_key: Optional[str] = None, subtitle_position: str = "bottom", subtitle_customization: SubtitleCustomization = None, background_music_s3_key: Optional[str] = None, background_music_volume: float = 0.1):
    clip_name = f"clip_{clip_index}"
    s3_key_dir = os.path.dirname(s3_key)
    output_s3_key = f"{s3_key_dir}/{clip_name}.mp4"
    print(f"Output S3 key: {output_s3_key}")

    clip_dir = base_dir / clip_name
    clip_dir.mkdir(parents=True, exist_ok=True)

    clip_segment_path = clip_dir / f"{clip_name}_segment.mp4"
    final_video_path = clip_dir / "pyavi" / "video_out.mp4"
    subtitle_output_path = clip_dir / "pyavi" / "video_with_subtitles.mp4"

    (clip_dir / "pywork").mkdir(exist_ok=True)
    pyframes_path = clip_dir / "pyframes"
    pyavi_path = clip_dir / "pyavi"
    audio_path = clip_dir / "pyavi" / "audio.wav"

    pyframes_path.mkdir(exist_ok=True)
    pyavi_path.mkdir(exist_ok=True)

    duration = end_time - start_time
    cut_command = (f"ffmpeg -i {original_video_path} -ss {start_time} -t {duration} "
                   f"{clip_segment_path}")
    subprocess.run(cut_command, shell=True, check=True,
                   capture_output=True, text=True)

    extract_cmd = f"ffmpeg -i {clip_segment_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
    subprocess.run(extract_cmd, shell=True,
                   check=True, capture_output=True)

    # Handle translation and TTS if target language is specified
    translated_segments = transcript_segments
    final_audio_path = audio_path  # Default to original audio
    
    if target_language and target_language not in [None, "null", "", "None"]:
        print(f"🌐 Processing translation and TTS for language: {target_language}")

        # Determine if this is an Indian language or not
        is_indian_language = target_language in INDIAN_LANGUAGES
        print(f"Language {target_language} is {'Indian' if is_indian_language else 'non-Indian'}")

        clip_segments = [segment for segment in transcript_segments
                         if segment.get("start") is not None
                         and segment.get("end") is not None
                         and segment.get("end") > start_time
                         and segment.get("start") < end_time]

        # Debug: Print clip segments to see what we have
        print(f"DEBUG: Found {len(clip_segments)} segments for clip {clip_index}")
        print(f"DEBUG: First few segments: {clip_segments[:3]}")
        
        # Check if speaker information is available
        has_speaker_info = any("speaker" in seg for seg in clip_segments)
        speakers_in_segments = [seg.get("speaker") for seg in clip_segments if "speaker" in seg]
        print(f"DEBUG: has_speaker_info = {has_speaker_info}")
        print(f"DEBUG: speakers_in_segments = {set(speakers_in_segments) if speakers_in_segments else 'None'}")

        # If no speaker info and we have diarization segments, try manual assignment at clip level
        if not has_speaker_info and diarize_segments is not None:
            print("🔧 Attempting manual speaker assignment using diarization segments...")
            
            # Convert diarization segments to a more usable format
            speaker_timeline = []
            if hasattr(diarize_segments, 'itersegments'):
                # Use the proper pyannote.audio API
                for segment, _, speaker in diarize_segments.itersegments(yield_label=True):
                    speaker_timeline.append({
                        'start': segment.start,
                        'end': segment.end, 
                        'speaker': speaker  # This should be SPEAKER_00, SPEAKER_01, etc.
                    })
            else:
                # Fallback for DataFrame-like structure
                for _, row in diarize_segments.iterrows():
                    speaker_timeline.append({
                        'start': row['segment'].start,
                        'end': row['segment'].end, 
                        'speaker': row.get('speaker', row.get('label', 'UNKNOWN'))
                    })
            
            print(f"DEBUG: Found {len(speaker_timeline)} speaker segments from diarization")
            
            # Debug: Print unique speakers
            unique_speakers = set(seg['speaker'] for seg in speaker_timeline)
            print(f"DEBUG: Unique speakers in timeline: {unique_speakers}")
            
            # Assign speakers to clip segments based on timestamp overlap
            assigned_count = 0
            for segment in clip_segments:
                seg_start = segment.get("start")
                seg_end = segment.get("end")
                
                if seg_start is None or seg_end is None:
                    continue
                    
                # Find the speaker segment that has the most overlap with this word
                best_speaker = None
                max_overlap = 0
                
                for speaker_seg in speaker_timeline:
                    # Calculate overlap between word and speaker segment
                    overlap_start = max(seg_start, speaker_seg['start'])
                    overlap_end = min(seg_end, speaker_seg['end'])
                    overlap = max(0, overlap_end - overlap_start)
                    
                    if overlap > max_overlap:
                        max_overlap = overlap
                        best_speaker = speaker_seg['speaker']
                
                # Only assign if we have significant overlap (at least 10% of word duration)
                word_duration = seg_end - seg_start
                if best_speaker and max_overlap > 0 and max_overlap >= word_duration * 0.1:
                    segment["speaker"] = best_speaker
                    assigned_count += 1
            
            print(f"DEBUG: Manually assigned speakers to {assigned_count} clip segments")
            
            # Recheck speaker info after manual assignment
            has_speaker_info = any("speaker" in seg for seg in clip_segments)
            speakers_in_segments = [seg.get("speaker") for seg in clip_segments if "speaker" in seg]
            print(f"DEBUG: After manual assignment - has_speaker_info = {has_speaker_info}")
            print(f"DEBUG: After manual assignment - speakers_in_segments = {set(speakers_in_segments) if speakers_in_segments else 'None'}")

        if not has_speaker_info:
            print("No speaker info found, using single voice TTS.")
            # Fallback to original single-voice logic
            full_text = " ".join([seg.get("word", "") for seg in clip_segments if seg.get("word")])
            if full_text.strip():
                try:
                    if is_indian_language and sarvam_client:
                        # Use Gemini for translation and Sarvam AI for TTS for Indian languages
                        translated_text = translate_text_gemini(full_text, detected_language, target_language, gemini_client)
                        tts_audio_data = synthesize_speech_sarvam(
                            translated_text, target_language, sarvam_client)
                    else:
                        # Use Gemini + AWS Polly for non-Indian languages
                        translated_text = translate_text_gemini(full_text, detected_language, target_language, gemini_client)
                        polly_voices = POLLY_VOICE_MAP.get(target_language, ["Joanna"])
                        voice_id = polly_voices[0]  # Use first voice for single speaker
                        tts_audio_data = synthesize_speech_polly(
                            translated_text, target_language, voice_id)

                    translated_audio_path = clip_dir / "pyavi" / "translated_audio.wav"
                    with open(translated_audio_path, "wb") as f:
                        f.write(tts_audio_data)

                    temp_audio_dir = pathlib.Path(
                        "/tmp") / f"tts_audio_{uuid.uuid4().hex[:8]}"
                    temp_audio_dir.mkdir(exist_ok=True)
                    converted_audio_path = temp_audio_dir / "translated_audio_converted.wav"
                    convert_cmd = f"ffmpeg -y -i {translated_audio_path} -ar 16000 -ac 1 -acodec pcm_s16le {converted_audio_path}"
                    subprocess.run(convert_cmd, shell=True,
                                   check=True, capture_output=True)

                    if converted_audio_path.exists() and converted_audio_path.stat().st_size > 0:
                        final_audio_path = converted_audio_path
                        translated_segments = transcribe_audio_for_subtitles(
                            str(final_audio_path), whisperx_model, target_language)
                    else:
                        final_audio_path = audio_path
                except Exception as e:
                    print(f"Single-voice TTS failed: {e}")
                    final_audio_path = audio_path
        else:
            print("Speaker info found, using multi-voice TTS.")
            try:
                speakers = sorted(list(set(seg.get("speaker")
                                  for seg in clip_segments if "speaker" in seg)))
                
                if is_indian_language and sarvam_client:
                    # Use Sarvam AI voices for Indian languages - limit to actual number of speakers
                    available_voices = ["abhilash", "karun", "hitesh"]
                    # Only use as many voices as we have speakers, not cycling through all available voices
                    voices_to_use = available_voices[:len(speakers)]
                    voice_map = {speaker: voices_to_use[i] for i, speaker in enumerate(speakers)}
                else:
                    # Use AWS Polly voices for non-Indian languages
                    polly_voices = POLLY_VOICE_MAP.get(target_language, ["Joanna", "Matthew"])
                    # Ensure we cycle through all available voices for better distinction
                    voice_map = {}
                    for i, speaker in enumerate(speakers):
                        voice_map[speaker] = polly_voices[i % len(polly_voices)]
                
                print(f"Voice map: {voice_map}")
                print(f"Total unique speakers: {len(speakers)}")
                if not is_indian_language:
                    print(f"Available voices for {target_language}: {polly_voices}")
                else:
                    print(f"Available Sarvam voices: {available_voices}")

                speaker_groups = []
                if clip_segments:
                    current_group = {"speaker": clip_segments[0].get(
                        "speaker"), "text": "", "start": clip_segments[0]["start"], "end": clip_segments[0]["end"]}
                    for seg in clip_segments:
                        speaker = seg.get("speaker")
                        if speaker == current_group["speaker"]:
                            current_group["text"] += seg.get("word", "") + " "
                            current_group["end"] = seg["end"]
                        else:
                            if current_group['text'].strip():
                                speaker_groups.append(current_group)
                            current_group = {"speaker": speaker, "text": seg.get(
                                "word", "") + " ", "start": seg["start"], "end": seg["end"]}
                    if current_group['text'].strip():
                        speaker_groups.append(current_group)

                print(f"Speaker groups: {speaker_groups}")
                final_translated_audio = AudioSegment.empty()
                last_segment_end_time = start_time

                for group in tqdm(speaker_groups, desc="Processing speaker segments"):
                    text = group["text"].strip()
                    speaker_id = group["speaker"]
                    if not text or not speaker_id:
                        continue

                    silence_duration = (
                        group["start"] - last_segment_end_time) * 1000
                    if silence_duration > 10:  # Add a small tolerance
                        final_translated_audio += AudioSegment.silent(
                            duration=silence_duration)

                    voice = voice_map.get(speaker_id, "abhilash" if is_indian_language else "Joanna")
                    print(f"Assigning voice '{voice}' to speaker '{speaker_id}'")
                    
                    if is_indian_language and sarvam_client:
                        # Use Gemini for translation and Sarvam AI for TTS for Indian languages
                        translated_text = translate_text_gemini(text, detected_language, target_language, gemini_client)
                        tts_audio_data = synthesize_speech_sarvam(
                            translated_text, target_language, sarvam_client, speaker=voice)
                    else:
                        # Use Gemini + AWS Polly for non-Indian languages
                        translated_text = translate_text_gemini(text, detected_language, target_language, gemini_client)
                        tts_audio_data = synthesize_speech_polly(
                            translated_text, target_language, voice)

                    segment_audio = AudioSegment.from_wav(
                        io.BytesIO(tts_audio_data))
                    final_translated_audio += segment_audio
                    last_segment_end_time = group["end"]

                if len(final_translated_audio) > 0:
                    translated_audio_path = clip_dir / "pyavi" / "translated_audio_multivoice.wav"
                    final_translated_audio.export(
                        translated_audio_path, format="wav")

                    temp_audio_dir = pathlib.Path(
                        "/tmp") / f"tts_audio_{uuid.uuid4().hex[:8]}"
                    temp_audio_dir.mkdir(exist_ok=True)
                    converted_audio_path = temp_audio_dir / "translated_audio_converted.wav"
                    convert_cmd = f"ffmpeg -y -i {translated_audio_path} -ar 16000 -ac 1 -acodec pcm_s16le {converted_audio_path}"
                    subprocess.run(convert_cmd, shell=True,
                                   check=True, capture_output=True)

                    if converted_audio_path.exists() and converted_audio_path.stat().st_size > 0:
                        final_audio_path = converted_audio_path
                        translated_segments = transcribe_audio_for_subtitles(
                            str(final_audio_path), whisperx_model, target_language)
                    else:
                        final_audio_path = audio_path
                else:
                    final_audio_path = audio_path

            except Exception as e:
                print(
                    f"Multi-voice TTS failed: {e}, falling back to original audio.")
                final_audio_path = audio_path
                translated_segments = transcript_segments
    else:
        print(
            f"🎵 Using original English audio (target_language: {target_language})")
        final_audio_path = audio_path
        translated_segments = transcript_segments

    shutil.copy(clip_segment_path, base_dir / f"{clip_name}.mp4")

    columbia_command = (f"python Columbia_test.py --videoName {clip_name} "
                        f"--videoFolder {str(base_dir)} "
                        f"--pretrainModel weight/finetuning_TalkSet.model")

    columbia_start_time = time.time()
    subprocess.run(columbia_command, cwd="/asd", shell=True)
    columbia_end_time = time.time()
    print(
        f"Columbia script completed in {columbia_end_time - columbia_start_time:.2f} seconds")

    tracks_path = clip_dir / "pywork" / "tracks.pckl"
    scores_path = clip_dir / "pywork" / "scores.pckl"
    if not tracks_path.exists() or not scores_path.exists():
        raise FileNotFoundError("Tracks or scores not found for clip")

    with open(tracks_path, "rb") as f:
        tracks = pickle.load(f)

    with open(scores_path, "rb") as f:
        scores = pickle.load(f)

    # Always create video with ORIGINAL audio (Columbia-safe)
    print(f"Creating video with original audio: {audio_path}")
    cvv_start_time = time.time()
    create_video_clip(
        tracks, scores, pyframes_path, pyavi_path, audio_path, final_video_path, duration, aspect_ratio=aspect_ratio
    )
    cvv_end_time = time.time()
    print(
        f"Clip {clip_index} video creation time: {cvv_end_time - cvv_start_time:.2f} seconds")

    # Debug audio paths with comprehensive checks
    print(f"Debug: final_audio_path = {final_audio_path}")
    print(f"Debug: audio_path = {audio_path}")
    print(f"Debug: final_audio_path != audio_path = {final_audio_path != audio_path}")
    
    # Check if final_audio_path is a Path object or string and handle accordingly
    if hasattr(final_audio_path, 'exists'):
        file_exists = final_audio_path.exists()
        file_size = final_audio_path.stat().st_size if file_exists else 0
    else:
        file_exists = os.path.exists(str(final_audio_path))
        file_size = os.path.getsize(str(final_audio_path)) if file_exists else 0
    
    print(f"Debug: final_audio_path.exists() = {file_exists}")
    print(f"Debug: final_audio_path file size = {file_size} bytes")

    # Replace audio in the video if we have translated audio
    if final_audio_path != audio_path and file_exists and file_size > 0:
        print(f"✅ Replacing audio with translated version: {final_audio_path}")
        video_with_new_audio_path = clip_dir / "pyavi" / "video_with_new_audio.mp4"
        
        fade_duration = min(1, duration)
        fade_start = max(0, duration - fade_duration)

        replace_audio_cmd = (f"ffmpeg -y -i {final_video_path} -i {final_audio_path} "
                           f"-af \"afade=t=out:st={fade_start}:d={fade_duration}\" "
                           f"-c:v copy -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 "
                           f"-shortest {video_with_new_audio_path}")
        result = subprocess.run(replace_audio_cmd, shell=True, check=True, capture_output=True, text=True)
        print("✅ Audio replacement completed successfully")
        # Use the new video for subtitles
        source_video_for_subtitles = video_with_new_audio_path
    else:
        print(f"❌ Using original audio - Condition failed:")
        print(f"  - Different paths: {final_audio_path != audio_path}")
        print(f"  - File exists: {file_exists}")
        print(f"  - File size > 0: {file_size > 0}")
        source_video_for_subtitles = final_video_path
    
    final_output_path = source_video_for_subtitles

    # Handle subtitle generation with new customization options
    if subtitles or (subtitle_customization and subtitle_customization.enabled):
        print("✅ Generating subtitles...")
        if final_audio_path != audio_path: # Translation occurred, segments are relative to clip start
            create_subtitles_with_ffmpeg(translated_segments, 0,
                                         duration, source_video_for_subtitles, subtitle_output_path, 
                                         max_words=5, target_language=target_language, 
                                         aspect_ratio=aspect_ratio, subtitle_position=subtitle_position,
                                         subtitle_customization=subtitle_customization)
        else: # No translation, use original absolute timestamps
            create_subtitles_with_ffmpeg(translated_segments, start_time,
                                         end_time, source_video_for_subtitles, subtitle_output_path, 
                                         max_words=5, target_language=target_language, 
                                         aspect_ratio=aspect_ratio, subtitle_position=subtitle_position,
                                         subtitle_customization=subtitle_customization)
        final_output_path = subtitle_output_path
    else:
        print("❌ Subtitles are disabled by user.")

    if watermark_s3_key:
        print("✅ Adding watermark...")
        watermarked_video_path = clip_dir / "pyavi" / "video_with_watermark.mp4"
        add_watermark(str(final_output_path), str(watermarked_video_path), watermark_s3_key)
        final_output_path = watermarked_video_path

    # Add background music if specified
    if background_music_s3_key:
        print("✅ Adding background music...")
        music_video_path = clip_dir / "pyavi" / "video_with_music.mp4"
        add_background_music(str(final_output_path), str(music_video_path), 
                           background_music_s3_key, background_music_volume)
        final_output_path = music_video_path

    s3_client = boto3.client("s3")
    s3_client.upload_file(
        str(final_output_path), "jif-backend", output_s3_key)
    
    # Clean up temporary audio directory if it was created
    if 'temp_audio_dir' in locals() and temp_audio_dir.exists():
        try:
            shutil.rmtree(temp_audio_dir, ignore_errors=True)
            print(f"Cleaned up temporary audio directory: {temp_audio_dir}")
        except Exception as e:
            print(f"Failed to clean up temp audio dir: {e}")

    return output_s3_key

@app.cls(gpu="L40S", timeout=9000, retries=0, scaledown_window=300, secrets=[modal.Secret.from_name("jif-backend"), modal.Secret.from_name("sarvam-ai"), modal.Secret.from_name("huggingface"), modal.Secret.from_name("openrouter-api-key")], volumes={mount_path: volume})
class AiPodcastClipper:
    @modal.enter()
    def load_model(self):
        from whisperx.diarize import DiarizationPipeline
        print("Loading model")

        self.whisperx_model = whisperx.load_model(
            "large-v2", device="cuda", compute_type="float16")

        # Initialize Diarization Pipeline
        hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        if hf_token:
            self.diarization_pipeline = DiarizationPipeline(
                use_auth_token=hf_token, device="cuda")
            print("Diarization pipeline loaded...")
        else:
            self.diarization_pipeline = None
            print("HUGGINGFACE_TOKEN not found, diarization will be skipped.")

        print("Transcription models loaded...")

        print("Creating OpenRouter client...")
        self.openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
        )
        print("Created OpenRouter client...")

        # Initialize Sarvam AI client if API key is available
        self.sarvam_client = None
        try:
            from sarvamai import SarvamAI
            sarvam_api_key = os.environ.get("SARVAM_API_KEY")
            if sarvam_api_key:
                self.sarvam_client = SarvamAI(api_subscription_key=sarvam_api_key)
                print("Sarvam AI client initialized...")
            else:
                print("SARVAM_API_KEY not found in Modal secrets, multilingual features will be disabled")
        except ImportError:
            print("sarvamai package not available, multilingual features will be disabled")
        except Exception as e:
            print(f"Failed to initialize Sarvam AI client: {e}")
            print("Multilingual features will be disabled")

    

    def manual_speaker_assignment(self, result, diarize_segments):
        """Manually assign speakers to word segments based on timestamp overlap"""
        print("Performing manual speaker assignment...")
        
        if "word_segments" not in result:
            return result
            
        # Convert diarization segments to a more usable format
        speaker_timeline = []
        if hasattr(diarize_segments, 'itersegments'):
            # Use the proper pyannote.audio API
            for segment, _, speaker in diarize_segments.itersegments(yield_label=True):
                speaker_timeline.append({
                    'start': segment.start,
                    'end': segment.end, 
                    'speaker': speaker  # This should be SPEAKER_00, SPEAKER_01, etc.
                })
        else:
            # Fallback for DataFrame-like structure
            for _, row in diarize_segments.iterrows():
                speaker_timeline.append({
                    'start': row['segment'].start,
                    'end': row['segment'].end, 
                    'speaker': row.get('speaker', row.get('label', 'UNKNOWN'))
                })
        
        print(f"DEBUG: Found {len(speaker_timeline)} speaker segments from diarization")
        
        # Debug: Print first few speaker assignments
        unique_speakers = set(seg['speaker'] for seg in speaker_timeline)
        print(f"DEBUG: Unique speakers in timeline: {unique_speakers}")
        
        # Assign speakers to word segments based on timestamp overlap
        assigned_count = 0
        for word_segment in result["word_segments"]:
            word_start = word_segment.get("start")
            word_end = word_segment.get("end")
            
            if word_start is None or word_end is None:
                continue
                
            # Find the speaker segment that has the most overlap with this word
            best_speaker = None
            max_overlap = 0
            
            for speaker_seg in speaker_timeline:
                # Calculate overlap between word and speaker segment
                overlap_start = max(word_start, speaker_seg['start'])
                overlap_end = min(word_end, speaker_seg['end'])
                overlap = max(0, overlap_end - overlap_start)
                
                if overlap > max_overlap:
                    max_overlap = overlap
                    best_speaker = speaker_seg['speaker']
            
            if best_speaker and max_overlap > 0:
                word_segment["speaker"] = best_speaker
                assigned_count += 1
        
        print(f"DEBUG: Manually assigned speakers to {assigned_count} word segments")
        return result

    def transcribe_video_fast(self, base_dir: str, video_path: str) -> tuple[str, object, str]:
        """Fast transcription for identify_clips - skips diarization and alignment"""
        audio_path = base_dir / "audio.wav"
        extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 -threads 0 {audio_path}"
        subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)

        print("Starting fast transcription with WhisperX...")
        start_time = time.time()

        audio = whisperx.load_audio(str(audio_path))
        result = self.whisperx_model.transcribe(audio, batch_size=32)  # Increased batch size

        detected_language = result["language"]
        print(f"✅ Detected language: {detected_language}")

        duration = time.time() - start_time
        print(f"Fast transcription took {duration:.2f} seconds")

        # Extract segments without word-level alignment for speed
        segments = []
        if "segments" in result:
            for segment in result["segments"]:
                if "words" in segment:
                    for word in segment["words"]:
                        segment_data = {
                            "start": word.get("start"),
                            "end": word.get("end"),
                            "word": word.get("word"),
                        }
                        segments.append(segment_data)
                else:
                    # Fallback if no word-level data
                    segment_data = {
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "word": segment.get("text", ""),
                    }
                    segments.append(segment_data)

        return json.dumps(segments), None, detected_language

    def transcribe_video(self, base_dir: str, video_path: str, target_language: Optional[str] = None) -> tuple[str, object, str]:
        audio_path = base_dir / "audio.wav"
        extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 -threads 0 {audio_path}"
        subprocess.run(extract_cmd, shell=True,
                       check=True, capture_output=True)

        print("Starting transcription with WhisperX...")
        start_time = time.time()

        audio = whisperx.load_audio(str(audio_path))
        result = self.whisperx_model.transcribe(audio, batch_size=16)

        # Detect language for alignment
        detected_language = result["language"]
        print(f"✅ Detected language: {detected_language}")

        # Perform speaker diarization only if a target language is provided
        diarize_segments = None
        if target_language and self.diarization_pipeline and target_language not in [None, "null", "", "None"]:
            print("Performing speaker diarization...")
            try:
                diarize_segments = self.diarization_pipeline(audio)
                result = whisperx.assign_word_speakers(diarize_segments, result)
                print("Speaker assignment completed")

                if "word_segments" in result:
                    speakers_with_info = [seg for seg in result["word_segments"] if "speaker" in seg]
                    if len(speakers_with_info) < len(result["word_segments"]) * 0.5:
                        print("WARNING: Low speaker assignment, attempting manual assignment...")
                        result = self.manual_speaker_assignment(result, diarize_segments)
            except Exception as e:
                print(f"Speaker diarization or assignment failed: {e}")
                diarize_segments = None
        else:
            print("Skipping speaker diarization as no target language was provided.")

        # Align transcript
        try:
            # Clean detected language for WhisperX compatibility
            clean_detected_language = clean_language_code_for_whisperx(detected_language)
            print(f"Using cleaned language code for alignment: '{detected_language}' -> '{clean_detected_language}'")
            
            alignment_model, metadata = whisperx.load_align_model(
                language_code=clean_detected_language, device="cuda"
            )
            print(f"✅ Loaded alignment model for '{clean_detected_language}'.")
            result = whisperx.align(
                result["segments"],
                alignment_model,
                metadata,
                audio,
                device="cuda",
                return_char_alignments=False,
            )
            print(f"✅ Aligned transcript using '{clean_detected_language}' model.")
        except Exception as e:
            print(f"⚠️ Could not load/run alignment model for '{clean_detected_language}': {e}.")
            print("Proceeding with unaligned transcript. Timestamps may be less accurate.")

        duration = time.time() - start_time
        print("Transcription and alignment took " + str(duration) + " seconds")

        segments = []
        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segment_data = {
                    "start": word_segment.get("start"),
                    "end": word_segment.get("end"),
                    "word": word_segment.get("word"),
                }
                if "speaker" in word_segment:
                    segment_data["speaker"] = word_segment.get("speaker")
                segments.append(segment_data)

        return json.dumps(segments), diarize_segments, detected_language
    
    def identify_moments(self, transcript: dict, source_language: str, custom_prompt: Optional[str] = None):
        # Build the base prompt
        base_prompt = f"""
This is a video transcript in {source_language}. I am looking to create clips with a minimum of 30 seconds long. The maximum length should be determined by the natural boundaries of the compelling content - let the story, insight, or engaging moment dictate the clip length.

Your task is to find and extract compelling stories, insightful questions and answers, or highly engaging moments from the transcript. The goal is to identify segments with the highest potential to go viral.
"""

        # Add custom prompt if provided
        if custom_prompt:
            base_prompt += f"Specific focus for clip selection: {custom_prompt}"

        base_prompt += """

Please adhere to the following rules for each identified clip:
- Ensure that clips do not overlap with one another.
- Start and end timestamps of the clips should align perfectly with the sentence boundaries in the transcript.
- Only use the start and end timestamps provided in the input; modifying timestamps is not allowed.
- Prioritize capturing complete thoughts, stories, or discussions rather than arbitrary time limits. Include as much relevant content as needed to make the clip coherent and engaging.

For each clip, you must provide a detailed analysis in a JSON object with the following fields: 'start', 'end', 'title', 'summary', 'virality_score', 'related_topics', and 'transcript'.

The 'virality_score' (an integer from 0 to 10) must be calculated based on the following 10 criteria. Assign 1 point for each criterion that is met, and 0 if it is not.

Virality Criteria (1 point each):
1.  **Emotional Hook:** Does the content evoke strong emotions (e.g., joy, anger, awe, inspiration, humor)?
2.  **Relatability:** Is the content highly relatable to a broad audience's experiences or struggles?
3.  **Controversy/Debate:** Does it touch on a controversial or debatable topic that encourages discussion and comments?
4.  **Educational Value:** Does it teach something new, offer a unique insight, or provide practical advice?
5.  **Compelling Storytelling:** Is there a clear and engaging narrative with a beginning, middle, and end?
6.  **Surprise/Novelty:** Does the content contain a surprising fact, an unexpected twist, or a novel idea?
7.  **Trendiness:** Is the topic relevant to current trends, news, or ongoing cultural conversations?
8.  **High Sharability:** Is the clip's message concise, easy to understand, and compelling enough for people to share?
9.  **Inspirational/Aspirational:** Does the content inspire or motivate the viewer?
10. **Humor:** Is the content genuinely funny or entertaining?

Format the output as a list of JSON objects. The output must be a raw JSON array readable by Python's `json.loads()` function.
Example: 
[
    {
        "start": seconds,
        "end": seconds,
        "title": "...",
        "summary": "...",
        "virality_score": 7,
        "related_topics":  ["topic1", "topic2"],
        "transcript": "..."
    },
    clip2, clip3, ...
]

IMPORTANT: Return only the raw JSON array. Do not include any markdown formatting, code blocks like ```json```, or any explanatory text before or after the JSON.

Avoid including:
- Moments of greeting, thanking, or saying goodbye.
- Mundane or low-energy interactions.

You MUST identify at least one clip. If no highly viral moments are found, identify the best available segment, even if it has a low virality score. Do not return an empty list.

The transcript is as follows:

""" + str(transcript)

        completion = self.openrouter_client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": os.environ.get("OPENROUTER_REFERRER_URL", ""),
                "X-Title": os.environ.get("OPENROUTER_SITE_NAME", ""),
            },
            model="meta-llama/llama-4-scout",
            messages=[
                {
                    "role": "user",
                    "content": base_prompt,
                }
            ]
        )
        try:
            response_text = completion.choices[0].message.content
            print(f"Identified moments response: ${response_text}")
            return response_text
        except (AttributeError, ValueError, IndexError) as e:
            # This can happen if the response is malformed or blocked.
            print(f"Could not extract text from OpenRouter response: {e}")
            # Log the full response for debugging.
            print(f"Full OpenRouter response object: {completion}")
            # Return a default safe value (an empty JSON array string).
            return "[]"


    @modal.fastapi_endpoint(method="POST")
    def process_video(self, request: ProcessVideoRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        # Validate that either s3_key or youtube_url is provided, but not both
        if not request.s3_key and not request.youtube_url:
            raise HTTPException(
                status_code=400,
                detail="Either 's3_key' or 'youtube_url' must be provided"
            )
        
        if request.s3_key and request.youtube_url:
            raise HTTPException(
                status_code=400,
                detail="Provide either 's3_key' or 'youtube_url', not both"
            )

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        s3_client = boto3.client("s3")
        
        # Handle YouTube URL or S3 key
        if request.youtube_url:
            print(f"🎬 Processing YouTube video: {request.youtube_url}")
            
            # Generate a unique filename for the downloaded video
            video_filename = f"youtube_video_{uuid.uuid4().hex[:8]}.%(ext)s"
            video_path_template = str(base_dir / video_filename)
            
            # Download YouTube video using yt-dlp with cookies
            try:
                downloaded_video_path = download_youtube_video(
                    request.youtube_url, 
                    "/cookies.txt",  # Path to cookies file in the container
                    video_path_template
                )
                
                # Find the actual downloaded file (yt-dlp replaces %(ext)s with actual extension)
                video_files = list(base_dir.glob("youtube_video_*.mp4")) + list(base_dir.glob("youtube_video_*.webm")) + list(base_dir.glob("youtube_video_*.mkv"))
                if not video_files:
                    raise HTTPException(status_code=400, detail="No video file found after download")
                
                video_path = video_files[0]  # Use the first (and should be only) downloaded file
                print(f"✅ Found downloaded video file: {video_path}")
                
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to download YouTube video: {str(e)}")

            # Determine S3 key for the YouTube video
            if request.s3_key_yt:
                # Use the custom S3 key provided by user
                s3_key = request.s3_key_yt
                print(f"🎯 Using custom S3 key for YouTube video: {s3_key}")
            else:
                # Fallback to s3_folder with auto-generated filename
                s3_key = f"{request.s3_folder}/{uuid.uuid4().hex}.mp4"
                print(f"📁 Using auto-generated S3 key: {s3_key}")
            
            try:
                # Convert to mp4 if it's not already (for S3 storage consistency)
                if not str(video_path).endswith('.mp4'):
                    mp4_path = base_dir / "converted_video.mp4"
                    convert_cmd = f"ffmpeg -i {video_path} -c:v libx264 -c:a aac {mp4_path}"
                    subprocess.run(convert_cmd, shell=True, check=True, capture_output=True, text=True)
                    video_path = mp4_path
                
                s3_client.upload_file(str(video_path), "jif-backend", s3_key)
                print(f"✅ Uploaded YouTube video to S3: {s3_key}")
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to upload video to S3: {str(e)}")
        
        else:
            print(f"📁 Processing S3 video: {request.s3_key}")
            # Download video file from S3
            s3_key = request.s3_key
            video_path = base_dir / "input.mp4"
            s3_client.download_file("jif-backend", s3_key, str(video_path))

        transcript_segments_json, diarize_segments, detected_language = self.transcribe_video(base_dir, video_path, request.target_language)
        transcript_segments = json.loads(transcript_segments_json)

        print("Identifying clip moments")
        identified_moments_raw = self.identify_moments(transcript_segments, detected_language, request.prompt)

        # Handle cases where the raw response might be None or empty
        if not identified_moments_raw:
            print("Received empty response from identify_moments. Defaulting to empty list.")
            identified_moments_raw = "[]"

        cleaned_json_string = identified_moments_raw.strip()
        if cleaned_json_string.startswith("```json"):
            cleaned_json_string = cleaned_json_string[len("```json"):].strip()
        if cleaned_json_string.endswith("```"):
            cleaned_json_string = cleaned_json_string[:-len("```")].strip()
        
        # If after cleaning, the string is empty, default to an empty JSON array
        if not cleaned_json_string:
            cleaned_json_string = "[]"

        try:
            clip_moments = json.loads(cleaned_json_string)
        except json.JSONDecodeError:
            print(f"Failed to decode JSON from Gemini response: {cleaned_json_string}")
            clip_moments = [] # Default to empty list on failure
        if not isinstance(clip_moments, list):
            print("Error: Identified moments is not a list, setting to empty list")
            clip_moments = []
        elif not clip_moments:
            print("No clip moments identified by Gemini AI")
        else:
            print(f"Found {len(clip_moments)} potential clips")

        print(clip_moments)
        print(os.listdir(base_dir))

        # 3. Process clips
        processed_clips = []
        # If number_of_clips is -1, process all identified clips
        clips_to_process = clip_moments if request.number_of_clips == -1 else clip_moments[:request.number_of_clips]
        for index, moment in enumerate(clips_to_process):
            if "start" in moment and "end" in moment:
                print("Processing clip" + str(index) + " from " +
                      str(moment["start"]) + " to " + str(moment["end"]))
                output_s3_key = process_clip(base_dir, video_path, s3_key,
                                             moment["start"], moment["end"], index, transcript_segments,
                                             self.whisperx_model, detected_language,
                                             diarize_segments=diarize_segments, target_language=request.target_language,
                                             sarvam_client=self.sarvam_client, gemini_client=self.gemini_client,
                                             aspect_ratio=request.aspect_ratio, subtitles=request.subtitles,
                                             watermark_s3_key=request.watermark_s3_key, subtitle_position=request.subtitle_position,
                                             subtitle_customization=request.subtitle_customization,
                                             background_music_s3_key=request.background_music_s3_key,
                                             background_music_volume=request.background_music_volume or 0.1)
                
                clip_data = {
                    "title": moment.get("title"),
                    "summary": moment.get("summary"),
                    "virality_score": moment.get("virality_score"),
                    "related_topics": moment.get("related_topics"),
                    "transcript": moment.get("transcript"),
                    "s3_key": output_s3_key
                }
                
                # Include YouTube URL if applicable
                if request.youtube_url:
                    clip_data["youtube_url"] = request.youtube_url
                
                processed_clips.append(clip_data)

        if base_dir.exists(): 
            print(f"Cleaning up temp dir after {base_dir}")
            shutil.rmtree(base_dir, ignore_errors=True)

        # Return response with additional info for YouTube videos
        response = {"processed_clips": processed_clips}
        
        if request.youtube_url:
            response["original_video_s3_key"] = s3_key
            response["youtube_url"] = request.youtube_url
        
        return response if request.youtube_url else processed_clips

    @modal.fastapi_endpoint(method="POST")
    def identify_clips(self, request: IdentifyClipsRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        if not request.s3_key and not request.youtube_url:
            raise HTTPException(
                status_code=400,
                detail="Either 's3_key' or 'youtube_url' must be provided"
            )
        
        if request.s3_key and request.youtube_url:
            raise HTTPException(
                status_code=400,
                detail="Provide either 's3_key' or 'youtube_url', not both"
            )

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        s3_client = boto3.client("s3")
        
        if request.youtube_url:
            print(f"🎬 Identifying clips from YouTube video: {request.youtube_url}")
            video_filename = f"youtube_video_{uuid.uuid4().hex[:8]}.%(ext)s"
            video_path_template = str(base_dir / video_filename)
            
            try:
                downloaded_video_path = download_youtube_video(
                    request.youtube_url, 
                    "/cookies.txt",
                    video_path_template
                )
                video_files = list(base_dir.glob("youtube_video_*.mp4")) + list(base_dir.glob("youtube_video_*.webm")) + list(base_dir.glob("youtube_video_*.mkv"))
                if not video_files:
                    raise HTTPException(status_code=400, detail="No video file found after download")
                video_path = video_files[0]
                print(f"✅ Found downloaded video file: {video_path}")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to download YouTube video: {str(e)}")

            if request.s3_key_yt:
                s3_key = request.s3_key_yt
            else:
                s3_key = f"{request.s3_folder}/{uuid.uuid4().hex}.mp4"
            
            try:
                if not str(video_path).endswith('.mp4'):
                    mp4_path = base_dir / "converted_video.mp4"
                    convert_cmd = f"ffmpeg -i {video_path} -c:v libx264 -c:a aac {mp4_path}"
                    subprocess.run(convert_cmd, shell=True, check=True, capture_output=True, text=True)
                    video_path = mp4_path
                
                s3_client.upload_file(str(video_path), "jif-backend", s3_key)
                print(f"✅ Uploaded YouTube video to S3: {s3_key}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to upload video to S3: {str(e)}")
        
        else:
            print(f"📁 Identifying clips from S3 video: {request.s3_key}")
            s3_key = request.s3_key
            video_path = base_dir / "input.mp4"
            s3_client.download_file("jif-backend", s3_key, str(video_path))

        transcript_segments_json, _, detected_language = self.transcribe_video_fast(base_dir, video_path)
        transcript_segments = json.loads(transcript_segments_json)

        print("Identifying clip moments")
        identified_moments_raw = self.identify_moments(transcript_segments, detected_language, request.prompt)
        
        if not identified_moments_raw:
            identified_moments_raw = "[]"

        cleaned_json_string = identified_moments_raw.strip()
        if cleaned_json_string.startswith("```json"):
            cleaned_json_string = cleaned_json_string[len("```json"):].strip()
        if cleaned_json_string.endswith("```"):
            cleaned_json_string = cleaned_json_string[:-len("```")].strip()
        
        if not cleaned_json_string:
            cleaned_json_string = "[]"

        try:
            clip_moments = json.loads(cleaned_json_string)
        except json.JSONDecodeError:
            print(f"Failed to decode JSON from Gemini response: {cleaned_json_string}")
            clip_moments = []
        if not isinstance(clip_moments, list):
            clip_moments = []

        video_duration = 0
        try:
            duration_cmd = f"ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {video_path}"
            duration_result = subprocess.run(duration_cmd, shell=True, capture_output=True, text=True, check=True)
            video_duration = float(duration_result.stdout.strip())
        except Exception:
            pass

        if base_dir.exists(): 
            shutil.rmtree(base_dir, ignore_errors=True)

        response = {
            "identified_clips": clip_moments,
            "total_clips": len(clip_moments),
            "video_duration": video_duration,
            "detected_language": detected_language,
            "s3_path": s3_key,
        }
        
        if request.youtube_url:
            response["original_video_s3_key"] = s3_key
            response["youtube_url"] = request.youtube_url
        
        return response

    @modal.fastapi_endpoint(method="POST")
    def process_clips(self, request: ProcessClipsRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        if not request.s3_key and not request.youtube_url:
            raise HTTPException(status_code=400, detail="Either 's3_key' or 'youtube_url' must be provided")
        if request.s3_key and request.youtube_url:
            raise HTTPException(status_code=400, detail="Provide either 's3_key' or 'youtube_url', not both")
        if not request.clips:
            raise HTTPException(status_code=400, detail="No clips provided to process")

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"})

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        s3_client = boto3.client("s3")
        
        if request.youtube_url:
            video_filename = f"youtube_video_{uuid.uuid4().hex[:8]}.%(ext)s"
            video_path_template = str(base_dir / video_filename)
            try:
                downloaded_video_path = download_youtube_video(request.youtube_url, "/cookies.txt", video_path_template)
                video_files = list(base_dir.glob("youtube_video_*.mp4")) + list(base_dir.glob("youtube_video_*.webm")) + list(base_dir.glob("youtube_video_*.mkv"))
                if not video_files:
                    raise HTTPException(status_code=400, detail="No video file found after download")
                video_path = video_files[0]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to download YouTube video: {str(e)}")

            if request.s3_key_yt:
                s3_key = request.s3_key_yt
            else:
                s3_key = f"{request.s3_folder}/{uuid.uuid4().hex}.mp4"
            
            try:
                if not str(video_path).endswith('.mp4'):
                    mp4_path = base_dir / "converted_video.mp4"
                    convert_cmd = f"ffmpeg -i {video_path} -c:v libx264 -c:a aac {mp4_path}"
                    subprocess.run(convert_cmd, shell=True, check=True, capture_output=True, text=True)
                    video_path = mp4_path
                s3_client.upload_file(str(video_path), "jif-backend", s3_key)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to upload video to S3: {str(e)}")
        else:
            s3_key = request.s3_key
            video_path = base_dir / "input.mp4"
            s3_client.download_file("jif-backend", s3_key, str(video_path))

        transcript_segments_json, diarize_segments, detected_language = self.transcribe_video(base_dir, video_path, request.target_language)
        transcript_segments = json.loads(transcript_segments_json)

        processed_clips = []
        for index, moment in enumerate(request.clips):
            output_s3_key = process_clip(base_dir, video_path, s3_key,
                                         moment.start, moment.end, index, transcript_segments,
                                         self.whisperx_model, detected_language,
                                         diarize_segments=diarize_segments, target_language=request.target_language,
                                         sarvam_client=self.sarvam_client, gemini_client=self.gemini_client,
                                         aspect_ratio=request.aspect_ratio, subtitles=request.subtitles,
                                         watermark_s3_key=request.watermark_s3_key, subtitle_position="bottom",
                                         subtitle_customization=request.subtitle_customization,
                                         background_music_s3_key=request.background_music_s3_key,
                                         background_music_volume=request.background_music_volume or 0.1)
            
            clip_data = {
                "start": moment.start,
                "end": moment.end,
                "s3_key": output_s3_key
            }
            if request.youtube_url:
                clip_data["youtube_url"] = request.youtube_url
            
            processed_clips.append(clip_data)

        if base_dir.exists(): 
            shutil.rmtree(base_dir, ignore_errors=True)

        response = {"processed_clips": processed_clips}
        if request.youtube_url:
            response["original_video_s3_key"] = s3_key
            response["youtube_url"] = request.youtube_url
        
        return response

    @modal.fastapi_endpoint(method="POST")
    def add_subtitles(self, request: AddSubtitlesRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """Endpoint to add subtitles to an existing video"""
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        s3_client = boto3.client("s3")
        
        # Download video from S3
        print(f"📁 Processing video for subtitles: {request.s3_key}")
        video_path = base_dir / "input.mp4"
        try:
            s3_client.download_file("jif-backend", request.s3_key, str(video_path))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to download video from S3: {str(e)}")

        # Determine output S3 key
        if request.output_s3_key:
            output_s3_key = request.output_s3_key
        else:
            # Auto-generate output key by appending "_subtitled" before file extension
            s3_key_parts = request.s3_key.rsplit('.', 1)
            if len(s3_key_parts) == 2:
                output_s3_key = f"{s3_key_parts[0]}_subtitled.{s3_key_parts[1]}"
            else:
                output_s3_key = f"{request.s3_key}_subtitled.mp4"
        
        print(f"Output S3 key: {output_s3_key}")

        # Transcribe the video to get subtitle segments
        transcript_segments_json, _, detected_language = self.transcribe_video(base_dir, video_path, request.target_language)
        transcript_segments = json.loads(transcript_segments_json)

        # Handle translation and TTS if target language is specified
        translated_audio_path = None
        if request.target_language and request.target_language not in [None, "null", "", "None"]:
            print(f"🌐 Processing translation and TTS for language: {request.target_language}")
            
            # Determine if this is an Indian language or not
            is_indian_language = request.target_language in INDIAN_LANGUAGES
            print(f"Language {request.target_language} is {'Indian' if is_indian_language else 'non-Indian'}")
            
            # Extract full text for translation
            full_text = " ".join([seg.get("word", "") for seg in transcript_segments if seg.get("word")])
            
            if full_text.strip():
                try:
                    # Translate the text using OpenRouter
                    translated_text = translate_text_openrouter(full_text, detected_language, request.target_language, self.openrouter_client)
                    print(f"✅ Translation completed: {translated_text[:100]}...")
                    
                    # Generate TTS audio for the translated text
                    print(f"🎤 Generating TTS audio for translated text...")
                    
                    if is_indian_language and self.sarvam_client:
                        # Use Sarvam AI for Indian languages
                        tts_audio_data = synthesize_speech_sarvam(
                            translated_text, request.target_language, self.sarvam_client)
                    else:
                        # Use AWS Polly for non-Indian languages
                        polly_voices = POLLY_VOICE_MAP.get(request.target_language, ["Joanna"])
                        voice_id = polly_voices[0]  # Use first voice
                        tts_audio_data = synthesize_speech_polly(
                            translated_text, request.target_language, voice_id)
                    
                    # Save translated audio
                    translated_audio_path = base_dir / "translated_audio.wav"
                    with open(translated_audio_path, "wb") as f:
                        f.write(tts_audio_data)
                    print(f"✅ TTS audio generated successfully")
                    
                    # Re-transcribe the translated audio to get accurate timing
                    print(f"🔍 Re-transcribing translated audio for accurate timing...")
                    new_segments = transcribe_audio_for_subtitles(
                        str(translated_audio_path), self.whisperx_model, request.target_language)
                    
                    if new_segments:
                        transcript_segments = new_segments
                        print(f"✅ Re-transcription completed with {len(new_segments)} segments")
                    else:
                        # Fallback: distribute translated words across original timing
                        print(f"⚠️ Re-transcription failed, using word distribution fallback")
                        translated_words = translated_text.split()
                        
                        if len(translated_words) > 0:
                            segments_per_word = len(transcript_segments) / len(translated_words)
                            
                            new_segments = []
                            word_idx = 0
                            
                            for i, segment in enumerate(transcript_segments):
                                if word_idx < len(translated_words):
                                    new_segment = segment.copy()
                                    new_segment["word"] = translated_words[word_idx]
                                    new_segments.append(new_segment)
                                    
                                    # Move to next word based on distribution
                                    if i >= int((word_idx + 1) * segments_per_word) - 1:
                                        word_idx += 1
                                else:
                                    break
                            
                            transcript_segments = new_segments
                        
                except Exception as e:
                    print(f"Translation and TTS failed: {e}, using original text and audio")

        # Create output paths
        video_with_new_audio_path = base_dir / "video_with_new_audio.mp4"
        output_video_path = base_dir / "video_with_subtitles.mp4"

        # Get video duration for subtitle processing
        try:
            duration_cmd = f"ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 {video_path}"
            duration_result = subprocess.run(duration_cmd, shell=True, capture_output=True, text=True, check=True)
            video_duration = float(duration_result.stdout.strip())
        except Exception as e:
            print(f"Could not get video duration: {e}")
            video_duration = 3600  # Default to 1 hour if we can't determine duration

        # Replace audio if we have translated audio
        source_video_for_subtitles = video_path
        if translated_audio_path and translated_audio_path.exists():
            print(f"🔄 Replacing original audio with translated TTS audio...")
            try:
                # Convert translated audio to match video format
                converted_audio_path = base_dir / "translated_audio_converted.wav"
                convert_cmd = f"ffmpeg -y -i {translated_audio_path} -ar 16000 -ac 1 -acodec pcm_s16le {converted_audio_path}"
                subprocess.run(convert_cmd, shell=True, check=True, capture_output=True, text=True)
                
                # Replace audio in video
                fade_duration = min(1, video_duration)
                fade_start = max(0, video_duration - fade_duration)
                
                replace_audio_cmd = (
                    f"ffmpeg -y -i {video_path} -i {converted_audio_path} "
                    f"-af \"afade=t=out:st={fade_start}:d={fade_duration}\" "
                    f"-c:v copy -c:a aac -b:a 128k -map 0:v:0 -map 1:a:0 "
                    f"-shortest {video_with_new_audio_path}"
                )
                subprocess.run(replace_audio_cmd, shell=True, check=True, capture_output=True, text=True)
                
                source_video_for_subtitles = video_with_new_audio_path
                print(f"✅ Audio replacement completed successfully")
                
            except Exception as e:
                print(f"⚠️ Audio replacement failed: {e}, using original audio")
                source_video_for_subtitles = video_path

        # Add subtitles to the video (with or without new audio)
        create_subtitles_with_ffmpeg(
            transcript_segments=transcript_segments,
            clip_start=0,
            clip_end=video_duration,
            clip_video_path=str(source_video_for_subtitles),
            output_path=str(output_video_path),
            max_words=5,
            target_language=request.target_language,
            aspect_ratio=request.aspect_ratio,
            subtitle_position="bottom",
            subtitle_customization=request.subtitle_customization
        )

        # Upload result to S3
        try:
            s3_client.upload_file(str(output_video_path), "jif-backend", output_s3_key)
            print(f"✅ Uploaded subtitled video to S3: {output_s3_key}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload result to S3: {str(e)}")

        # Clean up
        if base_dir.exists():
            print(f"Cleaning up temp dir: {base_dir}")
            shutil.rmtree(base_dir, ignore_errors=True)

        return {
            "success": True,
            "input_s3_key": request.s3_key,
            "output_s3_key": output_s3_key,
            "target_language": request.target_language,
            "aspect_ratio": request.aspect_ratio
        }

@app.local_entrypoint()
def main():
    import requests

    ai_podcast_clipper = AiPodcastClipper()

    url = ai_podcast_clipper.process_video.web_url

    payload = {
        # For S3 uploaded video:
        "s3_key": "test2/h6.mp4",
        
        # For YouTube video (alternative to s3_key):
        # "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        # "s3_key_yt": "my-custom-folder/my-youtube-video.mp4",  # Optional: Custom S3 key for YouTube video and clips
        
        "number_of_clips": 1,
        "prompt": "",
        "target_language": None,  # Optional: Use None for English, or specify language code
        "aspect_ratio": "16:9", # Optional: "9:16", "16:9", "1:1"
        "subtitles": True, # Optional: True or False
        "watermark_s3_key": "JIF-small.png", # Optional: S3 key for the watermark
        "subtitle_position": "bottom", # Optional: "bottom", "middle", "top" (deprecated, use subtitle_customization)
        "subtitle_customization": {  # Optional: Advanced subtitle customization
            "enabled": True,
            "position": "bottom",  # "bottom", "middle", "top"
            "font_size": 120,  # Custom font size
            "font_family": "Anton",  # Font is Anton, bold and all-caps are applied in the code
            "font_color": "#0DE050",  # Green text
            "outline_color": "#000000",  # Black outline
            "outline_width": 2.5,
            "background_color": None,  # Transparent background
            "background_opacity": 0.0,
            "shadow_enabled": True,
            "shadow_color": "#808080",  # Gray shadow
            "shadow_offset": 3.0,
            "max_words_per_line": 6,
            "margin_horizontal": 60,
            "margin_vertical": 180,
            "fade_in_duration": 0.3,  # Fade in time in seconds
            "fade_out_duration": 0.3,   # Fade out time in seconds
            "karaoke_enabled": True,
            "karaoke_highlight_color": "#FFFF00",
            "karaoke_popup_scale": 1
        },
        "background_music_s3_key": "background-music/lofi-chill.mp3",  # Optional: S3 key for background music
        "background_music_volume": 0.15  # Optional: Volume level (0.0 to 1.0), default is 0.1 (subtle)
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer 300205"
    }

    response = requests.post(url, json=payload,
                             headers=headers)
    response.raise_for_status()
    result = response.json()
    print(result)
