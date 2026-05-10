export interface ContextChunk {
  articleId: string;
  articleTitle: string;
  chunk: string;
}

export function buildRagPrompt(question: string, chunks: ContextChunk[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] "${c.articleTitle}":\n${c.chunk}`)
    .join('\n\n');

  return (
    `You are a helpful assistant for a knowledge management system. ` +
    `Answer the question using ONLY the context excerpts provided below. ` +
    `If the answer is not in the context, say so — do not guess.\n\n` +
    `Context:\n${context}\n\n` +
    `Question: ${question}\n\n` +
    `Answer:`
  );
}
