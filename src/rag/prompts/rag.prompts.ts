export interface ContextChunk {
  articleId: string;
  articleTitle: string;
  chunk: string;
}

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function buildRagPrompt(
  question: string,
  chunks: ContextChunk[],
  history?: HistoryMessage[],
): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] "${c.articleTitle}":\n${c.chunk}`)
    .join('\n\n');

  let prompt =
    `You are a helpful assistant for a knowledge management system. ` +
    `Answer the question using ONLY the context excerpts provided below. ` +
    `If the answer is not in the context, say so — do not guess.\n\n` +
    `Context:\n${context}\n\n`;

  if (history?.length) {
    prompt += `Previous conversation:\n`;
    for (const msg of history) {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    }
    prompt += '\n';
  }

  prompt += `Question: ${question}\n\nAnswer:`;
  return prompt;
}
