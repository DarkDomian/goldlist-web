import { describe, expect, it, vi } from "vitest";
import { WorkerTranslationService, type WorkerLike } from "@/services/translation/client";
import {
  buildTranslationMessages,
  extractTranslation,
  fallbackPrompt,
  loadTranslationModel,
  translateWithGenerator,
  type GeneratorLike,
} from "@/services/translation/workerCore";
import type {
  TranslationRequest,
  TranslationResponse,
  TranslationStatus,
} from "@/services/translation/types";

describe("translation worker core", () => {
  it("builds an en to ru text message", () => {
    expect(buildTranslationMessages("curious")).toEqual([
      {
        role: "user",
        content: [
          {
            type: "text",
            source_lang_code: "en",
            target_lang_code: "ru",
            text: "curious",
          },
        ],
      },
    ]);
    expect(fallbackPrompt("curious")).toContain("English text into Russian");
  });

  it("extracts plain and message-shaped output", () => {
    expect(extractTranslation([{ generated_text: " любопытный " }])).toBe("любопытный");
    expect(
      extractTranslation([
        { generated_text: [{ role: "assistant", content: "любопытный" }] },
      ]),
    ).toBe("любопытный");
  });

  it("throws on empty model output", () => {
    expect(() => extractTranslation([])).toThrow();
    expect(() => extractTranslation([{ generated_text: "   " }])).toThrow();
  });

  it("uses the chat template and returns a translation", async () => {
    const tokenizer = {
      apply_chat_template: vi.fn(() => "PROMPT"),
    };
    const generator = Object.assign(
      vi.fn(async () => [{ generated_text: "любопытный" }]),
      { tokenizer },
    ) as unknown as GeneratorLike;

    const result = await translateWithGenerator(generator, "curious");
    expect(result).toBe("любопытный");
    expect(tokenizer.apply_chat_template).toHaveBeenCalledWith(
      buildTranslationMessages("curious"),
      { tokenize: false, add_generation_prompt: true },
    );
    expect(generator).toHaveBeenCalledWith(
      "PROMPT",
      expect.objectContaining({ max_new_tokens: 64, return_full_text: false }),
    );
  });
});

class FakeWorker implements WorkerLike {
  listeners = new Map<string, Set<(event: Event) => void>>();
  sent: TranslationRequest[] = [];
  onMessage?: (message: TranslationRequest) => void;

