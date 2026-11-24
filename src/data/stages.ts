import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { KANAAL_LEVELS } from '../puzzles/kanalen/levels.ts';
import { ISOLATIE_LEVELS } from '../puzzles/isolatie/levels.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import { VLOER_LEVELS } from '../puzzles/vloeren/levels.ts';
import { KLOS_LEVELS } from '../puzzles/klossen/levels.ts';
import { ROOM_NAMES } from './house.ts';

/**
 * The stage ladder. A stage is gated: no room may start the next one until
 * every room has finished this one, which is the whole joke.
 *
 * Eight phases of work, five ventilation drawings slotted between them, and
 * two bosses: the tuinhuis halfway, and the oplevering at the end.
 */
export type StageKind =
  | 'leeghalen' | 'sloop' | 'isolatie' | 'elektra' | 'klossen' | 'vloeren' | 'schilderen'
  | 'kanalen' | 'tuinhuis' | 'oplevering';

export type StageEntry = {
  readonly id: string;
  /** The room, spelled the way the card shows it. */
  readonly titel: string;
  readonly vlak: string;
  /** The wall, for a thumbnail, when the card is tall enough to show one. */
  readonly rows?: readonly string[];
  /** What the job involves, for when it is not. */
  readonly samenvatting?: string;
};

export type Stage = {
  /** Unique along the ladder. What the praatjes and the tool breaks key on. */
  readonly id: string;
  readonly kind: StageKind;
  readonly nummer: number;
  readonly naam: string;
  /** Not a phase of the work: a drawing that happens between phases. */
  readonly tussendoor?: boolean;
  /** One level, and it is not a wall. Gets its own pip and its own music. */
  readonly baas?: boolean;
  readonly entries: readonly StageEntry[];
};

/** One ventilation drawing, slotted between two phases of actual work. */
function kanaalStap(n: number): Stage {
  const level = KANAAL_LEVELS[n - 1]!;
  return {
    id: `kp${n}`,
    kind: 'kanalen',
    nummer: n,
    naam: 'KANAALPLAN',
    tussendoor: true,
    entries: [{
      id: level.id,
      // Which rooms the drawing actually covers; only the last one is the
      // whole house, and saying so earlier gives the gag away.
      titel: level.dekking,
      vlak: `PLAN ${n}`,
      samenvatting: `${level.bord.roosters.length} ROOSTERS`,
    }],
  };
}

