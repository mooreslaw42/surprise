import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { KANAAL_LEVELS } from '../puzzles/kanalen/levels.ts';
import { ISOLATIE_LEVELS } from '../puzzles/isolatie/levels.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import type { RoomId } from './house.ts';

/**
 * The stage ladder. A stage is gated: no room may start the next one until
 * every room has finished this one, which is the whole joke.
 *
 * Only the two built so far are listed; the rest of the ladder is in PLAN.md.
 */
export type StageKind = 'leeghalen' | 'sloop' | 'isolatie' | 'elektra' | 'schilderen' | 'kanalen';

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
  /** Not a phase of the work: a drawing that happens between phases. */
  readonly tussendoor?: boolean;
  readonly entries: readonly StageEntry[];
};

/** One ventilation drawing, slotted between two phases of actual work. */
function kanaalStap(n: number): Stage {
  const level = KANAAL_LEVELS[n - 1]!;
  return {
    kind: 'kanalen',
    nummer: n,
    naam: 'KANAALPLAN',
    tussendoor: true,
    entries: [{
      id: level.id,
      ruimte: 'woonkamer',
      vlak: `PLAN ${n}`,
      samenvatting: `${level.bord.roosters.length} ROOSTERS`,
    }],
  };
}

export const STAGES: readonly Stage[] = [
  {
    kind: 'leeghalen',
    nummer: 1,
    naam: 'LEEGHALEN',
    entries: SCHUIF_LEVELS.map((l) => ({ id: l.id, ruimte: 'woonkamer' as RoomId, vlak: l.ruimte })),
  },
  {
    kind: 'sloop',
    nummer: 2,
    naam: 'SLOOP',
    entries: SLOOP_LEVELS.map((l) => ({ id: l.id, ruimte: l.ruimte, vlak: l.vlak, rows: l.rows })),
  },
  kanaalStap(1),
  {
    kind: 'isolatie',
    nummer: 3,
    naam: 'ISOLATIE',
    entries: ISOLATIE_LEVELS.map((l) => ({
      id: l.id,
      ruimte: 'woonkamer' as RoomId,
      vlak: l.ruimte,
      samenvatting: `${l.muur.dekens.length} DEKENS`,
    })),
  },
  {
    kind: 'elektra',
    nummer: 4,
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
  {
    kind: 'schilderen',
    nummer: 5,
    naam: 'SCHILDEREN',
    entries: SCHILDER_LEVELS.map((l) => ({
      id: l.id,
      ruimte: 'woonkamer' as RoomId,
      vlak: `${l.ruimte} ${l.vlak}`.slice(0, 16),
      samenvatting: `${l.muur.verfbaar.filter(Boolean).length} VAKKEN`,
    })),
  },
  kanaalStap(2),
  {
    kind: 'kanalen',
    nummer: 6,
    naam: 'OPLEVERING',
    entries: [{
      id: KANAAL_LEVELS[2]!.id,
      ruimte: 'woonkamer',
      vlak: 'HET HELE SYSTEEM',
      samenvatting: `${KANAAL_LEVELS[2]!.bord.roosters.length} ROOSTERS`,
    }],
  },
];
