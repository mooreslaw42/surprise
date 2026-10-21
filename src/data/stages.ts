import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import type { RoomId } from './house.ts';

/**
 * The stage ladder. A stage is gated: no room may start the next one until
 * every room has finished this one, which is the whole joke.
 *
 * Only the two built so far are listed; the rest of the ladder is in PLAN.md.
 */
export type StageKind = 'sloop' | 'elektra';

export type StageEntry = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly vlak: string;
  /** The wall, for a thumbnail, when the card is tall enough to show one. */
  readonly rows?: readonly string[];
  /** What the job involves, for when it is not. */
  readonly samenvatting?: string;
};

export type Stage = {
  readonly kind: StageKind;
  readonly nummer: number;
  readonly naam: string;
  readonly entries: readonly StageEntry[];
};

export const STAGES: readonly Stage[] = [
  {
    kind: 'sloop',
    nummer: 1,
    naam: 'SLOOP',
    entries: SLOOP_LEVELS.map((l) => ({ id: l.id, ruimte: l.ruimte, vlak: l.vlak, rows: l.rows })),
  },
  {
    kind: 'elektra',
    nummer: 2,
    naam: 'ELEKTRA',
    entries: ELEKTRA_LEVELS.map((l) => {
      const wissel = l.board.devices.some((d) => d.kind === 'schakelaar' && d.naar !== undefined);
      return {
        id: l.id,
        ruimte: l.ruimte,
        vlak: l.vlak,
        // Kept short enough for a card: 18 characters at six pixels each.
        samenvatting: wissel
          ? `${l.board.devices.length} DRADEN  WISSEL`
          : `${l.board.devices.length} DRADEN  ${l.board.groepen.length} GR`,
      };
    }),
  },
];
