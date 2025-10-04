import { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChatStore, type Message } from '../store/voice-chat-store';

export const useAudioRecording = () => {
  const { toast } = useToast();
  const {
    hasTranscript,
    isRecording,
    isProcessingAudio,
    transcript,
    messages,
    selectedLanguage,
    setIsRecording,
    setIsProcessingAudio,
    setAudioLevel,
    addMessage,
    setMessages,
    setIsPlayingAudio
  } = useVoiceChatStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const audioLevel = rms * 255;

    setAudioLevel(audioLevel);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording, setAudioLevel]);

  // Convert audio buffer to WAV
  const audioBufferToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioBuffer.length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Process audio input
  const processAudioInput = useCallback(
    async (audioBlob: Blob, mimeType: string) => {
      setIsProcessingAudio(true);

      try {
        let finalBlob = audioBlob;
        let fileName = 'recording.wav';

        console.log(
          'Processing audio - MIME type:',
          mimeType,
          'Blob type:',
          audioBlob.type,
          'Size:',
          audioBlob.size
        );

        // Convert to WAV format if it's WebM or other non-WAV formats
        if (
          mimeType.includes('webm') ||
          mimeType.includes('ogg') ||
          mimeType.includes('mp4')
        ) {
          console.log('Converting audio to WAV format...');
          try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            // Don't force sample rate during decode - let it use native rate
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            console.log('Decoded audio:', {
              duration: audioBuffer.duration,
              sampleRate: audioBuffer.sampleRate,
              channels: audioBuffer.numberOfChannels
            });

            // Create WAV blob
            finalBlob = await audioBufferToWav(audioBuffer);
            fileName = 'recording.wav';
            console.log('Converted to WAV - Size:', finalBlob.size);
            audioContext.close();
          } catch (decodeError) {
            console.error('Audio decode failed:', decodeError);
            throw new Error('Failed to decode audio. Please try again.');
          }
        } else {
          console.log('Audio is already in WAV format, no conversion needed');
        }

        // Speech to text
        const formData = new FormData();
        formData.append('audio', finalBlob, fileName);
        formData.append('language', selectedLanguage);

        const sttResponse = await fetch('/api/voice-chat/speech-to-text', {
          method: 'POST',
          body: formData
        });

        const sttData = await sttResponse.json();

        if (!sttResponse.ok) {
          throw new Error(sttData.error || 'Failed to transcribe audio');
        }

        const userText = sttData.text;
        if (!userText.trim()) {
          toast({
            title: 'No Speech Detected',
            description: 'Please try speaking more clearly.',
            variant: 'destructive'
          });
          return;
        }

        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: userText,
          language: selectedLanguage
        };

        addMessage(userMessage);

        // Get AI response
        const chatResponse = await fetch('/api/voice-chat/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            transcript,
            language: selectedLanguage,
            previousMessages: messages.filter((m) => m.role !== 'system')
          })
        });

        const chatData = await chatResponse.json();

        if (!chatResponse.ok) {
          throw new Error(chatData.error || 'Failed to get AI response');
        }

        if (!chatData.response || chatData.response.trim().length === 0) {
          throw new Error('AI returned empty response');
        }

        // Convert to speech
        const ttsResponse = await fetch('/api/voice-chat/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: chatData.response,
            language: selectedLanguage
          })
        });

        if (!ttsResponse.ok) {
          throw new Error('Failed to generate speech');
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const responseBlobAudio = new Blob([audioBuffer], {
          type: 'audio/wav'
        });
        const audioUrl = URL.createObjectURL(responseBlobAudio);

        // Add assistant message with audio
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: chatData.response,
          audioUrl,
          language: selectedLanguage
        };

        addMessage(assistantMessage);

        // Auto-play the response
        playAudio(audioUrl);
      } catch (error: any) {
        console.error('Error processing audio:', error);
        toast({
          title: 'Processing Error',
          description: error.message || 'Failed to process audio input',
          variant: 'destructive'
        });
      } finally {
        setIsProcessingAudio(false);
      }
    },
    [
      selectedLanguage,
      transcript,
      messages,
      toast,
      setIsProcessingAudio,
      addMessage,
      audioBufferToWav
    ]
  );

  // Initialize recording
  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Create audio context for level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Try to use WAV format first, fallback to webm if not supported
      let mimeType = 'audio/wav';
      const supportsWav = MediaRecorder.isTypeSupported('audio/wav');
      const supportsWebm = MediaRecorder.isTypeSupported(
        'audio/webm;codecs=opus'
      );

      console.log('MIME type support:', {
        wav: supportsWav,
        webm: supportsWebm
      });

      if (!supportsWav) {
        mimeType = 'audio/webm;codecs=opus';
      }

      console.log('Using mime type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Recording stopped - Audio blob:', {
          size: audioBlob.size,
          type: audioBlob.type,
          mimeType: mimeType,
          chunks: audioChunksRef.current.length
        });

        // Cleanup first
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();

        // Check if we have valid audio data
        if (audioBlob.size === 0) {
          toast({
            title: 'Recording Error',
            description: 'No audio data captured. Please try again.',
            variant: 'destructive'
          });
          setIsProcessingAudio(false);
          return;
        }

        // Convert to WAV if needed and process
        await processAudioInput(audioBlob, mimeType);
      };

      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Error',
        description: 'Unable to access microphone. Please check permissions.',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!hasTranscript || isRecording || isProcessingAudio) return;

    const initialized = await initializeRecording();
    if (!initialized) return;

    setIsRecording(true);
    setAudioLevel(0);
    recordingStartTimeRef.current = Date.now();
    // Start recording with timeslice to ensure data is captured
    mediaRecorderRef.current?.start(100); // Request data every 100ms
    monitorAudioLevel();

    toast({
      title: 'Recording Started',
      description: 'Speak now... Click the microphone again to stop.',
      variant: 'default'
    });
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        const recordingDuration = Date.now() - recordingStartTimeRef.current;
        console.log('Recording duration:', recordingDuration, 'ms');

        if (recordingDuration < 500) {
          toast({
            title: 'Recording Too Short',
            description: 'Please speak for at least half a second.',
            variant: 'destructive'
          });
          setIsRecording(false);
          setAudioLevel(0);
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          return;
        }

        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setAudioLevel(0);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
        setAudioLevel(0);
      }
    }
  };

  // Force stop - cancels processing
  const forceStop = () => {
    // Stop recording
    if (mediaRecorderRef.current) {
      try {
        // Remove event listeners to prevent processing
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }

        // Stop all tracks
        const stream = mediaRecorderRef.current.stream;
        stream?.getTracks().forEach((track) => track.stop());

        mediaRecorderRef.current = null;
      } catch (error) {
        console.error('Error force stopping:', error);
      }
    }

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Clear chunks
    audioChunksRef.current = [];

    // Reset states
    setIsRecording(false);
    setIsProcessingAudio(false);
    setIsPlayingAudio(false);
    setAudioLevel(0);

    toast({
      title: 'Stopped',
      description: 'Voice chat has been stopped.',
      variant: 'default'
    });
  };

  // Play audio
  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      toast({
        title: 'Audio Error',
        description: 'Failed to play audio response',
        variant: 'destructive'
      });
    };

    audio.play().catch(console.error);
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup
  const cleanup = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  return {
    toggleRecording,
    forceStop,
    playAudio,
    cleanup,
    audioRef
  };
};
