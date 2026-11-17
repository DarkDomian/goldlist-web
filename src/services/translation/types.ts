export type TranslationPhase =
  | "queued"
  | "downloading"
  | "initializing"
  | "ready"
  | "translating"
  | "error";

export interface TranslationStatus {
  phase: TranslationPhase;
  progress?: number;
  message?: string;
}

export type TranslationProgress = TranslationStatus;

export interface TranslationService {
  translate(
    text: string,
    onProgress?: (progress: TranslationProgress) => void,
  ): Promise<string>;
  getStatus(): TranslationStatus;
  subscribeStatus(listener: (status: TranslationStatus) => void): () => void;
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
      phase: TranslationPhase;
      progress?: number;
      message?: string;
    }
  | { type: "result"; id: string; translation: string }
  | { type: "error"; id: string; message: string };
