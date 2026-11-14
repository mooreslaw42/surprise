import type { Spreker } from '../scenes/portretten.ts';

/**
 * Everything anybody says that is not the explanation of a puzzle.
 *
 * Kept in one file on purpose: this is the copy, and the person who has to
 * read it over is not the person who wrote the game. Nothing in here is
 * logic. Change a line, and that is the line that gets said.
 *
 * CONCEPT, all of it, until Pim has been through it. The font is capitals
 * only and a line wraps by itself, so write it the way it should be read.
 */

export type Beat = { readonly wie: Spreker; readonly tekst: readonly string[] };

/**
 * What is said on the way back to the house map, the first time a stage is
 * finished. Keyed by the stage's id in data/stages.ts.
 *
 * The pattern is the joke. Moeder asks after her kleiatelier every single
 * phase. Wiep asks for help with the tiny house every phase until Elektra,
 * then turns up with a trailer instead, and after that says nothing at all,
 * which Pim notices exactly once.
 */
export const NA_FASE: Record<string, readonly Beat[]> = {
  leeghalen: [
    { wie: 'pim', tekst: ['LEEG. ZO LEEG IS HET HIER NOG NOOIT GEWEEST, EN ZO LEEG WORDT HET OOK NOOIT MEER.'] },
    { wie: 'moeder', tekst: ['KEURIG. EN WAAR STAAT ALLES NU?', 'IN MIJN KLEIATELIER. NATUURLIJK. WANNEER KAN IK DAAR WEER IN?'] },
    { wie: 'wiep', tekst: ['NU JE TOCH BEZIG BENT: HELP JE STRAKS EVEN MET MIJN TINY HOUSE? HET IS MAAR EEN KLEIN HUISJE.'] },
    { wie: 'pim', tekst: ['STRAKS. EERST SLOPEN.'] },
  ],
  sloop: [
    { wie: 'moeder', tekst: ['HET STOF ZIT TOT IN MIJN KLEI. DAT IS GEEN GLAZUUR, WOUTER.', 'WANNEER IS HET ATELIER WEER VAN MIJ?'] },
    { wie: 'wiep', tekst: ['SLOPEN KAN JE DUS. BOUWEN OOK? IK HEB NOG STEEDS EEN TINY HOUSE DAT ER NIET STAAT.'] },
    { wie: 'pim', tekst: ['STRAKS. EERST HET VENTILATIEPLAN. DAT IS ZO GEDAAN.'] },
  ],
  kp1: [
    { wie: 'pim', tekst: ['PLAN GOEDGEKEURD. DE UNIT IS BESTELD.', 'LEVERING: WEEK 14. WELK JAAR STOND ER NIET BIJ.'] },
  ],
  isolatie: [
    { wie: 'pim', tekst: ['RC JE WEL? GEEN KOUDEBRUG MEER TE VINDEN.'] },
    { wie: 'moeder', tekst: ['LEKKER WARM STRAKS. IN MIJN ATELIER IS HET NOG STEEDS KOUD. EN VOL. MET JOUW SPULLEN.'] },
    { wie: 'wiep', tekst: ['MIJN TINY HOUSE HEEFT RC NUL. HET BESTAAT NAMELIJK NOG NIET. HELP JE NOU?'] },
    { wie: 'pim', tekst: ['STRAKS. EERST DE ELEKTRA. DAT STAAT ONDER SPANNING.'] },
  ],
  elektra: [
    { wie: 'moeder', tekst: ['ER IS LICHT! IS ER DAN OOK EEN LICHTPUNTJE VOOR MIJN ATELIER?'] },
    { wie: 'pim', tekst: ['WIEP VRAAGT DEZE KEER NIETS. DAT IS VERDACHT.'] },
  ],
  tuinhuis: [
    { wie: 'moeder', tekst: ['WIEP WOONT. IN EEN MIDDAG.', 'EN MIJN ATELIER DAN? DAT IS OOK MAAR EEN KLEIN HUISJE.'] },
    { wie: 'pim', tekst: ['MOOI. DAN NU WEER EVEN HET VENTILATIEPLAN.'] },
  ],
  kp2: [
    { wie: 'pim', tekst: ['WEER GOEDGEKEURD. LEVERING: WEEK 23.', 'WTW: WACHTEN TOTDAT \'T WERKT.'] },
  ],
  dichtzetten: [
    { wie: 'pim', tekst: ['ALLES ZIT DICHT. WAT ER NU NOG ACHTER MOET, MOET ER DOORHEEN.'] },
    { wie: 'moeder', tekst: ['ALLES DICHT, BEHALVE DE DEUR VAN MIJN ATELIER. DIE KRIJG IK NIET MEER OPEN VAN DE DOZEN.'] },
    { wie: 'pim', tekst: ['WIEP VRAAGT AL EEN TIJDJE NIETS MEER. DAT IS EVEN WENNEN.'] },
  ],
  kp3: [
    { wie: 'pim', tekst: ['DE HELE BOVENKANT, GOEDGEKEURD. LEVERING: WEEK 31.', 'ZE HEBBEN GEBELD. HIJ STAAT IN EEN LOODS. ZE WETEN ALLEEN NIET WELKE.'] },
  ],
  vloeren: [
    { wie: 'moeder', tekst: ['WAT EEN VLOER. DAAR MAG JE ZEKER ALLEEN OP SOKKEN OP?', 'NET ALS IN MIJN ATELIER. O NEE. DAAR MAG IK HELEMAAL NIET IN.'] },
  ],
  kp4: [
    { wie: 'pim', tekst: ['PLAN VIER. GOEDGEKEURD, UITERAARD. LEVERING: WEEK 47.', 'ALLES MET EEN BEETJE AFSCHOT. VOORAL DE PLANNING.'] },
  ],
  schilderen: [
    { wie: 'moeder', tekst: ['OKER. PRACHTIG. IK HAD HET ZELF KUNNEN MENGEN, ALS IK BIJ MIJN KLEI KON.'] },
    { wie: 'pim', tekst: ['NOG EEN PLAN, EN DAN IS HET HUIS AF. OP EEN DING NA.'] },
  ],
  kp5: [
    { wie: 'pim', tekst: ['HET HELE HUIS, OP PAPIER. LEVERING: MORGEN.', 'DAT ZEIDEN ZE GISTEREN OOK.'] },
  ],
};

