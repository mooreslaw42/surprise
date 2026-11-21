/**
 * Progress, in localStorage. Versioned from the start so a save written in
 * November still loads in December.
 *
 * Version 2 adds three things, all optional, so a version 1 save is simply a
 * version 2 save with none of them in it:
 *   - flags, for things that happen once (a praatje, a tool that breaks);
 *   - a level that was skipped rather than solved;
 *   - the cable routes from Elektra, which the last level builds itself on.
 */

export type LevelRecord = {
  swings: number;
  stars: number;
  /** Elektra only: the cells each cable went through, as indices on the wall. */
  draden?: number[][];
  /** Let through by Pim, not solved. A real result replaces it outright. */
  overgeslagen?: true;
};
export type SaveData = {
  version: 2;
  levels: Record<string, LevelRecord>;
  vlaggen: Record<string, true>;
};

const KEY = 'eeuwige-verbouwing';

function leeg(): SaveData {
  return { version: 2, levels: {}, vlaggen: {} };
}

/** The slice of localStorage we use, so tests can pass a fake. */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Save {
  private data: SaveData;
  private readonly storage: Storage | null;
  /**
   * Goes up every time a level is recorded. Whatever wraps a level watches
   * this rather than asking eight different scenes whether they were won.
   */
  teller = 0;
  /**
   * The most stars the level being played can still earn. Three, until Pim
   * has been asked for a hint: then two, because the third is for working it
   * out. Set and reset by whatever wraps the level.
   */
  plafond = 3;

  constructor(storage: Storage | null) {
    this.storage = storage;
    this.data = Save.read(storage);
  }

  private static read(storage: Storage | null): SaveData {
    if (!storage) return leeg();
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return leeg();
      const parsed = JSON.parse(raw) as {
        version?: number;
        levels?: Record<string, LevelRecord> | null;
        vlaggen?: Record<string, true> | null;
      } | null;
      if (
        typeof parsed !== 'object' || parsed === null ||
        (parsed.version !== 1 && parsed.version !== 2) ||
        typeof parsed.levels !== 'object' || parsed.levels === null
      ) {
        return leeg();
      }
      const vlaggen = typeof parsed.vlaggen === 'object' && parsed.vlaggen !== null
        ? { ...parsed.vlaggen } : {};
      return { version: 2, levels: { ...parsed.levels }, vlaggen };
    } catch {
      // A corrupt save should cost a playthrough, not the evening.
      return leeg();
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
  record(id: string, swings: number, verdiend: number): LevelRecord {
    const stars = Math.min(verdiend, this.plafond);
    const previous = this.data.levels[id];
    const best: LevelRecord = previous && !previous.overgeslagen
      ? { ...previous, swings: Math.min(previous.swings, swings), stars: Math.max(previous.stars, stars) }
      : { swings, stars };
    if (previous?.draden) best.draden = previous.draden;
    this.data.levels[id] = best;
    this.teller++;
    this.flush();
    return best;
  }

  /**
   * Through the gate without solving it. Never overwrites a real result, and
   * earns nothing: the card shows three empty stars until it is played.
   */
  slaOver(id: string): void {
    if (!this.data.levels[id]) {
      this.data.levels[id] = { swings: 0, stars: 0, overgeslagen: true };
      this.flush();
    }
  }

  /** The routes as last laid, not the best ones: the boss wants his work. */
  bewaarDraden(id: string, draden: number[][]): void {
    const record = this.data.levels[id];
    if (!record) return;
    record.draden = draden;
    this.flush();
  }

  vlag(naam: string): boolean {
    return this.data.vlaggen[naam] === true;
  }

  zetVlag(naam: string): void {
    if (this.data.vlaggen[naam]) return;
    this.data.vlaggen[naam] = true;
    this.flush();
  }

  /** Whether anything has been played: a level finished or let past. */
  get begonnen(): boolean {
    return Object.keys(this.data.levels).length > 0;
  }

  totalStars(): number {
    return Object.values(this.data.levels).reduce((n, r) => n + r.stars, 0);
  }

  reset(): void {
    this.data = leeg();
    this.flush();
  }
}
