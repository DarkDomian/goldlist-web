import { pipeline } from "@huggingface/transformers";
import type {
  TranslationRequest,
  TranslationResponse,
  TranslationStatus,
} from "./types";
import type { GeneratorLike } from "./workerCore";
import {
  loadTranslationModel,
  TRANSLATION_MODEL_ID,
  translateWithGenerator,
} from "./workerCore";

type WorkerScope = {
  onmessage: ((event: MessageEvent<TranslationRequest>) => void) | null;
  postMessage: (message: TranslationResponse) => void;
};

const scope = self as unknown as WorkerScope;
let generatorPromise: Promise<GeneratorLike> | undefined;

function post(message: TranslationResponse): void {
  scope.postMessage(message);
}

function postStatus(status: TranslationStatus): void {
  post({ type: "status", ...status });
}

function hasWebGpu(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

async function getGenerator(): Promise<GeneratorLike> {
  if (generatorPromise) {
    return generatorPromise;
  }

  postStatus({ phase: "queued" });
  generatorPromise = loadTranslationModel({
    hasWebGpu: hasWebGpu(),
    load: (device, onProgress) =>
      pipeline("text-generation", TRANSLATION_MODEL_ID, {
        device,
        dtype: device === "webgpu" ? "q4f16" : "q4",
        progress_callback: onProgress,
      }) as unknown as Promise<GeneratorLike>,
    onStatus: postStatus,
  });

  return generatorPromise;
}

scope.onmessage = async (event) => {
  const message = event.data;
  if (message.type !== "translate") {
    return;
  }

  try {
    const generator = await getGenerator();
    postStatus({ phase: "translating" });
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
