import type { TranslationProgress, TranslationService } from "./types";

export class FakeTranslationService implements TranslationService {
  async translate(
    text: string,
    onProgress?: (progress: TranslationProgress) => void,
  ): Promise<string> {
    onProgress?.({ phase: "loading" });
    await Promise.resolve();
    onProgress?.({ phase: "translating" });
    return `${text} (ru)`;
  }

  dispose(): void {}
}
