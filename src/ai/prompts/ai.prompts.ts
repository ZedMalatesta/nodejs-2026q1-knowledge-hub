export const MAX_WORDS = {
  short: 100,
  medium: 250,
  detailed: 500,
} as const;

export const TASK_PROMPTS = {
  review: 'Review the following article for overall quality, clarity, and coherence.',
  bugs: 'Find factual errors, logical inconsistencies, or misleading statements in the following article.',
  optimize:
    'Suggest improvements for structure, readability, and engagement for the following article.',
  explain:
    'Explain the key concepts, main arguments, and takeaways of the following article.',
} as const;

export type MaxLength = keyof typeof MAX_WORDS;
export type AnalysisTask = keyof typeof TASK_PROMPTS;

export function buildSummarizePrompt(content: string, maxLength: MaxLength): string {
  return (
    `Summarize the following article in at most ${MAX_WORDS[maxLength]} words. ` +
    `Return only the summary text, no preamble.\n\n${content}`
  );
}

export function buildTranslatePrompt(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  const sourcePart = sourceLanguage
    ? `The source language is ${sourceLanguage}.`
    : 'Detect the source language automatically.';
  return (
    `Translate the following article into ${targetLanguage}. ${sourcePart}\n` +
    `Respond with a JSON object only — no markdown, no extra text — in this exact shape:\n` +
    `{"translatedText":"<translation>","detectedLanguage":"<detected source language>"}\n\n` +
    `Article:\n${content}`
  );
}

export function buildAnalyzePrompt(content: string, task: AnalysisTask): string {
  return (
    `${TASK_PROMPTS[task]}\n` +
    `Respond with a JSON object only — no markdown, no extra text — in this exact shape:\n` +
    `{"analysis":"<overall analysis>","suggestions":["<suggestion1>","<suggestion2>"],"severity":"info|warning|error"}\n\n` +
    `Article:\n${content}`
  );
}
