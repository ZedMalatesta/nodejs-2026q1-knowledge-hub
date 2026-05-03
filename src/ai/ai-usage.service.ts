import { Injectable } from '@nestjs/common';

export type AiEndpoint = 'summarize' | 'translate' | 'analyze';

@Injectable()
export class AiUsageService {
  private readonly startedAt = Date.now();
  private totalRequests = 0;
  private totalTokens = 0;
  private readonly byEndpoint: Record<AiEndpoint, { requests: number; tokens: number }> = {
    summarize: { requests: 0, tokens: 0 },
    translate: { requests: 0, tokens: 0 },
    analyze: { requests: 0, tokens: 0 },
  };

  track(endpoint: AiEndpoint, tokens = 0): void {
    this.totalRequests++;
    this.totalTokens += tokens;
    this.byEndpoint[endpoint].requests++;
    this.byEndpoint[endpoint].tokens += tokens;
  }

  getStats() {
    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      byEndpoint: { ...this.byEndpoint },
    };
  }
}
