/**
 * Adaptive batch sizing optimizer for processing large datasets.
 * Dynamically adjusts batch size based on processing performance
 * to optimize throughput while preventing UI blocking.
 */

export interface BatchMetrics {
  /** Average processing time per item in milliseconds */
  avgTimePerItem: number;
  /** Number of items processed in last batch */
  lastBatchSize: number;
  /** Time taken to process last batch in milliseconds */
  lastBatchTime: number;
}

export interface BatchConfig {
  /** Minimum batch size (prevents too-small batches) */
  minBatchSize: number;
  /** Maximum batch size (prevents too-large batches) */
  maxBatchSize: number;
  /** Target processing time per batch in milliseconds */
  targetBatchTime: number;
  /** Initial batch size to start with */
  initialBatchSize: number;
}

/**
 * Adaptive batch size optimizer that learns from processing metrics
 * to find the optimal batch size for maximum throughput without blocking.
 */
export class BatchOptimizer {
  private config: BatchConfig;
  private currentBatchSize: number;
  private metrics: BatchMetrics;
  private samplesCollected: number = 0;

  constructor(config?: Partial<BatchConfig>) {
    this.config = {
      minBatchSize: config?.minBatchSize || 10,
      maxBatchSize: config?.maxBatchSize || 200,
      targetBatchTime: config?.targetBatchTime || 16, // ~60fps
      initialBatchSize: config?.initialBatchSize || 50,
    };

    this.currentBatchSize = this.config.initialBatchSize;
    this.metrics = {
      avgTimePerItem: 0,
      lastBatchSize: 0,
      lastBatchTime: 0,
    };
  }

  /**
   * Get the current recommended batch size.
   *
   * @returns Current optimal batch size
   */
  getBatchSize(): number {
    return this.currentBatchSize;
  }

  /**
   * Record metrics from a completed batch and adjust batch size accordingly.
   * Uses exponential moving average to smooth out variations.
   *
   * @param itemsProcessed Number of items processed in the batch
   * @param timeElapsed Time taken to process the batch in milliseconds
   */
  recordBatch(itemsProcessed: number, timeElapsed: number): void {
    if (itemsProcessed === 0 || timeElapsed === 0) {
      return;
    }

    this.metrics.lastBatchSize = itemsProcessed;
    this.metrics.lastBatchTime = timeElapsed;

    // Calculate time per item for this batch
    const timePerItem = timeElapsed / itemsProcessed;

    // Update average using exponential moving average
    // Give more weight to recent samples (alpha = 0.3)
    if (this.samplesCollected === 0) {
      this.metrics.avgTimePerItem = timePerItem;
    } else {
      const alpha = 0.3;
      this.metrics.avgTimePerItem = alpha * timePerItem + (1 - alpha) * this.metrics.avgTimePerItem;
    }

    this.samplesCollected++;

    // Only start adjusting after we have a few samples
    if (this.samplesCollected >= 2) {
      this.adjustBatchSize();
    }
  }

  /**
   * Adjust batch size based on current metrics.
   * Increases batch size if processing is fast, decreases if slow.
   */
  private adjustBatchSize(): void {
    const { targetBatchTime } = this.config;
    const { avgTimePerItem } = this.metrics;

    if (avgTimePerItem === 0) {
      return;
    }

    // Calculate ideal batch size based on target time and average processing time
    const idealBatchSize = Math.floor(targetBatchTime / avgTimePerItem);

    // Clamp to min/max bounds
    let newBatchSize = Math.max(this.config.minBatchSize, idealBatchSize);
    newBatchSize = Math.min(this.config.maxBatchSize, newBatchSize);

    // Apply gradual adjustment to avoid oscillation
    // Move 30% towards ideal size
    const adjustment = Math.floor((newBatchSize - this.currentBatchSize) * 0.3);
    this.currentBatchSize = Math.max(this.config.minBatchSize, this.currentBatchSize + adjustment);
  }

  /**
   * Get current performance metrics.
   *
   * @returns Current batch processing metrics
   */
  getMetrics(): BatchMetrics {
    // Use Object.assign for ES2018 compatibility (no spread operator)
    return Object.assign({}, this.metrics);
  }

  /**
   * Reset the optimizer to initial state.
   * Useful when starting a new export operation.
   */
  reset(): void {
    this.currentBatchSize = this.config.initialBatchSize;
    this.samplesCollected = 0;
    this.metrics = {
      avgTimePerItem: 0,
      lastBatchSize: 0,
      lastBatchTime: 0,
    };
  }
}
