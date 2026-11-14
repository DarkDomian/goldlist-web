import { describe, expect, it, vi } from "vitest";
import { WorkerTranslationService, type WorkerLike } from "@/services/translation/client";
import {
  buildTranslationMessages,
  extractTranslation,
  fallbackPrompt,
  translateWithGenerator,
  type GeneratorLike,
} from "@/services/translation/workerCore";
import type { TranslationRequest, TranslationResponse } from "@/services/translation/types";

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
        worker.emit({ type: "status", id: message.id, phase: "translating" });
        worker.emit({ type: "result", id: message.id, translation: "любопытный" });
      });
    };
    const service = new WorkerTranslationService(() => worker);
    const onProgress = vi.fn();

    await expect(service.translate("curious", onProgress)).resolves.toBe("любопытный");
    expect(worker.sent[0]).toMatchObject({ type: "translate", text: "curious" });
    expect(onProgress).toHaveBeenCalledWith({ phase: "translating" });
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
