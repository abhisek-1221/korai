import modal
import os
import pathlib
import shutil
import subprocess
import time
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import whisperx
from whisperx.diarize import DiarizationPipeline
from pydantic import BaseModel
import yt_dlp
import json

# Define the request model
class TranscriptionRequest(BaseModel):
    youtube_url: str

# Define the Modal image, reusing parts from app.py
image = (modal.Image.from_registry(
    "nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.10")
    .apt_install(["ffmpeg", "wget", "git", "libcudnn8"])
    .pip_install(
        [
            "numpy==2.0.2",
            "pyannote.audio==3.4.0",
            "pyarrow>=16.0.0",
            "torch",
            "torchaudio",
            "yt-dlp",
            "whisperx @ git+https://github.com/m-bain/whisperx.git",
            "fastapi[standard]"
        ],
    )
    .pip_install(["pydub", "librosa"])
    .add_local_file(local_path="cookies.txt", remote_path="/root/cookies.txt")
)

app = modal.App("youtube-transcriber", image=image)

auth_scheme = HTTPBearer()

@app.cls(gpu="A10G", timeout=900, secrets=[modal.Secret.from_name("huggingface"), modal.Secret.from_name("korai-audio")])
class Transcriber:
    @modal.enter()
    def load_models(self):
        """Load transcription and diarization models into memory."""
        print("Loading WhisperX model...")
        self.whisper_model = whisperx.load_model("large-v2", device="cuda", compute_type="float16")
        print("WhisperX model loaded.")

        hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        if not hf_token:
            raise RuntimeError("HUGGINGFACE_TOKEN secret not found. Please add it to your Modal secrets.")

        print("Loading diarization pipeline...")
        self.diarization_pipeline = DiarizationPipeline(use_auth_token=hf_token, device="cuda")
        print("Diarization pipeline loaded.")

    def download_audio(self, youtube_url: str, download_path: pathlib.Path) -> pathlib.Path:
        """Downloads audio from a YouTube URL and returns the path to the audio file."""
        ydl_opts = {
            'format': 'bestaudio/best',
            'cookiefile': '/root/cookies.txt',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': str(download_path / '%(id)s.%(ext)s'),
            'quiet': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                print(f"Downloading audio from {youtube_url}...")
                ydl.download([youtube_url])
                # Find the downloaded .wav file
                for file in download_path.glob("*.wav"):
                    print(f"Audio downloaded to: {file}")
                    return file
            raise FileNotFoundError("Failed to download or find the audio file after yt-dlp processing.")
        except Exception as e:
            print(f"Error downloading YouTube audio: {e}")
            raise

    @modal.fastapi_endpoint(method="POST")
    def transcribe(self, request: TranscriptionRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """
        Accepts a YouTube URL, transcribes the audio with speaker diarization,
        and returns a timestamped transcript.
        """
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"}
            )

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        try:
            # 1. Download Audio
            audio_path = self.download_audio(request.youtube_url, base_dir)
            audio = whisperx.load_audio(str(audio_path))

            # 2. Transcribe
            print("Transcribing audio...")
            transcription_result = self.whisper_model.transcribe(audio, batch_size=16)
            print("Transcription complete.")

            # 3. Diarize
            print("Performing speaker diarization...")
            diarize_segments = self.diarization_pipeline(audio)
            print("Diarization complete.")

            # 4. Assign speakers to transcription
            print("Assigning speakers to words...")
            result_with_speakers = whisperx.assign_word_speakers(diarize_segments, transcription_result)
            print("Speaker assignment complete.")

            # 5. Format output
            final_segments = []
            if "word_segments" in result_with_speakers:
                 for segment in result_with_speakers["word_segments"]:
                    final_segments.append({
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "text": segment.get("word"),
                        "speaker": segment.get("speaker", "UNKNOWN")
                    })
            # A fallback to sentence level if word segments are not available
            elif "segments" in result_with_speakers:
                for segment in result_with_speakers["segments"]:
                    final_segments.append({
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "text": segment.get("text"),
                        "speaker": segment.get("speaker", "UNKNOWN")
                    })


            return {"transcription": final_segments}

        except Exception as e:
            print(f"An error occurred: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            # 6. Cleanup
            if base_dir.exists():
                print(f"Cleaning up temporary directory: {base_dir}")
                shutil.rmtree(base_dir)
