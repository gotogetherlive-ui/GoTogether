type CacheEntry<Value> = {
  expiresAt: number;
  value?: Value;
  pending?: Promise<Value>;
};

/** Small bounded per-process cache with request coalescing for read-heavy server data. */
export class AsyncTtlCache<Key, Value> {
  private readonly entries = new Map<Key, CacheEntry<Value>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  async get(key: Key, load: () => Promise<Value>): Promise<Value> {
    const now = Date.now();
    const current = this.entries.get(key);
    if (current?.value !== undefined && current.expiresAt > now) return current.value;
    if (current?.pending) return current.pending;

    this.removeExpired(now);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as Key | undefined;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }

    const pending = load();
    this.entries.set(key, { expiresAt: now + this.ttlMs, pending });
    try {
      const value = await pending;
      this.entries.delete(key);
      this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      return value;
    } catch (error) {
      this.entries.delete(key);
      throw error;
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private removeExpired(now: number): void {
    for (const [key, entry] of this.entries) {
      if (!entry.pending && entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
