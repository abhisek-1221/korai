import { create } from 'zustand';

interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker: string;
  speakerName: string | null;
}

interface Transcription {
  id: string;
  youtubeUrl: string;
  status: string;
  segments: TranscriptionSegment[];
  createdAt: string;
  updatedAt: string;
}

interface SpeakerMapping {
  [speakerId: string]: string; // { "SPEAKER_00": "John Doe" }
}

interface TranscriptionStore {
  transcription: Transcription | null;
  speakerMappings: SpeakerMapping;
  isEditingSpeakers: boolean;
  isSaving: boolean;

  setTranscription: (transcription: Transcription) => void;
  updateSpeakerMapping: (speakerId: string, name: string) => void;
  setIsEditingSpeakers: (isEditing: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  applySpeakerMappings: () => void;
  reset: () => void;
}

export const useTranscriptionStore = create<TranscriptionStore>((set, get) => ({
  transcription: null,
  speakerMappings: {},
  isEditingSpeakers: false,
  isSaving: false,

  setTranscription: (transcription) => {
    // Initialize speaker mappings from existing data
    const mappings: SpeakerMapping = {};
    transcription.segments.forEach((segment) => {
      if (segment.speaker && !mappings[segment.speaker]) {
        mappings[segment.speaker] = segment.speakerName || segment.speaker;
      }
    });

    set({ transcription, speakerMappings: mappings });
  },

  updateSpeakerMapping: (speakerId, name) => {
    set((state) => ({
      speakerMappings: {
        ...state.speakerMappings,
        [speakerId]: name
      }
    }));
  },

  setIsEditingSpeakers: (isEditing) => {
    set({ isEditingSpeakers: isEditing });
  },

  setIsSaving: (isSaving) => {
    set({ isSaving });
  },

  applySpeakerMappings: () => {
    const { transcription, speakerMappings } = get();
    if (!transcription) return;

    // Optimistically update the transcription with new speaker names
    const updatedSegments = transcription.segments.map((segment) => ({
      ...segment,
      speakerName: speakerMappings[segment.speaker] || segment.speaker
    }));

    set({
      transcription: {
        ...transcription,
        segments: updatedSegments
      }
    });
  },

  reset: () => {
    set({
      transcription: null,
      speakerMappings: {},
      isEditingSpeakers: false,
      isSaving: false
    });
  }
}));
