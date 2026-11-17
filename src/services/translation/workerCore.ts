import type { TranslationStatus } from "./types";
import { createProgressAggregator } from "./progress";

export const TRANSLATION_MODEL_ID = "onnx-community/translategemma-text-4b-it-ONNX";

export type TranslationDevice = "webgpu" | "wasm";

export interface RawTranslationProgress {
  status?: string;
  file?: string;
  name?: string;
  loaded?: number;
  total?: number;
  progress?: number;
}

export async function loadTranslationModel<T>({
  hasWebGpu,
  load,
  onStatus,
}: {
  hasWebGpu: boolean;
  load: (
    device: TranslationDevice,
    onProgress: (progress: RawTranslationProgress) => void,
  ) => Promise<T>;
  onStatus: (status: TranslationStatus) => void;
}): Promise<T> {
  const aggregator = createProgressAggregator();
  let lastProgress: number | undefined;

  const report = (progress: RawTranslationProgress) => {
    lastProgress = aggregator.update(progress.file ?? progress.name ?? "model", {
      loaded: progress.loaded,
      total: progress.total,
      progress: progress.progress,
    });
    onStatus({
      phase: "downloading",
      progress: lastProgress,
      message: progress.status ?? progress.file,
    });
  };

  if (hasWebGpu) {
    try {
      const generator = await load("webgpu", report);
      onStatus({ phase: "ready", progress: 100 });
      return generator;
    } catch {
      onStatus({
        phase: "initializing",
        progress: lastProgress,
        message: "WebGPU is unavailable. Falling back to WebAssembly.",
      });
    }
  } else {
    onStatus({ phase: "initializing", message: "Preparing WebAssembly." });
  }

  const generator = await load("wasm", report);
  onStatus({ phase: "ready", progress: 100 });
  return generator;
}

export interface ChatMessageContent {
  type: "text";
  source_lang_code: "en";
  target_lang_code: "ru";
  text: string;
}

export interface ChatMessage {
  role: "user";
  content: ChatMessageContent[];
}

export interface GeneratorLike {
  tokenizer?: {
    apply_chat_template?: (
      messages: ChatMessage[],
      options: { tokenize: false; add_generation_prompt: boolean },
    ) => string;
  };
  (input: string, options: Record<string, unknown>): Promise<unknown>;
}

export function buildTranslationMessages(text: string): ChatMessage[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          source_lang_code: "en",
          target_lang_code: "ru",
          text,
        },
      ],
    },
  ];
}

export function fallbackPrompt(text: string): string {
  return [
    "<start_of_turn>user",
    "You are a professional English (en) to Russian (ru) translator. Produce only the Russian translation, without any additional explanations or commentary. Please translate the following English text into Russian:",
    "",
    text,
    "<end_of_turn>",
    "<start_of_turn>model",
  ].join("\n");
}

export function extractTranslation(output: unknown): string {
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error("The translation model returned no output");
  }

  const first = output[0] as Record<string, unknown> | undefined;
  if (!first) {
    throw new Error("The translation model returned no output");
  }

  let generated = first.generated_text;

  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1] as Record<string, unknown> | undefined;
    generated = last?.content;
  }

  if (typeof generated !== "string") {
    throw new Error("The translation model returned an unexpected output");
  }

  const normalized = generated
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    throw new Error("The translation model returned an empty translation");
  }

  return normalized;
}

export async function translateWithGenerator(
  generator: GeneratorLike,
  text: string,
): Promise<string> {
  const messages = buildTranslationMessages(text);
  const prompt =
    generator.tokenizer?.apply_chat_template?.(messages, {
      tokenize: false,
      add_generation_prompt: true,
    }) ?? fallbackPrompt(text);

  const output = await generator(prompt, {
    max_new_tokens: 64,
    do_sample: false,
    return_full_text: false,
  });

  return extractTranslation(output);
}