  postMessage(message: unknown): void {
    this.sent.push(message as TranslationRequest);
    this.onMessage?.(message as TranslationRequest);
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(data: TranslationResponse): void {
    const event = { data } as MessageEvent<TranslationResponse>;
    for (const listener of this.listeners.get("message") ?? []) {
      listener(event as unknown as Event);
    }
  }

  terminate(): void {}
}

describe("loadTranslationModel", () => {
  it("falls back to WebAssembly and keeps aggregate progress monotonic", async () => {
    const statuses: TranslationStatus[] = [];
    const load = vi.fn(
      async (
        device: "webgpu" | "wasm",
        onProgress: (progress: {
          file?: string;
          loaded?: number;
          total?: number;
          progress?: number;
        }) => void,
      ) => {
        if (device === "webgpu") {
          onProgress({ file: "model.onnx", loaded: 80, total: 100 });
          throw new Error("WebGPU unavailable");
        }
        onProgress({ file: "model.onnx", loaded: 10, total: 100 });
        onProgress({ file: "model.onnx", loaded: 50, total: 100 });
        return { generator: true };
      },
    );

    await expect(
      loadTranslationModel({
        hasWebGpu: true,
        load,
        onStatus: (status) => statuses.push(status),
      }),
    ).resolves.toEqual({ generator: true });

    expect(load.mock.calls.map(([device]) => device)).toEqual(["webgpu", "wasm"]);
    const progress = statuses
      .filter((status) => status.phase === "downloading")
      .map((status) => status.progress ?? 0);
    expect(progress).toEqual([...progress].sort((a, b) => a - b));
    expect(statuses).toContainEqual(
      expect.objectContaining({
        phase: "initializing",
        message: expect.stringContaining("WebAssembly"),
      }),
    );
    expect(statuses.at(-1)).toMatchObject({ phase: "ready", progress: 100 });
  });

  it("initializes WebAssembly directly when WebGPU is absent", async () => {
    const statuses: TranslationStatus[] = [];
    const load = vi.fn(async () => "generator");

    await expect(
      loadTranslationModel({
        hasWebGpu: false,
        load,
        onStatus: (status) => statuses.push(status),
      }),
    ).resolves.toBe("generator");
    expect(load).toHaveBeenCalledWith("wasm", expect.any(Function));
    expect(statuses.map((status) => status.phase)).toEqual([
      "initializing",
      "ready",
    ]);
  });
});

describe("WorkerTranslationService", () => {
  it("does not create a worker until translation is requested", () => {
    const factory = vi.fn(() => new FakeWorker());
    new WorkerTranslationService(factory);
    expect(factory).not.toHaveBeenCalled();
  });

  it("sends a request and reports progress and the result", async () => {
    const worker = new FakeWorker();
    worker.onMessage = (message) => {
      queueMicrotask(() => {
        worker.emit({ type: "status", phase: "translating" });
        worker.emit({ type: "result", id: message.id, translation: "любопытный" });
      });
    };
    const service = new WorkerTranslationService(() => worker);
    const onProgress = vi.fn();

    await expect(service.translate("curious", onProgress)).resolves.toBe("любопытный");
    expect(worker.sent[0]).toMatchObject({ type: "translate", text: "curious" });
    expect(onProgress).toHaveBeenCalledWith({ phase: "translating" });
  });

  it("shares one status across subscribers and concurrent requests", async () => {
    const worker = new FakeWorker();
    const service = new WorkerTranslationService(() => worker);
    const firstStatuses: TranslationStatus[] = [];
    const secondStatuses: TranslationStatus[] = [];
    const unsubscribeFirst = service.subscribeStatus((status) =>
      firstStatuses.push(status),
    );
    service.subscribeStatus((status) => secondStatuses.push(status));

    const first = service.translate("curious");
    const second = service.translate("eager");
    expect(worker.sent).toHaveLength(2);
    expect(service.getStatus().phase).toBe("queued");

    worker.emit({ type: "status", phase: "downloading", progress: 40 });
    worker.emit({ type: "status", phase: "initializing" });
    worker.emit({ type: "status", phase: "translating" });

    expect(service.getStatus()).toMatchObject({ phase: "translating" });
    expect(firstStatuses.at(-1)).toMatchObject({ phase: "translating" });
    expect(secondStatuses.at(-1)).toMatchObject({ phase: "translating" });

    const [firstRequest, secondRequest] = worker.sent as [
      TranslationRequest,
      TranslationRequest,
    ];
    worker.emit({ type: "result", id: firstRequest.id, translation: "любопытный" });
    expect(service.getStatus().phase).toBe("translating");
    worker.emit({ type: "result", id: secondRequest.id, translation: "нетерпеливый" });

    await expect(first).resolves.toBe("любопытный");
    await expect(second).resolves.toBe("нетерпеливый");
    expect(service.getStatus().phase).toBe("ready");
    expect(firstStatuses).toEqual(secondStatuses);

    unsubscribeFirst();
    worker.emit({ type: "status", phase: "translating" });
    expect(secondStatuses).toHaveLength(firstStatuses.length + 1);
  });

  it("reports worker errors to every subscriber", async () => {
    const worker = new FakeWorker();
    const service = new WorkerTranslationService(() => worker);
    const statuses: TranslationStatus[] = [];
    service.subscribeStatus((status) => statuses.push(status));

    const translation = service.translate("curious");
    const id = worker.sent[0]!.id;
    worker.emit({ type: "error", id, message: "model unavailable" });

    await expect(translation).rejects.toThrow("model unavailable");
    expect(service.getStatus()).toMatchObject({
      phase: "error",
      message: "model unavailable",
    });
    expect(statuses.at(-1)).toMatchObject({ phase: "error" });
  });

  it("rejects when the worker reports an error", async () => {
    const worker = new FakeWorker();
    worker.onMessage = (message) => {
      queueMicrotask(() => {
        worker.emit({ type: "error", id: message.id, message: "model unavailable" });
      });
    };
    const service = new WorkerTranslationService(() => worker);
    await expect(service.translate("curious")).rejects.toThrow("model unavailable");
  });

  it("times out a request", async () => {
    vi.useFakeTimers();
    try {
      const service = new WorkerTranslationService(() => new FakeWorker(), 50);
      const promise = service.translate("curious");
      const assertion = expect(promise).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(60);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("terminates the worker on dispose", () => {
    const worker = new FakeWorker();
    const terminate = vi.spyOn(worker, "terminate");
    const service = new WorkerTranslationService(() => worker);
    service.translate("curious").catch(() => undefined);
    service.dispose();
    expect(terminate).toHaveBeenCalled();
  });
});
