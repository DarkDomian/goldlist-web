import type {
  TranslationProgress,
  TranslationService,
  TranslationStatus,
} from "./types";

export class FakeTranslationService implements TranslationService {
  private readonly listeners = new Set<(status: TranslationStatus) => void>();
  private status: TranslationStatus = { phase: "queued" };

  getStatus = (): TranslationStatus => this.status;

  subscribeStatus = (listener: (status: TranslationStatus) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setStatus(status: TranslationStatus): void {
    this.status = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  async translate(
    text: string,
    onProgress?: (progress: TranslationProgress) => void,
  ): Promise<string> {
    this.setStatus({ phase: "queued" });
    onProgress?.({ phase: "queued" });
    await Promise.resolve();
    this.setStatus({ phase: "translating" });
    onProgress?.({ phase: "translating" });
    await Promise.resolve();
    this.setStatus({ phase: "ready" });
    return `${text} (ru)`;
  }

  dispose(): void {
    this.listeners.clear();
  }
}
