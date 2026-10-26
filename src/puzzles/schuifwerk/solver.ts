import { type Plan, type Stuk, type Zet, isSolved, kanSchuiven, schuif, sleutel } from './model.ts';

/**
 * Fewest slides that get the main piece out of the door.
 *
 * Breadth-first over positions, so the first time the puzzle comes out is by
 * definition the shortest way — par is a proven minimum here, not a best
 * effort. The state space is small: a handful of pieces on a six-by-six grid.
 *
 * Also used to prove every shipped plan is solvable at all, which a sliding
 * puzzle makes very easy to get wrong by hand.
 */

const STATE_BUDGET = 400_000;

export type SolveResult = { par: number; zetten: Zet[] };

export function solve(plan: Plan): SolveResult {
  const start = plan.stukken;
  if (isSolved(plan, start)) return { par: 0, zetten: [] };

  const seen = new Map<string, { stukken: Stuk[]; via: string | null; zet: Zet | null }>();
  seen.set(sleutel(start), { stukken: [...start], via: null, zet: null });
  let frontier = [sleutel(start)];

  while (frontier.length > 0) {
    if (seen.size > STATE_BUDGET) throw new Error('leeghalen solver gave up');
    const next: string[] = [];

    for (const key of frontier) {
      const here = seen.get(key)!;
      for (let i = 0; i < here.stukken.length; i++) {
        // Every distance in both directions counts as one slide, as it does
        // on the table: you push a piece until it stops.
        for (const richting of [-1, 1] as const) {
          for (let stap = 1; stap < Math.max(plan.width, plan.height); stap++) {
            const delta = richting * stap;
            if (!kanSchuiven(plan, here.stukken, i, delta)) break;
            const moved = schuif(plan, here.stukken, i, delta);
            const movedKey = sleutel(moved);
            if (seen.has(movedKey)) continue;
            const zet: Zet = { id: here.stukken[i]!.id, stap: delta };
            seen.set(movedKey, { stukken: moved, via: key, zet });
            if (isSolved(plan, moved)) {
              const zetten: Zet[] = [];
              let at: string | null = movedKey;
              while (at !== null) {
                const node: { via: string | null; zet: Zet | null } = seen.get(at)!;
                if (node.zet) zetten.unshift(node.zet);
                at = node.via;
              }
              return { par: zetten.length, zetten };
            }
            next.push(movedKey);
          }
        }
      }
    }
    frontier = next;
  }
  throw new Error('this plan cannot be solved');
}
