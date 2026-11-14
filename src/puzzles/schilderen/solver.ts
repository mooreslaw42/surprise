import { type Muur, type Streek, buren, teVerven } from './model.ts';

/**
 * The cleanest run: cover every square without going over one twice, past
 * the ladder spots in order and ending on the last. A Hamiltonian path with
 * waypoints.
 *
 * Three prunings make it finish on a wall-sized grid. Try the square with
 * the fewest ways onward first, which is Warnsdorff's rule. Give up when
 * what is left unpainted has fallen into two pieces. And give up when any
 * square other than the one the run must end on has been left a dead end —
 * with a fixed finish there is no second place for a path to stop.
 *
 * The same search counts answers, which is how the walls are chosen: a wall
 * ships when there is exactly one.
 *
 * Par is the number of squares to cover: a perfect run goes over each once.
 */

const NODE_BUDGET = 6_000_000;

export type SolveResult = { par: number; streek: Streek };

/** Every clean run, up to `max` of them. Throws if the wall is too big to say. */
export function oplossingen(m: Muur, max: number, budget = NODE_BUDGET): Streek[] {
  const nodig = teVerven(m);
  const n = m.verfbaar.length;
  const gedaan = new Uint8Array(n);
  const pad: number[] = [];
  const uit: Streek[] = [];
  let nodes = 0;

  const buurLijst = m.verfbaar.map((_, i) => (m.verfbaar[i] ? buren(m, i) : []));
  const punten = m.punten ?? [];
  const puntVan = new Int8Array(n).fill(-1);
  punten.forEach((cel, i) => { puntVan[cel] = i; });
  const eind = punten.length > 0 ? punten[punten.length - 1]! : -1;

  const gezien = new Int32Array(n);
  let ronde = 0;
  const stapel = new Int32Array(n);

  /** What is left must hang together, touch the roller, and hide no dead end. */
  const haalbaar = (hier: number, over: number): boolean => {
    if (over === 0) return true;
    ronde++;
    let top = 0;
    let geteld = 0;
    for (const j of buurLijst[hier]!) {
      if (!gedaan[j] && gezien[j] !== ronde) { gezien[j] = ronde; stapel[top++] = j; }
    }
    if (top === 0) return false;
    let doodlopend = 0;
    while (top > 0) {
      const i = stapel[--top]!;
      geteld++;
      let graad = 0;
      let aanKop = false;
      for (const j of buurLijst[i]!) {
        if (j === hier) aanKop = true;
        if (gedaan[j]) continue;
        graad++;
        if (gezien[j] !== ronde) { gezien[j] = ronde; stapel[top++] = j; }
      }
      // A square needs a way in and a way out. The roller standing next to
      // it is a way in; the finish needs no way out.
      const nodigGraad = (i === eind || (eind < 0 && doodlopend === 0) ? 1 : 2) - (aanKop ? 1 : 0);
      if (graad < nodigGraad) {
        if (eind < 0 && graad + (aanKop ? 1 : 0) >= 1) doodlopend++;
        else return false;
        if (doodlopend > 1) return false;
      }
    }
    return geteld === over;
  };

  const loop = (hier: number, volgendPunt: number): void => {
    if (uit.length >= max) return;
    if (++nodes > budget) throw new Error('schilderen solver gave up');
    if (pad.length === nodig) {
      if (eind < 0 || hier === eind) uit.push([...pad]);
      return;
    }
    if (hier === eind) return;
    if (!haalbaar(hier, nodig - pad.length)) return;

    const opties: { j: number; graad: number }[] = [];
    for (const j of buurLijst[hier]!) {
      if (gedaan[j]) continue;
      const punt = puntVan[j]!;
      if (punt >= 0 && punt !== volgendPunt) continue;
      if (j === eind && pad.length !== nodig - 1) continue;
      let graad = 0;
      for (const k of buurLijst[j]!) if (!gedaan[k]) graad++;
      opties.push({ j, graad });
    }
    opties.sort((a, b) => a.graad - b.graad);

    for (const { j } of opties) {
      gedaan[j] = 1;
      pad.push(j);
      loop(j, puntVan[j]! >= 0 ? volgendPunt + 1 : volgendPunt);
      pad.pop();
      gedaan[j] = 0;
      if (uit.length >= max) return;
    }
  };

  if (!m.verfbaar[m.start]) throw new Error('the painter starts inside a window');
  gedaan[m.start] = 1;
  pad.push(m.start);
  loop(m.start, puntVan[m.start]! >= 0 ? 1 : 0);
  return uit;
}

export function solve(m: Muur): SolveResult {
  const [streek] = oplossingen(m, 1);
  if (!streek) throw new Error('this wall cannot be done in one run');
  return { par: teVerven(m), streek };
}
