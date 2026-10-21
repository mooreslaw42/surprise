import {
  type Muur, type Plaatsing, type Vorm,
  doelCellen, draaiVorm, periode,
} from './model.ts';

/**
 * The best the wall can be insulated: fill the cavity exactly, with the
 * highest Rc the stack allows.
 *
 * Always works on the first cell still bare and only considers batts that
 * could cover it. That is the standard way to pack polyominoes and it keeps
 * the search tiny — every branch commits a cell rather than wandering.
 *
 * Used to set par, and to prove a cavity can be filled at all, which is very
 * easy to get wrong when authoring by hand.
 */

const NODE_BUDGET = 1_500_000;

export type SolveResult = { par: number; plaatsingen: Plaatsing[] };

// The anchor is kept rather than derived from the cells: for an L the
// first cell is not the corner the offsets are measured from.
type Kandidaat = { deken: number; draai: number; x: number; y: number; offsets: number[] };

export function solve(muur: Muur): SolveResult {
  const size = muur.width * muur.height;
  const nodig = doelCellen(muur);

  // Every batt in every distinct turn, as cell offsets from its own corner.
  const vormen: { deken: number; draai: number; vorm: Vorm }[] = [];
  muur.dekens.forEach((deken, i) => {
    for (let k = 0; k < periode(deken.vorm); k++) {
      vormen.push({ deken: i, draai: k, vorm: draaiVorm(deken.vorm, k) });
    }
  });

  // For each cell, the ways a batt can be laid so that it covers that cell.
  const perCel: Kandidaat[][] = Array.from({ length: size }, () => []);
  for (const { deken, draai, vorm } of vormen) {
    for (let y = 0; y < muur.height; y++) {
      for (let x = 0; x < muur.width; x++) {
        const cellen: number[] = [];
        let past = true;
        for (const [dx, dy] of vorm) {
          const cx = x + dx;
          const cy = y + dy;
          if (cx < 0 || cy < 0 || cx >= muur.width || cy >= muur.height) { past = false; break; }
          const cel = cy * muur.width + cx;
          if (!muur.doel[cel]) { past = false; break; }
          cellen.push(cel);
        }
        if (!past) continue;
        for (const cel of cellen) perCel[cel]!.push({ deken, draai, x, y, offsets: cellen });
      }
    }
  }

  // Two batts of the same shape and Rc are the same batt as far as the wall
  // is concerned. Without this the search tries every ordering of them and
  // never finishes.
  const soortVan = muur.dekens.map((d) => `${d.rc}:${draaiVorm(d.vorm, 0).map(([x, y]) => `${x},${y}`).join(';')}`);
  const eersteVanSoort = muur.dekens.map((_, i) =>
    soortVan.findIndex((k) => k === soortVan[i]));

  const bedekt = new Uint8Array(size);
  const gebruikt = new Uint8Array(muur.dekens.length);
  const huidig: Plaatsing[] = [];
  const beste: { rc: number; plaatsingen: Plaatsing[] }[] = [];
  let nodes = 0;
  let gevuld = 0;

  // A ceiling on what the rest of the wall can still be worth: the bare cells
  // that remain, times the best Rc per cell any unused batt offers. Summing
  // every unused batt's Rc instead is a far weaker bound and the search does
  // not finish.
  const perCelRc = muur.dekens.map((d) => d.rc / d.vorm.length);
  const restRc = (): number => {
    let beste2 = 0;
    for (let i = 0; i < muur.dekens.length; i++) {
      if (!gebruikt[i] && perCelRc[i]! > beste2) beste2 = perCelRc[i]!;
    }
    return (nodig - gevuld) * beste2;
  };

  const zoek = (rc: number): void => {
    if (++nodes > NODE_BUDGET) throw new Error('isolatie solver gave up');
    if (gevuld === nodig) {
      if (!beste[0] || rc > beste[0].rc) beste[0] = { rc, plaatsingen: [...huidig] };
      return;
    }
    if (beste[0] && rc + restRc() <= beste[0].rc) return;

    let cel = -1;
    for (let i = 0; i < size; i++) {
      if (muur.doel[i] && !bedekt[i]) { cel = i; break; }
    }
    if (cel < 0) return;

    for (const kandidaat of perCel[cel]!) {
      if (gebruikt[kandidaat.deken]) continue;
      // Of several identical batts, only ever reach for the first spare one.
      let eerder = false;
      for (let j = eersteVanSoort[kandidaat.deken]!; j < kandidaat.deken; j++) {
        if (soortVan[j] === soortVan[kandidaat.deken] && !gebruikt[j]) { eerder = true; break; }
      }
      if (eerder) continue;
      if (kandidaat.offsets.some((c) => bedekt[c])) continue;

      for (const c of kandidaat.offsets) bedekt[c] = 1;
      gebruikt[kandidaat.deken] = 1;
      gevuld += kandidaat.offsets.length;
      huidig.push({
        deken: kandidaat.deken,
        draai: kandidaat.draai,
        x: kandidaat.x,
        y: kandidaat.y,
      });

      zoek(rc + muur.dekens[kandidaat.deken]!.rc);

      huidig.pop();
      gevuld -= kandidaat.offsets.length;
      gebruikt[kandidaat.deken] = 0;
      for (const c of kandidaat.offsets) bedekt[c] = 0;
    }
  };

  zoek(0);
  const gevonden = beste[0];
  if (!gevonden) throw new Error('this cavity cannot be filled with these batts');
  return { par: gevonden.rc, plaatsingen: gevonden.plaatsingen };
}