/**
 * Zwart & Dekker. One tool gives up per phase, halfway through a wall, and
 * it never costs anything but the time it takes to read this.
 */
export type Pech = { readonly gereedschap: string; readonly tekst: readonly string[] };

export const SLOGAN = 'ZWART & DEKKER: ALTIJD DEKKING, NOOIT GARANTIE.';

export const PECH: Record<string, Pech> = {
  leeghalen: {
    gereedschap: 'STEEKWAGEN',
    tekst: ['DAT WAS HET WIELTJE VAN DE STEEKWAGEN.', SLOGAN, 'HIER, DE RESERVE. DIE PIEPT, MAAR HIJ ROLT.'],
  },
  sloop: {
    gereedschap: 'VOORHAMER',
    tekst: ['DE KOP VAN DE VOORHAMER LIGT IN DE TUIN. DE STEEL HEB JE NOG.', SLOGAN, 'HIER IS EEN NIEUWE. NIET TE HARD SLAAN.'],
  },
  isolatie: {
    gereedschap: 'ISOLATIEZAAG',
    tekst: ['DE ISOLATIEZAAG ZAAGT NIET MEER. HIJ AAIT ALLEEN NOG.', SLOGAN, 'HIER, DE VOLGENDE. ER ZATEN ER DRIE IN DE AANBIEDING.'],
  },
  elektra: {
    gereedschap: 'STRIPTANG',
    tekst: ['DE STRIPTANG STRIPT NIET MEER. HIJ KNIJPT ALLEEN NOG, EN DAT KAN JE ZELF OOK.', SLOGAN, 'NIEUWE TANG. ZELFDE DOOS, ZELFDE BELOFTE.'],
  },
  klossen: {
    gereedschap: 'ACCUBOOR',
    tekst: ['DE ACCU IS LEEG. DE RESERVE-ACCU OOK. DIE LAG AL TWEE JAAR AAN DE LADER.', SLOGAN, 'HIER, EEN BOOR MET EEN SNOER. DIE KAN TENMINSTE NIET LEEG.'],
  },
  vloeren: {
    gereedschap: 'DECOUPEERZAAG',
    tekst: ['HET ZAAGJE IS KROM. OF DE VLOER. NEE, HET ZAAGJE.', SLOGAN, 'NIEUW ZAAGJE. EERST METEN, DAN ZAGEN. DAT WIST JE AL.'],
  },
  schilderen: {
    gereedschap: 'VERFSPUIT',
    tekst: ['DE VERFSPUIT SPUIT NIET MEER. HIJ DRUPPELT. OP DE NIEUWE VLOER.', SLOGAN, 'DAN MAAR DE ROLLER. DIE KAN NIET KAPOT.'],
  },
};

/**
 * The rolmaat, before the three phases where material gets cut. Three
 * readings that do not agree, an average, and the line the whole family
 * already knows.
 */
export const METEN: Record<string, { readonly wat: string; readonly metingen: readonly number[]; readonly na: readonly string[] }> = {
  isolatie: {
    wat: 'HET VAK TUSSEN DE STIJLEN',
    metingen: [582, 579, 581],
    na: ['GEMIDDELD 58,1. METEN IS WETEN.', 'TIEN KEER METEN IS WOUTER. DE ANDERE ZEVEN MAG JE THUIS DOEN.'],
  },
  klossen: {
    wat: 'DE WAND, VAN HOEK TOT HOEK',
    metingen: [3412, 3409, 3411],
    na: ['GEMIDDELD 341,1. DE PLAAT IS 120 BREED, DUS DAT WORDT ZAGEN.', 'NU NOG WETEN WAT ERACHTER ZIT.'],
  },
  vloeren: {
    wat: 'DE KAMER, IN DE LENGTE',
    metingen: [4873, 4870, 4871],
    na: ['GEMIDDELD 487,1. EEN PLANK IS 220. REKEN MAAR UIT.', 'EN ELK STUK DAT JE AFZAAGT IS HET BEGIN VAN DE VOLGENDE RIJ.'],
  },
};

/** The nudges the level wrapper shows. Short: they sit in one line. */
export const WENK = {
  hint: 'VAST? H = EEN HINT VAN PIM',
  overslaan: 'DRIE KEER OPNIEUW. O = OVERSLAAN',
  zeker: 'ZEKER? NOG EEN KEER O',
} as const;
