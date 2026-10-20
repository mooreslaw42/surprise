/**
 * Fixed 24-colour palette. Indices 0-15 are the Commodore 64 palette (Pepto
 * values) for the 80s baseline; 16-23 are renovation materials added so the
 * real room colours have somewhere to live.
 *
 * All drawing goes through palette indices, never raw hex, so the whole game
 * can be recoloured from this one file.
 */
export const PALETTE = [
  '#000000', // 0  zwart
  '#ffffff', // 1  wit
  '#68372b', // 2  rood
  '#70a4b2', // 3  cyaan
  '#6f3d86', // 4  paars
  '#588d43', // 5  groen
  '#352879', // 6  blauw
  '#b8c76f', // 7  geel
  '#6f4f25', // 8  oranjebruin
  '#433900', // 9  bruin
  '#9a6759', // 10 lichtrood
  '#444444', // 11 donkergrijs
  '#6c6c6c', // 12 grijs
  '#9ad284', // 13 lichtgroen
  '#6c5eb5', // 14 lichtblauw
  '#959595', // 15 lichtgrijs
  '#d9c9a3', // 16 gipsplaat
  '#8a5a2b', // 17 hout
  '#c8832b', // 18 vuren
  '#e8e8d0', // 19 verf, gebroken wit
  '#b33a2b', // 20 signaalrood, gevaar
  '#2b6e6e', // 21 leidingwater
  '#e0b020', // 22 koper, elektra
  '#3a3a4a', // 23 staal, balken
] as const;

export type Color = number;

export const C = {
  BLACK: 0,
  WHITE: 1,
  RED: 2,
  CYAN: 3,
  PURPLE: 4,
  GREEN: 5,
  BLUE: 6,
  YELLOW: 7,
  ORANGE: 8,
  BROWN: 9,
  LIGHTRED: 10,
  DARKGREY: 11,
  GREY: 12,
  LIGHTGREEN: 13,
  LIGHTBLUE: 14,
  LIGHTGREY: 15,
  PLASTER: 16,
  WOOD: 17,
  PINE: 18,
  PAINT: 19,
  DANGER: 20,
  WATER: 21,
  COPPER: 22,
  STEEL: 23,
} as const;

/** Palette as packed little-endian RGBA, for direct ImageData writes. */
export const PALETTE_RGBA: Uint32Array = (() => {
  const out = new Uint32Array(PALETTE.length);
  for (let i = 0; i < PALETTE.length; i++) {
    const hex = PALETTE[i]!;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    out[i] = (255 << 24) | (b << 16) | (g << 8) | r;
  }
  return out;
})();
