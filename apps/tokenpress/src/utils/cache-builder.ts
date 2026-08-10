/**
 * Generic cache builder for creating efficient lookup maps.
 * Provides a flexible API for building different types of caches
 * with O(1) lookup performance.
 */

/**
 * Key extractor function to generate cache keys from items.
 */
export type KeyExtractor<T> = (item: T) => string | string[];

/**
 * Filter function to determine if an item should be cached.
 */
export type ItemFilter<T> = (item: T) => boolean;

/**
 * Generic cache builder that creates lookup maps from arrays.
 * Supports multiple keys per item and custom filtering.
 */
export class CacheBuilder<T> {
  private items: T[];
  private keyExtractors: KeyExtractor<T>[] = [];
  private filters: ItemFilter<T>[] = [];

  constructor(items: T[]) {
    this.items = items;
  }

  /**
   * Add a key extractor function.
   * Each extractor can return a single key or multiple keys for one item.
   *
   * @param extractor Function to extract cache key(s) from item
   * @returns This builder for chaining
   */
  withKeys(extractor: KeyExtractor<T>): this {
    this.keyExtractors.push(extractor);
    return this;
  }

  /**
   * Add a filter to determine which items should be cached.
   * Multiple filters are combined with AND logic.
   *
   * @param filter Function to test if item should be cached
   * @returns This builder for chaining
   */
  where(filter: ItemFilter<T>): this {
    this.filters.push(filter);
    return this;
  }

  /**
   * Build the cache as a Record mapping keys to items.
   * If multiple items have the same key, the last one wins.
   *
   * @returns Cache object mapping keys to items
   */
  build(): Record<string, T> {
    const cache: Record<string, T> = {};

    for (const item of this.items) {
      // Apply all filters
      const passesFilters = this.filters.every(filter => filter(item));
      if (!passesFilters) {
        continue;
      }

      // Apply all key extractors
      for (const extractor of this.keyExtractors) {
        const keys = extractor(item);
        const keyArray = Array.isArray(keys) ? keys : [keys];

        for (const key of keyArray) {
          if (key) {
            cache[key] = item;
          }
        }
      }
    }

    return cache;
  }

  /**
   * Build the cache as a Map for better performance with non-string keys.
   *
   * @returns Map mapping keys to items
   */
  buildMap(): Map<string, T> {
    const map = new Map<string, T>();

    for (const item of this.items) {
      const passesFilters = this.filters.every(filter => filter(item));
      if (!passesFilters) {
        continue;
      }

      for (const extractor of this.keyExtractors) {
        const keys = extractor(item);
        const keyArray = Array.isArray(keys) ? keys : [keys];

        for (const key of keyArray) {
          if (key) {
            map.set(key, item);
          }
        }
      }
    }

    return map;
  }

  /**
   * Build a multi-value cache where each key maps to an array of items.
   * Useful when multiple items can have the same key.
   *
   * @returns Cache mapping keys to arrays of items
   */
  buildMulti(): Record<string, T[]> {
    const cache: Record<string, T[]> = {};

    for (const item of this.items) {
      const passesFilters = this.filters.every(filter => filter(item));
      if (!passesFilters) {
        continue;
      }

      for (const extractor of this.keyExtractors) {
        const keys = extractor(item);
        const keyArray = Array.isArray(keys) ? keys : [keys];

        for (const key of keyArray) {
          if (key) {
            if (!cache[key]) {
              cache[key] = [];
            }
            cache[key].push(item);
          }
        }
      }
    }

    return cache;
  }
}

/**
 * Create a new cache builder for the given items.
 *
 * @param items Array of items to build cache from
 * @returns New cache builder instance
 */
export function createCache<T>(items: T[]): CacheBuilder<T> {
  return new CacheBuilder(items);
}
