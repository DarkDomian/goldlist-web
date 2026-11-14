export function wordKey(word: string): string {
  return word.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function translationVariants(translation: string): string[] {
  const variants = translation
    .split(/[,;/]+/)
    .map((variant) => normalizeAnswer(variant))
    .filter(Boolean);

  return Array.from(new Set(variants));
}

export function isAnswerCorrect(answer: string, translation: string): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && translationVariants(translation).includes(normalized);
}
