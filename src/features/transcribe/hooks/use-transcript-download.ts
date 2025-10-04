import { useTranscribeStore } from '../store/transcribe-store';

export const useTranscriptDownload = () => {
  const { transcriptData, videoDetails } = useTranscribeStore();

  const downloadFullTranscript = () => {
    const fullTranscript = transcriptData.map((entry) => entry.text).join(' ');
    downloadFile(
      fullTranscript,
      `transcript-${videoDetails?.title || 'video'}.txt`
    );
  };

  const downloadTimestampedTranscript = () => {
    const formattedTranscript = transcriptData
      .map(
        (entry) => `[${entry.startTime} - ${entry.endTime}]\n${entry.text}\n`
      )
      .join('\n');
    downloadFile(
      formattedTranscript,
      `timestamped-transcript-${videoDetails?.title || 'video'}.txt`
    );
  };

  const downloadSrtSubtitles = () => {
    const srtContent = transcriptData
      .map((entry, index) => {
        const startTime = convertToSrtTime(entry.startTime);
        const endTime = convertToSrtTime(entry.endTime);
        return `${index + 1}\n${startTime} --> ${endTime}\n${entry.text}\n`;
      })
      .join('\n');
    downloadFile(srtContent, `subtitles-${videoDetails?.title || 'video'}.srt`);
  };

  const convertToSrtTime = (timeStr: string): string => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},000`;
  };

  const downloadFile = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return {
    downloadFullTranscript,
    downloadTimestampedTranscript,
    downloadSrtSubtitles
  };
};