export const STAGES: readonly Stage[] = [
  {
    id: 'leeghalen',
    kind: 'leeghalen',
    nummer: 1,
    naam: 'LEEGHALEN',
    entries: SCHUIF_LEVELS.map((l) => ({
      id: l.id,
      titel: l.ruimte,
      vlak: 'LEEGHALEN',
      samenvatting: `${l.plan.stukken.length} STUKS`,
    })),
  },
  {
    id: 'sloop',
    kind: 'sloop',
    nummer: 2,
    naam: 'SLOOP',
    entries: SLOOP_LEVELS.map((l) => ({ id: l.id, titel: ROOM_NAMES[l.ruimte], vlak: l.vlak, rows: l.rows })),
  },
  kanaalStap(1),
  {
    id: 'isolatie',
    kind: 'isolatie',
    nummer: 3,
    naam: 'ISOLATIE',
    entries: ISOLATIE_LEVELS.map((l) => ({
      id: l.id,
      titel: l.ruimte,
      vlak: 'ISOLEREN',
      samenvatting: `${l.muur.dekens.length} DEKENS`,
    })),
  },
  {
    id: 'elektra',
    kind: 'elektra',
    nummer: 4,
    naam: 'ELEKTRA',
    entries: ELEKTRA_LEVELS.map((l) => {
      const wissel = l.board.devices.some((d) => d.kind === 'schakelaar' && d.naar !== undefined);
      return {
        id: l.id,
        titel: ROOM_NAMES[l.ruimte],
        vlak: l.vlak,
        // Kept short enough for a card: 18 characters at six pixels each.
        samenvatting: wissel
          ? `${l.board.devices.length} DRADEN  WISSEL`
          : `${l.board.devices.length} DRADEN  ${l.board.groepen.length} GR`,
      };
    }),
  },
  {
    // Not a phase: Wiep, on the drive, with a trailer. Behind the gate like
    // everything else, which is the joke — this once he cannot put it off.
    id: 'tuinhuis',
    kind: 'tuinhuis',
    nummer: 0,
    naam: 'HET TUINHUIS',
    baas: true,
    entries: [{
      id: 'tuinhuis',
      titel: 'DE TUIN',
      vlak: 'WIEP HAAR TINY HOUSE',
      samenvatting: '8 STUKS  4,00 M',
    }],
  },
  kanaalStap(2),
  {
    // The phase is dichtzetten; the puzzle in it is finding the klossen.
    id: 'dichtzetten',
    kind: 'klossen',
    nummer: 5,
    naam: 'DICHTZETTEN',
    entries: KLOS_LEVELS.map((l) => ({
      id: l.id,
      titel: ROOM_NAMES[l.surface.ruimte],
      vlak: l.vlak,
      samenvatting: `${l.wand.klossen.length} KLOSSEN`,
    })),
  },
  kanaalStap(3),
  {
    id: 'vloeren',
    kind: 'vloeren',
    nummer: 6,
    naam: 'VLOEREN',
    entries: VLOER_LEVELS.map((l) => ({
      id: l.id,
      titel: l.ruimte,
      vlak: 'VLOER LEGGEN',
      samenvatting: `${l.vloer.vorm.length} RIJEN`,
    })),
  },
  kanaalStap(4),
  {
    id: 'schilderen',
    kind: 'schilderen',
    nummer: 7,
    naam: 'SCHILDEREN',
    entries: SCHILDER_LEVELS.map((l) => ({
      id: l.id,
      titel: l.ruimte,
      vlak: l.vlak,
      samenvatting: `${l.muur.verfbaar.filter(Boolean).length} VAKKEN`,
    })),
  },
  kanaalStap(5),
  {
    id: 'oplevering',
    kind: 'oplevering',
    nummer: 8,
    naam: 'OPLEVERING',
    baas: true,
    entries: [{
      id: 'oplevering',
      titel: 'HET HELE HUIS',
      vlak: 'DE UNIT IS ER',
      samenvatting: '2 LAGEN 3 KOKERS',
    }],
  },
];

/** Whether a level has been through at least once. */
export type Gedaan = (id: string) => boolean;

/** Every wall in the stage done, which is what opens the next one. */
export function stageAf(stage: Stage, gedaan: Gedaan): boolean {
  return stage.entries.every((e) => gedaan(e.id));
}

/**
 * The gate itself. A stage opens only once every stage before it is finished
 * — no room may start the next phase until all three are through this one.
 * Browsing ahead is free; starting is not.
 */
export function stageOpen(index: number, gedaan: Gedaan): boolean {
  return blokkade(index, gedaan) === null;
}

/** Which earlier stage is in the way, for a menu that has to say why. */
export function blokkade(index: number, gedaan: Gedaan): Stage | null {
  for (let s = 0; s < index && s < STAGES.length; s++) {
    if (!stageAf(STAGES[s]!, gedaan)) return STAGES[s]!;
  }
  return null;
}

/** Where to drop someone coming back: the furthest stage they have opened. */
export function versteFase(gedaan: Gedaan): number {
  let n = 0;
  while (n + 1 < STAGES.length && stageAf(STAGES[n]!, gedaan)) n++;
  return n;
}

export function stageLabel(stage: Stage): string {
  if (stage.tussendoor) return `${stage.naam} ${stage.nummer}`;
  if (stage.nummer === 0) return stage.naam;
  return `FASE ${stage.nummer} - ${stage.naam}`;
}

/** Everything done, which is what lets the outro play. */
export function allesAf(gedaan: Gedaan): boolean {
  return STAGES.every((stage) => stageAf(stage, gedaan));
}
