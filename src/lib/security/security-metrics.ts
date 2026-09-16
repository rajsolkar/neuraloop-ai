export interface SecurityMetrics {
  rateLimitHits: number;
  payloadRejections: number;
  concurrencyRejections: number;
  lastEventTimestamp: string | null;
}

class SecurityMetricsTracker {
  private rateLimitHits = 0;
  private payloadRejections = 0;
  private concurrencyRejections = 0;
  private lastEventTimestamp: string | null = null;

  recordRateLimitHit(): void {
    this.rateLimitHits++;
    this.lastEventTimestamp = new Date().toISOString();
  }

  recordPayloadRejection(): void {
    this.payloadRejections++;
    this.lastEventTimestamp = new Date().toISOString();
  }

  recordConcurrencyRejection(): void {
    this.concurrencyRejections++;
    this.lastEventTimestamp = new Date().toISOString();
  }

  getMetrics(): SecurityMetrics {
    return {
      rateLimitHits: this.rateLimitHits,
      payloadRejections: this.payloadRejections,
      concurrencyRejections: this.concurrencyRejections,
      lastEventTimestamp: this.lastEventTimestamp,
    };
  }

  resetMetrics(): void {
    this.rateLimitHits = 0;
    this.payloadRejections = 0;
    this.concurrencyRejections = 0;
    this.lastEventTimestamp = null;
  }
}

export const securityMetrics = new SecurityMetricsTracker();
