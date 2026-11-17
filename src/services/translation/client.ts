import type {
  TranslationProgress,
  TranslationResponse,
  TranslationService,
  TranslationStatus,
} from "./types";

export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message" | "error", listener: (event: Event) => void): void;
  removeEventListener?(type: "message" | "error", listener: (event: Event) => void): void;
  terminate?(): void;
}

type PendingRequest = {
  resolve: (translation: string) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: TranslationProgress) => void;
  timer: ReturnType<typeof setTimeout>;
};

function createWorker(): WorkerLike {
  return new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as WorkerLike;
}

function sameStatus(a: TranslationStatus, b: TranslationStatus): boolean {
  return (
    a.phase === b.phase && a.progress === b.progress && a.message === b.message
  );
}

export class WorkerTranslationService implements TranslationService {
  private worker: WorkerLike | undefined;
  private readonly pending = new Map<string, PendingRequest>();
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
    if (sameStatus(this.status, status)) {
      return;
    }
    this.status = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  private readonly onMessage = (event: Event) => {
    const message = (event as MessageEvent<TranslationResponse>).data;
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "status") {
      const status = {
        phase: message.phase,
        progress: message.progress,
        message: message.message,
      };
      this.setStatus(status);
      for (const request of this.pending.values()) {
        request.onProgress?.(status);
      }
      return;
    }

    if (!("id" in message)) {
      return;
    }

    const request = this.pending.get(message.id);
    if (!request) {
      return;
    }

    clearTimeout(request.timer);
    this.pending.delete(message.id);

    if (message.type === "result") {
      request.resolve(message.translation);
      this.setStatus({
        phase: this.pending.size > 0 ? "translating" : "ready",
      });
    } else {
      this.setStatus({ phase: "error", message: message.message });
      request.reject(new Error(message.message));
    }
  };

  private readonly onError = () => {
    for (const [id, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(new Error("The translation worker stopped unexpectedly"));
      this.pending.delete(id);
    }
    this.setStatus({
      phase: "error",
      message: "The translation worker stopped unexpectedly",
    });
    this.worker?.terminate?.();
    this.worker = undefined;
  };

  constructor(
    private readonly workerFactory: () => WorkerLike = createWorker,
    private readonly timeoutMs = 120_000,
  ) {}

  private ensureWorker(): WorkerLike {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.addEventListener("message", this.onMessage);
      this.worker.addEventListener("error", this.onError);
    }
    return this.worker;
  }

  translate(
    text: string,
    onProgress?: (progress: TranslationProgress) => void,
  ): Promise<string> {
    if (this.status.phase !== "ready") {
      this.setStatus({ phase: "queued" });
    }
    const worker = this.ensureWorker();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        if (this.pending.size === 0) {
          this.setStatus({ phase: "error", message: "Translation timed out" });
        }
        reject(new Error("Translation timed out"));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, onProgress, timer });
      worker.postMessage({ type: "translate", id, text });
    });
  }

  dispose(): void {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("Translation was cancelled"));
    }
    this.pending.clear();
    this.listeners.clear();
    this.worker?.removeEventListener?.("message", this.onMessage);
    this.worker?.removeEventListener?.("error", this.onError);
    this.worker?.terminate?.();
    this.worker = undefined;
  }
}
