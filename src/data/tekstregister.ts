import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { ISOLATIE_LEVELS } from '../puzzles/isolatie/levels.ts';
import { KANAAL_LEVELS } from '../puzzles/kanalen/levels.ts';
import { KLOS_LEVELS } from '../puzzles/klossen/levels.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { SLOOP_LEVELS, UITLEG_EERSTE, UITLEG_LEIDING } from '../puzzles/sloop/levels.ts';
import { TUINHUIS_LEVEL } from '../puzzles/tuinhuis/levels.ts';
import { VLOER_LEVELS } from '../puzzles/vloeren/levels.ts';
import { EIGEN_LEIDING, UITLEG as BAAS_UITLEG, WEIGERING } from '../scenes/oplevering.ts';
import type { Spreker } from '../scenes/portretten.ts';
import { INTRO } from './intro.ts';
import { AFTITELING, GEDICHT, SLOT } from './outro.ts';
import { METEN, NA_FASE, NA_LEVEL, PECH, WENK } from './praatjes.ts';
import { STAGES, stageLabel } from './stages.ts';

/**
 * Every line anybody says and every explanation of a puzzle, in one list.
 *
 * The words live where they are used — next to the level they explain, in
 * the file for the phase they follow — which is right for the code and
 * useless for the person who has to read them all through. This walks the
 * game in playing order and names each piece of text, so an editor can show
 * them as one script and the game can lay Pim's own wording over the top.
 *
 * A text is a list of strings whatever it is: the paragraphs of a speech,
 * the lines of the gedicht, or a single line in a list of one.
 */
export type Tekst = {
  readonly sleutel: string;
  /** The heading it sits under: a phase, in playing order, or the outro. */
  readonly groep: string;
  /** What it is, in a few words. */
  readonly kop: string;
  /**
   * Speech wraps by itself; lines are kept as typed; a single line is one;
   * strofen are lines kept as typed, a box per group between blank lines.
   */
  readonly soort: 'alineas' | 'regels' | 'regel' | 'strofen';
  readonly wie?: Spreker;
  /** Most characters on a line, where the screen sets a limit. */
  readonly max?: number;
  lees(): string[];
  schrijf(nieuw: readonly string[]): void;
};

/** A line along the bottom bar shares it with a key hint on the right. */
const BALK = 49;
/** One line under the top bar, in a box. */
const WENKBREEDTE = 44;

