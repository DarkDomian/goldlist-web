import { pipeline } from "@huggingface/transformers";
import type { TranslationRequest, TranslationResponse } from "./types";
import type { GeneratorLike } from "./workerCore";
import { TRANSLATION_MODEL_ID, translateWithGenerator } from "./workerCore";

type WorkerScope = {
  onmessage: ((event: MessageEvent<TranslationRequest>) => void) | null;
  postMessage: (message: TranslationResponse) => void;
};

const scope = self as unknown as WorkerScope;
let generatorPromise: Promise<GeneratorLike> | undefined;

function post(message: TranslationResponse): void {
  scope.postMessage(message);
}

function hasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

async function getGenerator(id: string): Promise<GeneratorLike> {
  if (generatorPromise) {
    return generatorPromise;
  }

  const webgpu = hasWebGpu();
  post({ type: "status", id, phase: "loading" });

  generatorPromise = pipeline("text-generation", TRANSLATION_MODEL_ID, {
    device: webgpu ? "webgpu" : "wasm",
    dtype: webgpu ? "q4f16" : "q4",
    progress_callback: (progress: { progress?: number; status?: string; file?: string }) => {
      post({
        type: "status",
        id,
        phase: "downloading",
        progress: typeof progress.progress === "number" ? progress.progress : undefined,
        message: progress.status ?? progress.file,
      });
    },
  }) as unknown as Promise<GeneratorLike>;

  return generatorPromise;
}

scope.onmessage = async (event) => {
  const message = event.data;
  if (message.type !== "translate") {
    return;
  }

  try {
    const generator = await getGenerator(message.id);
    post({ type: "status", id: message.id, phase: "translating" });
    const translation = await translateWithGenerator(generator, message.text);
    post({ type: "result", id: message.id, translation });
  } catch (error) {
    post({
      type: "error",
      id: message.id,
      message: error instanceof Error ? error.message : "Translation failed",
    });
  }
};
