import type { Wand } from './model.ts';

/**
 * Works the frame out from the numbers alone, the way the player has to.
 *
 * One line at a time: list every arrangement of that line's runs that fits
 * what is already known, and whatever every one of them agrees on is now
 * known too. Go round until nothing new turns up.
 *
 * Mostly this is used to check a wall before it ships: a frame that needs
 * guessing, or that the numbers describe in more than one way, is not a
 * puzzle but a coin toss. The same pass gives the hint its next square.
 */

export const ONBEKEND = -1;
export const LEEG = 0;
export const HOUT = 1;

export type Kennis = number[];

/** Every way the runs can sit in a line of this length. */
function varianten(runs: readonly number[], lengte: number): number[][] {
  const echte = runs.filter((n) => n > 0);
  const out: number[][] = [];
  const bouw = (i: number, vanaf: number, zover: number[]): void => {
    if (i === echte.length) {
      out.push([...zover, ...new Array(lengte - zover.length).fill(LEEG)]);
      return;
    }
    const run = echte[i]!;
    const rest = echte.slice(i + 1).reduce((n, r) => n + r + 1, 0);
    for (let start = vanaf; start + run + rest <= lengte; start++) {
      const regel = [...zover];
      while (regel.length < start) regel.push(LEEG);
      for (let k = 0; k < run; k++) regel.push(HOUT);
      if (i < echte.length - 1) regel.push(LEEG);
      bouw(i + 1, regel.length, regel);
    }
  };
  bouw(0, 0, []);
  return out;
}

function past(variant: readonly number[], bekend: readonly number[]): boolean {
  return variant.every((v, i) => bekend[i] === ONBEKEND || bekend[i] === v);
}

/** What every surviving arrangement of this line agrees on. */
export function lijnSlag(runs: readonly number[], bekend: readonly number[]): number[] | null {
  const kandidaten = varianten(runs, bekend.length).filter((v) => past(v, bekend));
  if (kandidaten.length === 0) return null;
  return bekend.map((_, i) =>
    kandidaten.every((v) => v[i] === kandidaten[0]![i]) ? kandidaten[0]![i]! : ONBEKEND);
}

export type SolveResult = { kennis: Kennis; volledig: boolean };

/** Solve as far as reasoning alone will go. */
export function solve(w: Wand, start?: Kennis): SolveResult {
  const kennis: Kennis = start ? [...start] : new Array(w.width * w.height).fill(ONBEKEND);
  let veranderd = true;
  while (veranderd) {
    veranderd = false;
    for (let y = 0; y < w.height; y++) {
      const bekend = Array.from({ length: w.width }, (_, x) => kennis[y * w.width + x]!);
      const slag = lijnSlag(w.rijHints[y]!, bekend);
      if (!slag) throw new Error('these numbers describe no frame at all');
      slag.forEach((v, x) => {
        if (v !== ONBEKEND && kennis[y * w.width + x] !== v) {
          kennis[y * w.width + x] = v;
          veranderd = true;
        }
      });
    }
    for (let x = 0; x < w.width; x++) {
      const bekend = Array.from({ length: w.height }, (_, y) => kennis[y * w.width + x]!);
      const slag = lijnSlag(w.kolomHints[x]!, bekend);
      if (!slag) throw new Error('these numbers describe no frame at all');
      slag.forEach((v, y) => {
        if (v !== ONBEKEND && kennis[y * w.width + x] !== v) {
          kennis[y * w.width + x] = v;
          veranderd = true;
        }
      });
    }
  }
  return { kennis, volledig: kennis.every((v) => v !== ONBEKEND) };
}

/** True when the numbers can be reasoned through without ever guessing. */
export function eenduidig(w: Wand): boolean {
  const { kennis, volledig } = solve(w);
  if (!volledig) return false;
  return kennis.every((v, i) => (v === HOUT) === w.hout[i]);
}

/** The next square reasoning alone would settle, for the hint. */
export function volgende(w: Wand, gedaan: readonly number[]): number {
  const { kennis } = solve(w, [...gedaan]);
  for (let i = 0; i < kennis.length; i++) {
    if (w.hout[i] && gedaan[i] !== HOUT) return i;
  }
  return -1;
}
