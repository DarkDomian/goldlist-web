import type { TranslationResponse, TranslationService, TranslationProgress } from "./types";

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

export class WorkerTranslationService implements TranslationService {
  private worker: WorkerLike | undefined;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly onMessage = (event: Event) => {
    const message = (event as MessageEvent<TranslationResponse>).data;
    if (!message || typeof message !== "object" || !("id" in message)) {
      return;
    }

    const request = this.pending.get(message.id);
    if (!request) {
      return;
    }

    if (message.type === "status") {
      request.onProgress?.({
        phase: message.phase,
        progress: message.progress,
        message: message.message,
      });
      return;
    }

    clearTimeout(request.timer);
    this.pending.delete(message.id);

    if (message.type === "result") {
      request.resolve(message.translation);
    } else {
      request.reject(new Error(message.message));
    }
  };

  private readonly onError = () => {
    for (const [id, request] of this.pending) {
      clearTimeout(request.timer);
      request.reject(new Error("The translation worker stopped unexpectedly"));
      this.pending.delete(id);
    }
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
    const worker = this.ensureWorker();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
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
    this.worker?.removeEventListener?.("message", this.onMessage);
    this.worker?.removeEventListener?.("error", this.onError);
    this.worker?.terminate?.();
    this.worker = undefined;
  }
}
