import { SURFACES, type Surface } from '../../data/house.ts';
import { genereer } from './generate.ts';
import type { Wand } from './model.ts';

/**
 * Klosniveaus, on the measured walls. The openings are the real openings, so
 * the tv-kamer wall has the end window in it and the woonkamer wall has both
 * garden windows — and those are squares you get for free, because there is
 * nothing behind a window to screw into.
 *
 * Each wall is a seed rather than a drawing. The generator scatters, the
 * solver judges, and the seed is simply the first scatter that survived: one
 * answer, reachable without guessing. See generate.ts for why hand-drawn
 * walls were a dead end.
 */

export type KlosLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly vlak: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  /** Which wall this is, so the room can be drawn around it. */
  readonly surface: Surface;
  readonly wand: Wand;
};

const UITLEG_EERSTE = [
  'DE GIPSPLAAT ZIT EROP. EN NU MOET ALLES WAT AAN DEZE WAND HANGT ERAAN VAST: KASTJES, BEUGELS, EEN RADIATOR.',
  'ELK DING HEEFT EEN KLOS NODIG. EEN BLOK HOUT ACHTER DE PLAAT, DIRECT ERNAAST, ERBOVEN OF ERONDER. IK HEB ZE ERIN GEZET. IK HEB ZE NIET OPGESCHREVEN.',
  'TWEE KLOSSEN RAKEN ELKAAR NOOIT, OOK NIET MET DE PUNTEN. EN DE GETALLEN LANGS DE RAND ZIJN DE BALKENDETECTOR: ZOVEEL KLOSSEN IN DIE RIJ OF KOLOM.',
  'KLIK EEN VAKJE: EEN KEER IS EEN KRUIS, DAAR ZIT NIKS. TWEE KEER IS BOREN. NOG EEN KEER EN JE VULT HET WEER DICHT - MAAR HET GAT TELT, EN BEN JE DE KLOS.',
];

const UITLEG_RAAM = [
  'VOLGENDE WAND. ZELFDE VERHAAL, MEER KLOSSEN.',
  'ACHTER EEN RAAM ZIT GEEN HOUT, DUS DAAR KUN JE AL EEN STREEP DOOR ZETTEN. SCHIET LEKKER OP.',
];

const UITLEG_LAATSTE = [
  'DE GROOTSTE WAND VAN HET HUIS, EN DE MEESTE KLOSSEN.',
  'BEGIN BIJ DE NULLEN EN BIJ DINGEN DIE MAAR EEN KANT OP KUNNEN. DE REST VOLGT, AL DUURT HET EVEN.',
];

function surfaceVan(id: string): Surface {
  const surface = SURFACES.find((s) => s.id === id);
  if (!surface) throw new Error(`no surface ${id}`);
  return surface;
}

/** The seed is part of the level: it is the wall, not a hint at one. */
function wandVan(id: string, aantal: number, seed: number): Wand {
  const wand = genereer({ surface: surfaceVan(id), aantal, seed });
  if (!wand) throw new Error(`seed ${seed} no longer yields a wall for ${id}`);
  return wand;
}

export const KLOS_LEVELS: readonly KlosLevel[] = [
  {
    id: 'klossen-keuken-zijwand',
    ruimte: 'KEUKEN',
    vlak: 'ZIJWAND',
    praatje: 'ZES DINGEN, ZES KLOSSEN. BEGIN BIJ EEN NUL.',
    uitleg: UITLEG_EERSTE,
    surface: surfaceVan('keuken-zijwand'),
    wand: wandVan('keuken-zijwand', 6, 586),
  },
  {
    id: 'klossen-tvkamer-kopgevel',
    ruimte: 'TV-KAMER',
    vlak: 'KOPGEVEL',
    praatje: 'DE TV MOET ERGENS AAN. HET RAAM HELPT JE.',
    uitleg: UITLEG_RAAM,
    surface: surfaceVan('tvkamer-kopgevel'),
    wand: wandVan('tvkamer-kopgevel', 9, 1507),
  },
  {
    id: 'klossen-woonkamer-tuinwand',
    ruimte: 'WOONKAMER',
    vlak: 'TUINWAND',
    praatje: 'TWAALF KLOSSEN EN TWEE RAMEN. RUSTIG AAN.',
    uitleg: UITLEG_LAATSTE,
    surface: surfaceVan('woonkamer-tuinwand'),
    wand: wandVan('woonkamer-tuinwand', 12, 1540),
  },
];
