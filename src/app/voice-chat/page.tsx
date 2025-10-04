'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  Loader2,
  Youtube,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Bot,
  ArrowUp
} from 'lucide-react';
import type React from 'react';
import { Markdown } from '@/components/ui/markdown';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import FeatureCard from '@/components/hsr/FeatureCard';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string;
  language?: string;
}

export default function VoiceChatPage() {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [audioLevel, setAudioLevel] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'od-IN', name: 'Odia' },
    { code: 'pa-IN', name: 'Punjabi' }
  ];

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === 'recording'
      ) {
        mediaRecorderRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square) for better audio level detection
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const audioLevel = rms * 255; // Convert to 0-255 range

    setAudioLevel(audioLevel);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording]);

  // Initialize audio recording
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
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/webm;codecs=opus';
      }

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

        // Cleanup first, then process
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();

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

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a YouTube URL',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setMessages([]);
    setTranscript('');
    setHasTranscript(false);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transcript');
      }

      if (!data?.transcript?.fullTranscript) {
        throw new Error('No transcript available for this video');
      }

      setTranscript(data.transcript.fullTranscript);
      setHasTranscript(true);

      // Add initial system message
      setMessages([
        {
          id: Date.now().toString(),
          role: 'system',
          content:
            "Voice agent is ready! You can now speak and I'll respond with voice in your selected language."
        }
      ]);

      toast({
        title: 'Success',
        description:
          'Voice Agent Ready. Click the microphone to start speaking!',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch transcript',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!hasTranscript) {
      toast({
        title: 'No Video Context',
        description: 'Please load a YouTube video first to provide context.',
        variant: 'destructive'
      });
      return;
    }

    // Prevent multiple simultaneous recordings
    if (isRecording || isProcessingAudio) {
      return;
    }

    try {
      const initialized = await initializeRecording();
      if (!initialized) return;

      setIsRecording(true);
      setAudioLevel(0);
      mediaRecorderRef.current?.start();
      monitorAudioLevel();

      toast({
        title: 'Recording Started',
        description: 'Speak now... Click the microphone again to stop.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Check if the recorder is in a valid state to stop
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
        toast({
          title: 'Recording Error',
          description: 'Failed to stop recording properly.',
          variant: 'destructive'
        });
      }
    }
  };

  const processAudioInput = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessingAudio(true);

    try {
      // Convert to WAV format if it's WebM
      let finalBlob = audioBlob;
      let fileName = 'recording.wav';

      if (mimeType.includes('webm')) {
        console.log('Converting WebM to WAV format...');
        // Convert WebM to WAV using Web Audio API
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create WAV blob
        finalBlob = await audioBufferToWav(audioBuffer);
        fileName = 'recording.wav';
        audioContext.close();
      }

      // Convert audio to speech using Sarvam AI
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

      setMessages((prev) => [...prev, userMessage]);

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

      console.log('Chat response received:', {
        ok: chatResponse.ok,
        hasResponse: !!chatData.response,
        responseLength: chatData.response?.length,
        responsePreview: chatData.response?.substring(0, 100),
        language: chatData.language
      });

      if (!chatResponse.ok) {
        throw new Error(chatData.error || 'Failed to get AI response');
      }

      if (!chatData.response || chatData.response.trim().length === 0) {
        console.error('Empty response from chat API');
        throw new Error('AI returned empty response');
      }

      // Convert AI response to speech
      console.log('Sending to TTS:', {
        text: chatData.response,
        textLength: chatData.response.length,
        language: selectedLanguage
      });

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
      const responseBlobAudio = new Blob([audioBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(responseBlobAudio);

      // Add assistant message with audio
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: chatData.response,
        audioUrl,
        language: selectedLanguage
      };

      setMessages((prev) => [...prev, assistantMessage]);

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
  };

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

    // Write WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Write audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

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

  const toggleRecording = () => {
    console.log('Toggle recording clicked, current state:', isRecording);

    if (isRecording) {
      console.log('Stopping recording...');
      stopRecording();
    } else {
      console.log('Starting recording...');
      startRecording();
    }
  };

  // Force stop recording (in case of issues)
  const forceStopRecording = () => {
    console.log('Force stopping recording...');
    setIsRecording(false);
    setAudioLevel(0);
    setIsProcessingAudio(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error force stopping recorder:', error);
      }
      mediaRecorderRef.current = null;
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-950 p-2 text-white sm:p-4 lg:p-6 xl:p-8'>
      <Card
        className={`w-full max-w-sm rounded-2xl border-zinc-800 bg-black shadow-xl shadow-stone-600 sm:max-w-md md:max-w-lg lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl ${
          hasTranscript ? 'lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl' : ''
        }`}
      >
        <CardContent className='relative flex min-h-[500px] flex-col p-3 sm:min-h-[600px] sm:p-4 md:min-h-[700px] md:p-6 lg:min-h-[800px] lg:p-8 xl:p-10'>
          <div className='flex flex-1 flex-col pb-20'>
            {!hasTranscript && <FeatureCard type='voice-chat' />}

            {/* Video URL Input - always show, but content below only if transcript */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='mx-auto w-full'
            >
              <form onSubmit={handleVideoSubmit} className='my-4 space-y-4'>
                <div className='flex gap-3'>
                  <div className='relative flex-1'>
                    <Youtube className='absolute top-3 left-3 h-5 w-5 text-orange-400' />
                    <Input
                      type='url'
                      placeholder='Enter YouTube URL...'
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className='border-orange-500/20 bg-black/40 pl-11 text-white placeholder:text-gray-400 focus:border-orange-500/50'
                      disabled={loading}
                    />
                  </div>
                  <Select
                    value={selectedLanguage}
                    onValueChange={setSelectedLanguage}
                  >
                    <SelectTrigger className='w-48 border-orange-500/20 bg-black/40 text-white focus:border-orange-500/50'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    type='submit'
                    disabled={loading || !videoUrl.trim()}
                    className='border-orange-500 bg-orange-600 text-white hover:bg-orange-700'
                  >
                    {loading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <ArrowUp className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>

            {hasTranscript && (
              <div className='flex flex-1 flex-col'>
                {/* Chat Area */}
                <ScrollArea
                  ref={scrollAreaRef}
                  className='h-[400px] flex-1 pr-4'
                >
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`mb-6 flex ${
                          message.role === 'user'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                              : message.role === 'system'
                                ? 'border border-orange-500/20 bg-orange-900/20 text-orange-200'
                                : 'border border-orange-500/20 bg-black/40 text-white'
                          }`}
                        >
                          <div className='flex items-start gap-3'>
                            <div className='mt-1 flex-shrink-0'>
                              {message.role === 'user' ? (
                                <User className='h-4 w-4' />
                              ) : message.role === 'assistant' ? (
                                <Bot className='h-4 w-4' />
                              ) : (
                                <MessageSquare className='h-4 w-4' />
                              )}
                            </div>
                            <div className='flex-1'>
                              <Markdown>{message.content}</Markdown>
                              {message.audioUrl && (
                                <div className='mt-3 flex items-center gap-2'>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => playAudio(message.audioUrl!)}
                                    className='border-orange-500/30 bg-black/20 text-white hover:border-orange-500/50 hover:bg-orange-600/20'
                                  >
                                    {isPlayingAudio ? (
                                      <VolumeX className='h-4 w-4' />
                                    ) : (
                                      <Volume2 className='h-4 w-4' />
                                    )}
                                    Play Audio
                                  </Button>
                                  {message.language && (
                                    <span className='text-xs text-orange-400'>
                                      {
                                        languages.find(
                                          (l) => l.code === message.language
                                        )?.name
                                      }
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isProcessingAudio && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className='mb-6 flex justify-center'
                    >
                      <div className='flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-black/40 px-6 py-4'>
                        <Loader2 className='h-5 w-5 animate-spin text-orange-500' />
                        <span className='text-white'>
                          Processing your speech...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </ScrollArea>

                {/* Voice Input Controls */}
                <div className='mt-6 flex items-center justify-center gap-4'>
                  <div className='relative'>
                    <Button
                      onClick={toggleRecording}
                      disabled={!hasTranscript || isProcessingAudio}
                      className={`relative h-16 w-16 rounded-full transition-all duration-200 ${
                        isRecording
                          ? 'animate-pulse bg-red-600 shadow-lg shadow-red-500/30 hover:bg-red-700'
                          : 'bg-gradient-to-r from-orange-600 to-red-600 shadow-lg shadow-orange-500/30 hover:from-orange-700 hover:to-red-700'
                      } ${!hasTranscript ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {isProcessingAudio ? (
                        <Loader2 className='h-6 w-6 animate-spin text-white' />
                      ) : isRecording ? (
                        <MicOff className='h-6 w-6 text-white' />
                      ) : (
                        <Mic className='h-6 w-6 text-white' />
                      )}
                    </Button>

                    {/* Audio level indicator */}
                    {isRecording && (
                      <div className='absolute -inset-2 animate-ping rounded-full border-2 border-red-400 opacity-75' />
                    )}

                    {isRecording && audioLevel > 0 && (
                      <div
                        className='absolute -inset-1 rounded-full border-2 border-orange-400 transition-all duration-100'
                        style={{
                          transform: `scale(${1 + (audioLevel / 255) * 0.5})`,
                          opacity: 0.7 + (audioLevel / 255) * 0.3
                        }}
                      />
                    )}
                  </div>

                  {/* Emergency stop button (only show when recording) */}
                  {isRecording && (
                    <Button
                      onClick={forceStopRecording}
                      variant='outline'
                      size='sm'
                      className='border-red-500/30 bg-red-900/20 text-red-300 hover:border-red-500/50 hover:bg-red-900/40'
                    >
                      Force Stop
                    </Button>
                  )}
                </div>

                {/* Instructions */}
                <div className='mt-4 text-center'>
                  <p className='text-sm text-gray-400'>
                    {!hasTranscript
                      ? 'Load a YouTube video to start voice conversation'
                      : isRecording
                        ? 'Speaking... Click microphone to stop'
                        : isProcessingAudio
                          ? 'Processing your speech...'
                          : 'Click microphone to start speaking'}
                  </p>
                  {isRecording && (
                    <p className='mt-1 text-xs text-orange-400'>
                      Recording active - audio level: {Math.round(audioLevel)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
