export interface TranslationFileProgress {
  loaded?: number;
  total?: number;
  progress?: number;
}

type FileState = TranslationFileProgress;

function finite(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export interface TranslationProgressAggregator {
  update(file: string, next: TranslationFileProgress): number;
}

export function createProgressAggregator(): TranslationProgressAggregator {
  const files = new Map<string, FileState>();
  let monotonic = 0;

  return {
    update(file, next) {
      files.set(file, { ...files.get(file), ...next });

      let loaded = 0;
      let total = 0;
      let hasTotals = false;
      let progressSum = 0;
      let progressCount = 0;

      for (const state of files.values()) {
        if (finite(state.loaded) && finite(state.total) && state.total > 0) {
          loaded += state.loaded;
          total += state.total;
          hasTotals = true;
        }
        if (finite(state.progress)) {
          progressSum += state.progress;
          progressCount += 1;
        }
      }

      const aggregate = hasTotals
        ? (loaded / total) * 100
        : progressCount > 0
          ? progressSum / progressCount
          : 0;

      monotonic = Math.max(monotonic, clamp(aggregate));
      return monotonic;
    },
  };
}
