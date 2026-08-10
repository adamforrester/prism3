/**
 * Object pool implementation for reducing garbage collection pressure.
 * Reuses objects instead of creating new ones, improving performance
 * in hot paths with frequent allocations.
 */

/**
 * Factory function to create new instances of pooled objects.
 */
export type ObjectFactory<T> = () => T;

/**
 * Reset function to clear an object's state before reuse.
 */
export type ObjectResetter<T> = (obj: T) => void;

/**
 * Generic object pool for reusing objects.
 * Reduces GC pressure by maintaining a pool of reusable objects.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: ObjectFactory<T>;
  private resetter: ObjectResetter<T>;
  private maxSize: number;
  private created: number = 0;
  private reused: number = 0;

  /**
   * Create a new object pool.
   *
   * @param factory Function to create new instances
   * @param resetter Function to reset objects before reuse
   * @param maxSize Maximum pool size (prevents unbounded growth)
   */
  constructor(factory: ObjectFactory<T>, resetter: ObjectResetter<T>, maxSize: number = 100) {
    this.factory = factory;
    this.resetter = resetter;
    this.maxSize = maxSize;
  }

  /**
   * Acquire an object from the pool or create a new one.
   *
   * @returns An object ready for use
   */
  acquire(): T {
    if (this.pool.length > 0) {
      this.reused++;
      const obj = this.pool.pop();
       
      return obj!;
    }

    this.created++;
    return this.factory();
  }

  /**
   * Release an object back to the pool for reuse.
   * The object is reset and returned to the pool if space allows.
   *
   * @param obj Object to release
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetter(obj);
      this.pool.push(obj);
    }
    // If pool is full, let the object be garbage collected
  }

  /**
   * Get pool statistics for monitoring.
   *
   * @returns Object containing pool metrics
   */
  getStats(): { poolSize: number; created: number; reused: number; reuseRate: number } {
    const total = this.created + this.reused;
    const reuseRate = total > 0 ? this.reused / total : 0;

    return {
      poolSize: this.pool.length,
      created: this.created,
      reused: this.reused,
      reuseRate,
    };
  }

  /**
   * Clear the pool and reset statistics.
   */
  clear(): void {
    this.pool = [];
    this.created = 0;
    this.reused = 0;
  }
}
