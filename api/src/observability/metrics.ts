import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge, Summary } from 'prom-client';

type QueueStage =
  | 'cleanup'
  | 'categorization'
  | 'ranking'
  | 'engagement'
  | 'automation'
  | 'session_reset';

type LlmOperation = 'categorization' | 'ranking' | 'engagement';

/**
 * Centralized Prometheus metrics helper.
 * Workers and the API share this singleton so we expose a consistent metric set.
 */
class Metrics {
  private static instance: Metrics;
  private readonly registry: Registry;

  private readonly httpDuration: Histogram<string>;
  private readonly queueDuration: Histogram<string>;
  private readonly queueFailures: Counter<string>;
  private readonly batchStageTransitions: Counter<string>;
  private readonly llmDuration: Summary<string>;
  private readonly llmFailures: Counter<string>;
  private readonly workerHeartbeat: Gauge<string>;
  private readonly sessionCooldowns: Counter<string>;

  private constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Incoming HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.queueDuration = new Histogram({
      name: 'tweet_pipeline_job_duration_seconds',
      help: 'Queue job processing duration by stage',
      labelNames: ['stage'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.queueFailures = new Counter({
      name: 'tweet_pipeline_job_failures_total',
      help: 'Total queue job failures by stage and reason',
      labelNames: ['stage', 'reason'],
      registers: [this.registry],
    });

    this.batchStageTransitions = new Counter({
      name: 'tweet_batch_stage_transitions_total',
      help: 'Number of times a batch progressed to a stage',
      labelNames: ['from', 'to'],
      registers: [this.registry],
    });

    this.llmDuration = new Summary({
      name: 'tweet_llm_operation_duration_ms',
      help: 'Duration of LLM calls (in milliseconds) by operation',
      percentiles: [0.5, 0.9, 0.99],
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.llmFailures = new Counter({
      name: 'tweet_llm_operation_failures_total',
      help: 'LLM call failures by operation',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.workerHeartbeat = new Gauge({
      name: 'tweet_worker_last_heartbeat_timestamp',
      help: 'Unix timestamp (seconds) for the latest worker heartbeat',
      labelNames: ['worker'],
      registers: [this.registry],
    });

    this.sessionCooldowns = new Counter({
      name: 'tweet_session_cooldowns_total',
      help: 'Session cooldown lifecycle events',
      labelNames: ['action'],
      registers: [this.registry],
    });
  }

  static getInstance(): Metrics {
    if (!Metrics.instance) {
      Metrics.instance = new Metrics();
    }
    return Metrics.instance;
  }

  observeHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    this.httpDuration.observe({ method, route, status: String(statusCode) }, durationMs / 1000);
  }

  recordQueueJobDuration(stage: QueueStage, durationMs: number): void {
    this.queueDuration.observe({ stage }, durationMs / 1000);
  }

  recordQueueFailure(stage: QueueStage, reason: string): void {
    this.queueFailures.inc({ stage, reason });
  }

  recordBatchStageTransition(from: string, to: string): void {
    this.batchStageTransitions.inc({ from, to });
  }

  recordLlmDuration(operation: LlmOperation, durationMs: number): void {
    this.llmDuration.observe({ operation }, durationMs);
  }

  recordLlmFailure(operation: LlmOperation): void {
    this.llmFailures.inc({ operation });
  }

  setWorkerHeartbeat(worker: string): void {
    this.workerHeartbeat.set({ worker }, Date.now() / 1000);
  }

  markSessionCooldown(action: 'start' | 'reset'): void {
    this.sessionCooldowns.inc({ action });
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

export const metrics = Metrics.getInstance();
