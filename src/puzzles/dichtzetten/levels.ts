import { maakWand, type Wand } from './model.ts';

/**
 * Dichtzetniveaus: the frame behind the board, as numbers.
 *
 * Generated and then checked: every one of these can be reasoned out square
 * by square without ever guessing, which is what separates a puzzle from a
 * coin toss.
 *
 * PROVISIONAL: the frames are stand-ins until the real wall drawings land.
 */

export type DichtLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly vlak: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly wand: Wand;
};

const UITLEG_EERSTE = [
  'DICHTZETTEN. DE GIPSPLAAT GAAT EROP, MAAR ELKE SCHROEF MOET HOUT RAKEN.',
  'DE GETALLEN BOVEN EN OPZIJ ZEGGEN HOE LANG DE STUKKEN HOUT ZIJN IN DIE RIJ OF KOLOM, OP VOLGORDE.',
  'KLIK EEN VAKJE: EEN KEER IS HOUT, TWEE KEER IS LEEG, DRIE KEER IS WEER NIKS. REKEN HET UIT.',
];

const UITLEG_LATER = [
  'VOLGENDE WAND. MEER REGELS TUSSEN DE STIJLEN, DUS MEER GETALLEN.',
  'ER VALT ALTIJD IETS UIT TE REKENEN. JE HOEFT NOOIT TE GOKKEN.',
];

export const DICHT_LEVELS: readonly DichtLevel[] = [
  {
    id: 'dichtzetten-keuken',
    ruimte: 'KEUKEN',
    vlak: 'ZIJWAND',
    praatje: 'STIJLEN OM DE DRIE. BEGIN BIJ DE RANDEN.',
    uitleg: UITLEG_EERSTE,
    wand: maakWand([
      '##########',
      '#..#..#..#',
      '##########',
      '#..#..#..#',
      '#..#..#..#',
      '#..#..#..#',
      '#..#..#..#',
      '##########',
    ]),
  },
  {
    id: 'dichtzetten-woonkamer',
    ruimte: 'WOONKAMER',
    vlak: 'BINNENMUUR',
    praatje: 'HIER ZITTEN REGELS TUSSEN. LET OP DE VOLGORDE.',
    uitleg: UITLEG_LATER,
    wand: maakWand([
      '############',
      '#..#..#..#.#',
      '#..####..#.#',
      '#..#..####.#',
      '####..#..#.#',
      '####..#..#.#',
      '####..#..#.#',
      '#..#..#..#.#',
      '############',
    ]),
  },
  {
    id: 'dichtzetten-tvkamer',
    ruimte: 'TV-KAMER',
    vlak: 'ZIJWAND',
    praatje: 'DE GROOTSTE WAND, EN DE MEESTE REGELS.',
    uitleg: UITLEG_LATER,
    wand: maakWand([
      '##############',
      '#...#...#...##',
      '#####...######',
      '#...#...#...##',
      '#...#...######',
      '#...#...#...##',
      '#########...##',
      '#...#...#...##',
      '#...#...#...##',
      '##############',
    ]),
  },
];