export function register(): Tekst[] {
  const uit: Tekst[] = [];
  const gezien = new Set<unknown>();

  const lijst = (
    sleutel: string, groep: string, kop: string, bron: readonly string[],
    soort: Tekst['soort'] = 'alineas', wie: Spreker | undefined = 'pim', max?: number,
  ): void => {
    // The same explanation is shared by several walls: list it once.
    if (gezien.has(bron)) return;
    gezien.add(bron);
    const doel = bron as string[];
    uit.push({
      sleutel, groep, kop, soort, wie, max,
      lees: () => [...doel],
      schrijf: (nieuw) => { doel.splice(0, doel.length, ...nieuw); },
    });
  };

  const veld = <T extends object>(
    sleutel: string, groep: string, kop: string, bron: T, naam: keyof T, max = BALK,
  ): void => {
    const doel = bron as unknown as Record<string, string>;
    uit.push({
      sleutel, groep, kop, soort: 'regel', max,
      lees: () => [doel[naam as string]!],
      schrijf: (nieuw) => { doel[naam as string] = nieuw[0] ?? ''; },
    });
  };

  type Level = { readonly id: string; readonly praatje: string; readonly uitleg?: readonly string[] };
  const levels = new Map<string, Level>();
  for (const l of [
    ...SCHUIF_LEVELS, ...ISOLATIE_LEVELS, ...ELEKTRA_LEVELS, ...KLOS_LEVELS,
    ...VLOER_LEVELS, ...SCHILDER_LEVELS, ...KANAAL_LEVELS,
    ...SLOOP_LEVELS.map((s) => ({
      id: s.id, praatje: s.praatje, bron: s,
      uitleg: s.id.endsWith('kopgevel') ? UITLEG_EERSTE : UITLEG_LEIDING,
    })),
  ] as Level[]) levels.set(l.id, l);

  // What a box of speech holds across, beside the portrait.
  lijst('intro.gedicht', 'VOOR HET BEGINT', 'PIM: HET GEDICHT VOORAF, EEN STROFE PER ENTER', INTRO, 'strofen', 'pim', 44);

  for (const stage of STAGES) {
    const groep = stageLabel(stage);

    if (stage.kind === 'tuinhuis') {
      lijst('tuinhuis.uitleg', groep, 'WIEP, BIJ BINNENKOMST', TUINHUIS_LEVEL.uitleg, 'alineas', 'wiep');
      lijst('tuinhuis.uitbalans', groep, 'WIEP, ALS DE NAALD UIT DE BAND LOOPT', TUINHUIS_LEVEL.uitBalans, 'alineas', 'wiep');
      veld('tuinhuis.praatje', groep, 'ONDERSTE REGEL', TUINHUIS_LEVEL, 'praatje');
      veld('tuinhuis.aftitel', groep, 'ALS HIJ AF IS: DE KOP', TUINHUIS_LEVEL, 'afTitel', 30);
      veld('tuinhuis.afregel', groep, 'ALS HIJ AF IS: DE REGEL ERONDER', TUINHUIS_LEVEL, 'afRegel', 52);
    } else if (stage.kind === 'oplevering') {
      lijst('oplevering.uitleg', groep, 'PIM, BIJ BINNENKOMST', BAAS_UITLEG);
      lijst('oplevering.eigenleiding', groep, 'PIM, BIJ DE EERSTE SCHACHT OP EEN KABEL', EIGEN_LEIDING);
      for (const naam of Object.keys(WEIGERING) as (keyof typeof WEIGERING)[]) {
        veld(`oplevering.nee.${naam}`, groep, `SCHACHT GEWEIGERD: ${naam.toUpperCase()}`, WEIGERING, naam, 56);
      }
    } else {
      stage.entries.forEach((entry) => {
        const level = levels.get(entry.id);
        if (!level) return;
        const wand = `${entry.titel} ${entry.vlak}`;
        if (level.uitleg) lijst(`uitleg.${entry.id}`, groep, `UITLEG VANAF ${wand}`, level.uitleg);
      });
      stage.entries.forEach((entry) => {
        const level = levels.get(entry.id);
        if (!level) return;
        // Sloop's levels are built from a table; write through to the real one.
        const echt = (level as { bron?: object }).bron ?? level;
        veld(`praatje.${entry.id}`, groep, `ONDERSTE REGEL: ${entry.titel} ${entry.vlak}`,
          echt as { praatje: string }, 'praatje');
      });
    }

    const meet = METEN[stage.id];
    if (meet) {
      veld(`meten.${stage.id}.wat`, groep, 'ROLMAAT: WAT ER GEMETEN WORDT', meet, 'wat', 50);
      lijst(`meten.${stage.id}.na`, groep, 'ROLMAAT: PIM NA DRIE KEER METEN', meet.na);
    }
    const pech = PECH[stage.id];
    if (pech) {
      veld(`pech.${stage.id}.gereedschap`, groep, 'ZWART & DEKKER: WAT ER BREEKT', pech, 'gereedschap', 26);
      lijst(`pech.${stage.id}.tekst`, groep, 'ZWART & DEKKER: PIM, DAARNA', pech.tekst);
    }
    for (const entry of stage.entries) {
      (NA_LEVEL[entry.id] ?? []).forEach((beat, i, alle) => {
        const welk = stage.entries.length > 1 ? `${entry.titel} ${entry.vlak}` : 'HET LEVEL';
        const beurt = alle.length > 1 ? `, BEURT ${i + 1}` : '';
        lijst(`nalevel.${entry.id}.${i}`, groep, `NA ${welk}${beurt}`, beat.tekst, 'alineas', beat.wie);
      });
    }
    (NA_FASE[stage.id] ?? []).forEach((beat, i) => {
      lijst(`na.${stage.id}.${i}`, groep, `NA DE FASE, BEURT ${i + 1}`, beat.tekst, 'alineas', beat.wie);
    });
  }

  SLOT.forEach((beat, i) => {
    lijst(`outro.slot.${i}`, 'DE AFLOOP', `BIJ HET HUIS, BEURT ${i + 1}`, beat.tekst, 'alineas', beat.wie);
  });
  lijst('outro.gedicht', 'DE AFLOOP', 'HET GEDICHT', GEDICHT, 'regels', undefined, 58);
  lijst('outro.aftiteling', 'DE AFLOOP', 'DE AFTITELING', AFTITELING, 'regels', undefined, 58);

  for (const naam of Object.keys(WENK) as (keyof typeof WENK)[]) {
    veld(`wenk.${naam}`, 'TIJDENS ELK LEVEL', `WENK: ${naam.toUpperCase()}`, WENK, naam, WENKBREEDTE);
  }
  return uit;
}

/** Lay Pim's wording over the code's. Unknown keys are old news and skipped. */
export function pasToe(eigen: Readonly<Record<string, readonly string[]>>): void {
  for (const tekst of register()) {
    const nieuw = eigen[tekst.sleutel];
    if (nieuw) tekst.schrijf(nieuw);
  }
}
