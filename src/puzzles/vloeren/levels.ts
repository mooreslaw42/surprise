import type { Vloer } from './model.ts';

/**
 * Vloerniveaus, on the real rooms. A cell is a quarter of a metre along the
 * course; a course is half a metre of floor.
 *
 * The rooms are Pim's: the keuken 3 by 5,5 m, the tv-kamer 4,5 by 3 m, the
 * woonkamer 4,5 by 5 m. They are rectangles, near enough. The keuken loses
 * half a metre along one side to the units, which the floor stops against,
 * and two of its courses are a cell short where the pier stands out of the
 * garden wall. Nothing else steps in or out.
 *
 * A rectangle laid om-en-om would be no puzzle at all, so the plank and the
 * joint spacing are picked per room by tools/vloer-zoek.ts so that the
 * two-row rhythm everybody reaches for first costs two to four planks more
 * than the best floor. The best floor chains its off-cuts three and four
 * courses deep, and where the chain breaks is the thing to find.
 */

const recht = (breedte: number, rijen: number): { links: number; breedte: number }[] =>
  Array.from({ length: rijen }, () => ({ links: 0, breedte }));

export type VloerLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly titel: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly vloer: Vloer;
};

const UITLEG_EERSTE = [
  'DE VLOER. JE BEPAALT PER RIJ MAAR EEN DING: HOE LANG DE EERSTE PLANK IS.',
  'DE REST VAN DE RIJ GAAT VOL DOOR TOT DE MUUR, EN DAAR ZAAG JE DE LAATSTE AF.',
  'DAT AFGEZAAGDE STUK MAG DE VOLGENDE RIJ BEGINNEN. DOE JE DAT, DAN KOST DIE RIJ EEN PLANK MINDER.',
  'OM-EN-OM LEGGEN KAN, MAAR DAN GOOI JE HOUT WEG. EN BIJ DE PENANT ZIJN TWEE RIJEN KORTER.',
];

const UITLEG_LATER = [
  'VOLGENDE VLOER. LET OP DE NADEN: TE DICHT ONDER ELKAAR EN HET WORDT EEN STREEP.',
  'EEN RECHTE KAMER, DUS HET GAAT ALLEEN NOG OM HET RESTSTUK. WELK BEGIN LEVERT EEN STUK OP DAT JE DAARNA OOK KWIJT KUNT?',
  'SOMS IS HET GOEDKOPE BEGIN NET HET BEGIN DAT NIET MAG. DAN ZAAG JE TOCH MAAR EEN NIEUWE AAN.',
];

export const VLOER_LEVELS: readonly VloerLevel[] = [
  {
    id: 'vloeren-keuken',
    ruimte: 'KEUKEN',
    titel: 'VLOER KEUKEN',
    praatje: 'TOT AAN HET KEUKENBLOK. DE PENANT STEEKT UIT.',
    uitleg: UITLEG_EERSTE,
    // 2,5 m of floor between the units and the garden wall, 5,5 m long, and
    // the pier takes a cell off two courses.
    vloer: {
      plank: 6,
      versprong: 2,
      vorm: recht(10, 11).map((rij, r) => (r === 4 || r === 5 ? { ...rij, breedte: 9 } : rij)),
    },
  },
  {
    id: 'vloeren-tvkamer',
    ruimte: 'TV-KAMER',
    titel: 'VLOER TV-KAMER',
    praatje: 'BREED EN ONDIEP. KORTE PLANKEN.',
    uitleg: UITLEG_LATER,
    // 4,5 m wide, 3 m deep.
    vloer: { plank: 5, versprong: 2, vorm: recht(18, 6) },
  },
  {
    id: 'vloeren-woonkamer',
    ruimte: 'WOONKAMER',
    titel: 'VLOER WOONKAMER',
    praatje: 'DE GROOTSTE. TIEN RIJEN, LANGE PLANKEN.',
    uitleg: UITLEG_LATER,
    // 4,5 m wide, 5 m deep.
    vloer: { plank: 7, versprong: 3, vorm: recht(18, 10) },
  },
];
