'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FancyButton } from '@/components/ui/fancy-button';
import {
  Mic,
  MicOff,
  Volume2,
  User,
  Bot,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import FeatureCard from '@/components/hsr/FeatureCard';
import { useToast } from '@/hooks/use-toast';
import type React from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audioUrl?: string;
  language?: string;
}

const LANGUAGES = [
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

export default function VoiceChatViewPage() {
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

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const audioLevelValue = rms * 255;

    setAudioLevel(audioLevelValue);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }
  }, [isRecording]);

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
  const processAudioInput = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessingAudio(true);

    try {
      let finalBlob = audioBlob;
      let fileName = 'recording.wav';

      if (mimeType.includes('webm')) {
        console.log('Converting WebM to WAV format...');
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        finalBlob = await audioBufferToWav(audioBuffer);
        fileName = 'recording.wav';
        audioContext.close();
      }

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

      if (!chatResponse.ok) {
        throw new Error(chatData.error || 'Failed to get AI response');
      }

      if (!chatData.response || chatData.response.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: chatData.response,
        audioUrl,
        language: selectedLanguage
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      let mimeType = 'audio/wav';
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/webm;codecs=opus';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        audioContext.close();
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
    if (!hasTranscript || isRecording || isProcessingAudio) return;

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
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const forceStop = () => {
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

    toast({
      title: 'Stopped',
      description: 'Recording stopped.',
      variant: 'default'
    });
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

  const resetChat = () => {
    setHasTranscript(false);
    setMessages([]);
    setTranscript('');
    setVideoUrl('');
  };

  if (!hasTranscript) {
    return (
      <PageContainer scrollable>
        <div className='flex min-h-[calc(100vh-8rem)] w-full flex-col'>
          <Heading
            title='Talk with Video'
            description='Voice-enabled conversations with YouTube videos in multiple languages'
          />

          <div className='mt-8 flex flex-1 flex-col items-center justify-center'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='w-full max-w-2xl space-y-6'
            >
              <FeatureCard type='voice-chat' />

              <Card>
                <CardContent className='p-4'>
                  <form onSubmit={handleVideoSubmit} className='space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row'>
                      <Input
                        type='url'
                        placeholder='Enter YouTube URL...'
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        className='flex-1'
                        disabled={loading}
                      />
                      <Select
                        value={selectedLanguage}
                        onValueChange={setSelectedLanguage}
                      >
                        <SelectTrigger className='w-full sm:w-48'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FancyButton
                        onClick={(e) => {
                          e.preventDefault();
                          handleVideoSubmit(e);
                        }}
                        loading={loading}
                        label='Activate Agent'
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable>
      <div className='w-full space-y-4'>
        <div className='flex items-start justify-between'>
          <Heading
            title='Voice Chat'
            description={`Speak and chat in ${LANGUAGES.find((l) => l.code === selectedLanguage)?.name}`}
          />
        </div>

        <Card>
          <CardContent className='flex h-[calc(100vh-16rem)] flex-col p-4 md:p-6'>
            {/* Messages area */}
            <div className='flex-1 overflow-hidden'>
              <ScrollArea className='h-full pr-4' ref={scrollAreaRef}>
                <div className='space-y-4 pb-4'>
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`flex max-w-[80%] items-start gap-3 ${
                            message.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                              message.role === 'user'
                                ? 'bg-primary'
                                : message.role === 'system'
                                  ? 'bg-muted'
                                  : 'bg-primary/80'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <User className='text-primary-foreground h-4 w-4' />
                            ) : message.role === 'system' ? (
                              <MessageSquare className='h-4 w-4' />
                            ) : (
                              <Bot className='text-primary-foreground h-4 w-4' />
                            )}
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : message.role === 'system'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-secondary'
                            }`}
                          >
                            <Markdown className='prose prose-sm dark:prose-invert max-w-none'>
                              {message.content}
                            </Markdown>
                            {message.audioUrl && (
                              <div className='mt-2 flex items-center gap-2'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => playAudio(message.audioUrl!)}
                                  className='h-8'
                                >
                                  {isPlayingAudio ? (
                                    <Volume2 className='mr-2 h-3 w-3' />
                                  ) : (
                                    <Volume2 className='mr-2 h-3 w-3' />
                                  )}
                                  Play Audio
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isProcessingAudio && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className='flex justify-center'
                    >
                      <div className='bg-secondary flex items-center gap-3 rounded-lg px-4 py-3'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span className='text-sm'>
                          Processing your speech...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Voice Controls */}
            <div className='mt-4 space-y-4 border-t pt-4'>
              <div className='flex items-center justify-center gap-4'>
                <div className='relative'>
                  <Button
                    onClick={toggleRecording}
                    disabled={isProcessingAudio}
                    size='lg'
                    className={`relative h-16 w-16 rounded-full transition-all ${
                      isRecording
                        ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {isProcessingAudio ? (
                      <Loader2 className='h-6 w-6 animate-spin' />
                    ) : isRecording ? (
                      <MicOff className='h-6 w-6' />
                    ) : (
                      <Mic className='h-6 w-6' />
                    )}
                  </Button>

                  {isRecording && (
                    <div className='border-destructive absolute -inset-2 animate-ping rounded-full border-2 opacity-75' />
                  )}

                  {isRecording && audioLevel > 0 && (
                    <div
                      className='border-primary absolute -inset-1 rounded-full border-2 transition-all duration-100'
                      style={{
                        transform: `scale(${1 + (audioLevel / 255) * 0.5})`,
                        opacity: 0.7 + (audioLevel / 255) * 0.3
                      }}
                    />
                  )}
                </div>

                {/* Force Stop Button */}
                {(isRecording || isProcessingAudio) && (
                  <Button
                    onClick={forceStop}
                    size='lg'
                    variant='destructive'
                    className='h-12 px-6'
                  >
                    Stop
                  </Button>
                )}
              </div>

              <div className='text-center'>
                <p className='text-muted-foreground text-sm'>
                  {isRecording
                    ? 'Speaking... Click microphone to stop'
                    : isProcessingAudio
                      ? 'Processing your speech...'
                      : 'Click microphone to start speaking'}
                </p>
                {isRecording && (
                  <p className='text-muted-foreground mt-1 text-xs'>
                    Audio level: {Math.round(audioLevel)}
                  </p>
                )}
              </div>

              <div className='text-muted-foreground flex items-center justify-between text-xs'>
                <span />
                <Button variant='ghost' size='sm' onClick={resetChat}>
                  Load new video
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} />
    </PageContainer>
  );
}
