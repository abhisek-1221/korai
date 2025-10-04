import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChatStore, type Message } from '../store/chat-store';

export const useSendMessage = () => {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    inputMessage,
    transcript,
    messages,
    hasTranscript,
    isStreaming,
    selectedLLM,
    setMessages,
    addMessage,
    updateLastMessage,
    setInputMessage,
    setIsStreaming,
    setActiveCategory
  } = useChatStore();

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !hasTranscript || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim()
    };

    addMessage(userMessage);
    setInputMessage('');
    setActiveCategory('');
    setIsStreaming(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping users understand video content. You have access to the following video transcript:

${transcript}

Answer questions based on this transcript. Do not use the transcript word in the answers. Be conversational, helpful, and accurate. If something is not mentioned in the transcript, say so.`
            },
            ...messages.filter((m) => m.role !== 'system'),
            userMessage
          ],
          model: selectedLLM
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      // Create empty assistant message
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      };

      // Add the empty message first
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(false); // Stop "thinking" indicator

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      console.log('Starting to read stream...');

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(
              'Stream complete. Total content:',
              accumulatedContent.length,
              'chars'
            );
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk.substring(0, 50));

          // The Vercel AI SDK v3+ sends plain text chunks directly
          // Just add each chunk to the content
          accumulatedContent += chunk;

          // Update the last message with accumulated content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        throw streamError;
      }

      console.log(
        'Final message content:',
        accumulatedContent.substring(0, 100)
      );
      setIsStreaming(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      setIsStreaming(false);
    }
  }, [
    inputMessage,
    transcript,
    messages,
    hasTranscript,
    isStreaming,
    selectedLLM,
    toast,
    addMessage,
    updateLastMessage,
    setInputMessage,
    setIsStreaming,
    setActiveCategory
  ]);

  const abortMessage = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, [setIsStreaming]);

  return { sendMessage, abortMessage };
};
