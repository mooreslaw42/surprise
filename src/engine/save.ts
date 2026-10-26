/**
 * Progress, in localStorage. Versioned from the start so a save written in
 * November still loads in December.
 */

export type LevelRecord = { swings: number; stars: number };
export type SaveData = { version: 1; levels: Record<string, LevelRecord> };

const KEY = 'eeuwige-verbouwing';
const EMPTY: SaveData = { version: 1, levels: {} };

/** The slice of localStorage we use, so tests can pass a fake. */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Save {
  private data: SaveData;
  private readonly storage: Storage | null;

  constructor(storage: Storage | null) {
    this.storage = storage;
    this.data = Save.read(storage);
  }

  private static read(storage: Storage | null): SaveData {
    if (!storage) return { ...EMPTY, levels: {} };
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return { ...EMPTY, levels: {} };
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== 'object' || parsed === null ||
        (parsed as SaveData).version !== 1 ||
        typeof (parsed as SaveData).levels !== 'object'
      ) {
        return { ...EMPTY, levels: {} };
      }
      return { version: 1, levels: { ...(parsed as SaveData).levels } };
    } catch {
      // A corrupt save should cost a playthrough, not the evening.
      return { ...EMPTY, levels: {} };
    }
  }

  private flush(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private browsing, full disk: play on without saving.
    }
  }

  get(id: string): LevelRecord | undefined {
    return this.data.levels[id];
  }

  isDone(id: string): boolean {
    return this.get(id) !== undefined;
  }

  /** Keeps the best result, so replaying for stars can never lose you any. */
  record(id: string, swings: number, stars: number): LevelRecord {
    const previous = this.data.levels[id];
    const best: LevelRecord = previous
      ? { swings: Math.min(previous.swings, swings), stars: Math.max(previous.stars, stars) }
      : { swings, stars };
    this.data.levels[id] = best;
    this.flush();
    return best;
  }

  totalStars(): number {
    return Object.values(this.data.levels).reduce((n, r) => n + r.stars, 0);
  }

  reset(): void {
    this.data = { version: 1, levels: {} };
    this.flush();
  }
}
