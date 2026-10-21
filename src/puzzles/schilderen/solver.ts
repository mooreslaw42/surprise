import { type Muur, type Streek, buren, teVerven } from './model.ts';

/**
 * The cleanest run: cover every square without going over one twice, which is
 * a Hamiltonian path from where the painter starts.
 *
 * Two prunings make it finish on a wall-sized grid. Always try the square
 * with the fewest ways onward first, which is Warnsdorff's rule and almost
 * always walks straight to an answer. And give up early whenever what is left
 * unpainted has fallen into two pieces, or more than one square has been left
 * with nothing but a dead end.
 *
 * Par is the number of squares to cover: a perfect run goes over each once.
 */

const NODE_BUDGET = 4_000_000;

export type SolveResult = { par: number; streek: Streek };

export function solve(m: Muur): SolveResult {
  const nodig = teVerven(m);
  const gedaan = new Uint8Array(m.verfbaar.length);
  const pad: number[] = [];
  let nodes = 0;

  const buurLijst = m.verfbaar.map((_, i) => (m.verfbaar[i] ? buren(m, i) : []));

  /** What is left to paint must stay in one piece and stay reachable. */
  const nogHaalbaar = (vanaf: number): boolean => {
    const over: number[] = [];
    for (let i = 0; i < gedaan.length; i++) if (m.verfbaar[i] && !gedaan[i]) over.push(i);
    if (over.length === 0) return true;

    const gezien = new Set<number>();
    const stapel = [over[0]!];
    gezien.add(over[0]!);
    while (stapel.length) {
      const i = stapel.pop()!;
      for (const j of buurLijst[i]!) {
        if (gedaan[j] || gezien.has(j)) continue;
        gezien.add(j);
        stapel.push(j);
      }
    }
    if (gezien.size !== over.length) return false;
    // And the piece has to touch where the roller is standing.
    return buurLijst[vanaf]!.some((j) => !gedaan[j]);
  };

  const loop = (hier: number): boolean => {
    if (++nodes > NODE_BUDGET) throw new Error('schilderen solver gave up');
    if (pad.length === nodig) return true;
    if (!nogHaalbaar(hier)) return false;

    // Fewest ways onward first.
    const opties = buurLijst[hier]!
      .filter((j) => !gedaan[j])
      .map((j) => ({ j, graad: buurLijst[j]!.filter((k) => !gedaan[k]).length }))
      .sort((a, b) => a.graad - b.graad);

    for (const { j } of opties) {
      gedaan[j] = 1;
      pad.push(j);
      if (loop(j)) return true;
      pad.pop();
      gedaan[j] = 0;
    }
    return false;
  };

  if (!m.verfbaar[m.start]) throw new Error('the painter starts inside a window');
  gedaan[m.start] = 1;
  pad.push(m.start);
  if (!loop(m.start)) throw new Error('this wall cannot be done in one run');
  return { par: nodig, streek: [...pad] };
}
