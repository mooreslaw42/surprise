/**
 * The house, in 24 colours.
 *
 * Sampled from the walkthrough video, one cluster pass per room, then pulled
 * apart by value. A literal sample of that footage is 24 shades of beige —
 * the house is genuinely earthy and the light is soft — which would be
 * unreadable at 384x216. So the hues are the real ones and the saturation and
 * spacing are a 1986 artist's, which is what mapping a room onto a C64 always
 * meant in practice.
 *
 * Six neutrals, then six material ramps of three. Every ramp is dark / mid /
 * light so any material can be shaded, lit, or dithered against its own
 * neighbours without reaching into another ramp.
 */
export const PALETTE = [
  // Neutrals: soot through plaster.
  '#0e0d0b', // 0  zwart
  '#241e19', // 1  roet
  '#46392f', // 2  steen
  '#6b6358', // 3  asgrijs
  '#9a9081', // 4  zandgrijs
  '#cdc6b2', // 5  kalk
  '#f5f2e6', // 6  wit

  // Salie: the tongue-and-groove ceiling, the signature colour of the house.
  '#3d5247', // 7  donkersalie
  '#7e9c86', // 8  salie
  '#bad0bf', // 9  lichtsalie

  // Oker: the big wall in the book room.
  '#7d4a1c', // 10 donkeroker
  '#cc8a2e', // 11 oker
  '#f0c06a', // 12 lichtoker

  // Terracotta: curtains, brick, the red wall.
  '#47201a', // 13 donkerrood
  '#913b27', // 14 terracotta
  '#c25f33', // 15 roestrood

  // Hout: mahogany floor through bare pine.
  '#6e2f23', // 16 mahonie
  '#a9743f', // 17 hout
  '#d9a86a', // 18 lichthout

  // Buiten: what you see through the windows, plus the wallpaper.
  '#e3e08f', // 19 botergeel  (the check wallpaper, and glass wool)
  '#5e7a3a', // 20 mosgroen   (garden)
  '#8fc3dd', // 21 luchtblauw (sky, cold water)
  '#2d4663', // 22 diepblauw  (night, drains)
  '#8e3a5c', // 23 magenta    (the curtains, and the ventilation that never comes)
] as const;

export type Color = number;

/** Dutch names, shown on the design sheet. */
export const PALETTE_NAMES = [
  'ZWART', 'ROET', 'STEEN', 'ASGRIJS', 'ZANDGRIJS', 'KALK', 'WIT',
  'DONKERSALIE', 'SALIE', 'LICHTSALIE',
  'DONKEROKER', 'OKER', 'LICHTOKER',
  'DONKERROOD', 'TERRACOTTA', 'ROESTROOD',
  'MAHONIE', 'HOUT', 'LICHTHOUT',
  'BOTERGEEL', 'MOSGROEN', 'LUCHTBLAUW', 'DIEPBLAUW', 'MAGENTA',
] as const;

export const C = {
  ZWART: 0,
  ROET: 1,
  STEEN: 2,
  ASGRIJS: 3,
  ZANDGRIJS: 4,
  KALK: 5,
  WIT: 6,
  DONKERSALIE: 7,
  SALIE: 8,
  LICHTSALIE: 9,
  DONKEROKER: 10,
  OKER: 11,
  LICHTOKER: 12,
  DONKERROOD: 13,
  TERRACOTTA: 14,
  ROESTROOD: 15,
  MAHONIE: 16,
  HOUT: 17,
  LICHTHOUT: 18,
  BOTERGEEL: 19,
  MOSGROEN: 20,
  LUCHTBLAUW: 21,
  DIEPBLAUW: 22,
  MAGENTA: 23,
} as const;

/**
 * What each material is drawn with, so puzzle code asks for "the gas pipe"
 * rather than picking a colour and drifting from the rest of the game.
 */
export const MATERIAL = {
  PLEISTER: C.KALK,
  GIPSPLAAT: C.ZANDGRIJS,
  STUD: C.HOUT,
  BALK: C.STEEN,
  ISOLATIE: C.BOTERGEEL,
  BEHANG: C.BOTERGEEL,
  VLOER: C.MAHONIE,
  ONDERVLOER: C.LICHTHOUT,
  PLAFOND: C.SALIE,
  ELEKTRA: C.LICHTOKER,
  WARMWATER: C.ROESTROOD,
  KOUDWATER: C.LUCHTBLAUW,
  AFVOER: C.DIEPBLAUW,
  VENTILATIE: C.MAGENTA,
  GEVAAR: C.ROESTROOD,
  STAAL: C.ASGRIJS,
  TUIN: C.MOSGROEN,
  LUCHT: C.LUCHTBLAUW,
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

/** Perceived lightness 0-255, used to check ramps stay readable. */
export function luma(index: Color): number {
  const hex = PALETTE[index]!;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
