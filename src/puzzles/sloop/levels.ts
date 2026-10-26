import { SURFACES, type Achtergrond, type RoomId, type Surface } from '../../data/house.ts';
import { metLeidingen, surfaceToRows, type Leidingen } from './generate.ts';
import { parseGrid, type Grid } from './model.ts';

/**
 * Sloop levels, on the measured walls, with the services laid into them.
 *
 * Par is computed by the solver, never written down, so it cannot drift. The
 * service layouts are not decoration either: each one was chosen by sweeping
 * every position and keeping the one where the two obvious ways of going
 * about it — always take the biggest bite, or just work along the bottom —
 * both lose by a clear margin. See tools/sloop-kies.ts.
 *
 * In order of par, so the stage gets harder as it goes.
 *
 * PROVISIONAL: where the gas and the cable actually run is a guess until he
 * tells me. The walls they run through are measured.
 */
export type SloopLevel = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly vlak: string;
  readonly praatje: string;
  readonly achtergrond: Achtergrond;
  readonly rows: readonly string[];
};

const PRAATJES: Record<string, string> = {
  'tvkamer-kopgevel': 'SLA DE ONDERSTE LAAG WEG EN KIJK WAT ER GEBEURT.',
  'keuken-zijwand': 'DE GASLEIDING. DAAR BLIJF JE VAN AF.',
  'woonkamer-binnenmuur': 'ALLES ACHTER DE LEIDING BLIJFT STAAN. DUS DAAR MOET JE HEEN.',
  'tvkamer-tuinwand': 'DE GASLEIDING ZIT IN DE HOEK. HANDIG, OF NIET.',
  'woonkamer-tuinwand': 'TWEE LATEIEN HOUDEN HUN EIGEN STUK MUUR OVEREIND.',
  'keuken-achterwand': 'DE GROOTSTE WAND. GAS EN KABEL ALLEBEI.',
};

/** Where the services run. One line per wall, swept rather than guessed. */
const LEIDINGEN: Record<string, Leidingen> = {
  'tvkamer-kopgevel': { val: { kolom: 6, tot: 5 } },
  'keuken-zijwand': { gas: { kolom: 4, hoogte: 6 } },
  'woonkamer-binnenmuur': { gas: { kolom: 7, hoogte: 6 } },
  'tvkamer-tuinwand': { gas: { kolom: 0, hoogte: 5 } },
  'woonkamer-tuinwand': { kabel: { rij: 5, van: 7, tot: 13 } },
  'keuken-achterwand': { gas: { kolom: 9, hoogte: 6 }, kabel: { rij: 3, van: 1, tot: 8 } },
};

/** The order they are played in: easiest wall first. */
const VOLGORDE = [
  'tvkamer-kopgevel',
  'keuken-zijwand',
  'woonkamer-binnenmuur',
  'tvkamer-tuinwand',
  'woonkamer-tuinwand',
  'keuken-achterwand',
];

function surfaceVan(id: string): Surface {
  const surface = SURFACES.find((s) => s.id === id);
  if (!surface) throw new Error(`no surface ${id}`);
  return surface;
}

export const SLOOP_LEVELS: readonly SloopLevel[] = VOLGORDE.map((id) => {
  const surface = surfaceVan(id);
  return {
    id: `sloop-${surface.id}`,
    ruimte: surface.ruimte,
    vlak: surface.naam,
    achtergrond: surface.achtergrond,
    praatje: PRAATJES[surface.id] ?? 'SLOPEN MAAR. VOORZICHTIG.',
    rows: metLeidingen(surfaceToRows(surface), LEIDINGEN[surface.id] ?? {}),
  };
});

export function gridFor(level: SloopLevel): Grid {
  return parseGrid(level.rows);
}

export const UITLEG_EERSTE = [
  'SLOPEN. EN SLOPEN IS NIET: ALLES KAPOT SLAAN. SLOPEN IS DE MUUR ZOVER KRIJGEN DAT HIJ HET ZELF DOET.',
  'EEN STEEN BLIJFT LIGGEN ZOLANG ER IETS ONDER ZIT, OF ONDER EEN VAN ZIJN TWEE SCHOUDERS. HAAL JE DAT WEG, DAN KOMT HIJ NAAR BENEDEN. EN DE STEEN DAARBOVEN OOK.',
  'DUS EEN GAT WORDT NAAR BOVEN TOE EEN DRIEHOEK. TWEE KLAPPEN NAAST ELKAAR ZIJN VEEL MEER WAARD DAN TWEE KLAPPEN UIT ELKAAR.',
  'KIES JE GEREEDSCHAP MET 1, 2 EN 3. EN WAT BLIJFT, BLIJFT: DE BALK, DE GASLEIDING, EN DIE ENE KABEL.',
];

export const UITLEG_LEIDING = [
  'DEZE WAND HEEFT EEN GASLEIDING. DAAR MAG DE HAMER NIET BIJ IN DE BUURT KOMEN.',
  'EN LET OP: WAT OP DE LEIDING RUST VALT NOOIT VANZELF. ER STAAT STRAKS EEN KOLOM MUUR DROOG ONDER DIE PARAPLU, EN DIE MOET JE MET DE BEITEL UIT ELKAAR PEUTEREN.',
];
