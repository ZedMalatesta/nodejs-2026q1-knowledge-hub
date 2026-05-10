import { Injectable } from '@nestjs/common';

export type AiEndpoint = 'summarize' | 'translate' | 'analyze' | 'generate';

interface EndpointStats {
  requests: number;
  tokens: number;
  cacheHits: number;
  totalLatencyMs: number;
}

@Injectable()
export class AiUsageService {
  private readonly startedAt = Date.now();
  private totalRequests = 0;
  private totalTokens = 0;
  private totalCacheHits = 0;
  private totalLatencyMs = 0;
  private readonly byEndpoint: Record<AiEndpoint, EndpointStats> = {
    summarize: { requests: 0, tokens: 0, cacheHits: 0, totalLatencyMs: 0 },
    translate: { requests: 0, tokens: 0, cacheHits: 0, totalLatencyMs: 0 },
    analyze: { requests: 0, tokens: 0, cacheHits: 0, totalLatencyMs: 0 },
    generate: { requests: 0, tokens: 0, cacheHits: 0, totalLatencyMs: 0 },
  };

  track(endpoint: AiEndpoint, tokens = 0, cacheHit = false, latencyMs = 0): void {
    this.totalRequests++;
    this.totalTokens += tokens;
    this.totalLatencyMs += latencyMs;
    if (cacheHit) this.totalCacheHits++;

    const ep = this.byEndpoint[endpoint];
    ep.requests++;
    ep.tokens += tokens;
    ep.totalLatencyMs += latencyMs;
    if (cacheHit) ep.cacheHits++;
  }

  getStats() {
    const byEndpoint = Object.fromEntries(
      (Object.entries(this.byEndpoint) as [AiEndpoint, EndpointStats][]).map(
        ([name, ep]) => [
          name,
          {
            requests: ep.requests,
            tokens: ep.tokens,
            cacheHits: ep.cacheHits,
            avgLatencyMs: ep.requests > 0 ? Math.round(ep.totalLatencyMs / ep.requests) : 0,
          },
        ],
      ),
    );

    return {
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      totalRequests: this.totalRequests,
      totalTokens: this.totalTokens,
      totalCacheHits: this.totalCacheHits,
      cacheHitRatio:
        this.totalRequests > 0
          ? Math.round((this.totalCacheHits / this.totalRequests) * 100) / 100
          : 0,
      avgLatencyMs:
        this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0,
      byEndpoint,
    };
  }
}
