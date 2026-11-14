export type TranslationPhase = "loading" | "downloading" | "ready" | "translating";

export interface TranslationProgress {
  phase: TranslationPhase;
  progress?: number;
  message?: string;
}

export interface TranslationService {
  translate(text: string, onProgress?: (progress: TranslationProgress) => void): Promise<string>;
  dispose(): void;
}

export interface TranslationRequest {
  type: "translate";
  id: string;
  text: string;
}

export type TranslationResponse =
  | {
      type: "status";
      id: string;
      phase: TranslationPhase;
      progress?: number;
      message?: string;
    }
  | { type: "result"; id: string; translation: string }
  | { type: "error"; id: string; message: string };
