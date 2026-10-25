import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL, TOOLS,
  at, cloneGrid, instorten, isLegal, isProtected, isSolved, onwrikbaar,
  parseGrid, stabiel, stars, steenCount, swing, toolById, footprint,
} from './model.ts';
import { solve } from './solver.ts';
import { SLOOP_LEVELS, gridFor } from './levels.ts';
import { metLeidingen, surfaceToRows, openingCells, gridSize } from './generate.ts';
import { SURFACES } from '../../data/house.ts';

const beitel = toolById('beitel');
const voorhamer = toolById('voorhamer');

test('parseGrid reads the ASCII art', () => {
  const grid = parseGrid(['.#B', 'LK#']);
  assert.equal(grid.width, 3);
  assert.equal(grid.height, 2);
  assert.equal(at(grid, 0, 0), CELL.LEEG);
  assert.equal(at(grid, 1, 0), CELL.STEEN);
  assert.equal(at(grid, 2, 0), CELL.BALK);
  assert.equal(at(grid, 0, 1), CELL.LEIDING);
  assert.equal(at(grid, 1, 1), CELL.KABEL);
});

test('parseGrid rejects ragged and unknown input', () => {
  assert.throws(() => parseGrid(['##', '#']), /ragged/);
  assert.throws(() => parseGrid(['#?']), /unknown cell/);
  assert.throws(() => parseGrid([]), /empty/);
});

test('the ground holds the bottom course up, and the air past the ends does not', () => {
  const grid = parseGrid(['##', '##']);
  assert.ok(stabiel(grid, 0, 1), 'the bottom course rests on the ground');
  const zwevend = parseGrid(['##', '..']);
  assert.ok(!stabiel(zwevend, 0, 0), 'nothing under it and nothing beside it');
});

test('a brick keeps standing on either shoulder', () => {
  // The middle of the bottom course is gone; the brick above still has both
  // its shoulders, so it stays, and that is what makes a hole a triangle.
  const grid = parseGrid(['###', '#.#']);
  assert.equal(instorten(grid).length, 0);
  assert.equal(steenCount(grid), 5);
});

test('take all three shoulders away and the course above comes down', () => {
  const grid = parseGrid(['#####', '.....']);
  const golven = instorten(grid);
  assert.equal(steenCount(grid), 0);
  assert.equal(golven.length, 1, 'one course, so one wave');
});

test('a hole closes up into a triangle as it rises', () => {
  // Five out of the bottom course, with brick still standing at both ends.
  const grid = parseGrid([
    '#########',
    '#########',
    '#########',
    '##.....##',
  ]);
  const golven = instorten(grid);
  // Three go, then one, then the hole has run out of width.
  assert.deepEqual(golven.map((g) => g.length), [3, 1]);
  assert.equal(steenCount(grid), 31 - 4);
});

test('take the whole bottom course and there is nothing left holding on', () => {
  const grid = parseGrid([
    '#######',
    '#######',
    '#######',
    '.......',
  ]);
  const golven = instorten(grid);
  assert.equal(steenCount(grid), 0, 'the lot comes down');
  assert.deepEqual(golven.map((g) => g.length), [7, 7, 7], 'course by course');
});

test('a gasleiding is an umbrella: what rests on it never falls by itself', () => {
  const grid = parseGrid([
    '###',
    '#L#',
    '...',
  ]);
  instorten(grid);
  // The pipe stays, and so does the brick sitting on it and its neighbours.
  assert.equal(at(grid, 1, 1), CELL.LEIDING);
  assert.equal(steenCount(grid), 3, 'the whole top course is held by the pipe');
});

test('a swing that would touch a gasleiding is refused and changes nothing', () => {
  const grid = parseGrid(['###', '#L#', '###']);
  const before = steenCount(grid);
  assert.equal(swing(grid, voorhamer, 1, 1), null);
  assert.equal(steenCount(grid), before);
  assert.ok(!isLegal(grid, voorhamer, 1, 1));
  assert.ok(isLegal(grid, beitel, 0, 0));
});

test('a swing reports what it hit and what then came down', () => {
  const grid = parseGrid(['#####', '#####']);
  const klap = swing(grid, voorhamer, 2, 1)!;
  assert.ok(klap.geraakt.length > 0);
  assert.equal(steenCount(grid), 10 - klap.geraakt.length - klap.gevallen.flat().length);
});

test('the footprint clips at the edge instead of wrapping', () => {
  const grid = parseGrid(['###', '###', '###']);
  assert.equal(footprint(grid, voorhamer, 0, 0).length, 4);
  assert.equal(footprint(grid, voorhamer, 1, 1).length, 9);
  assert.deepEqual(TOOLS.map((t) => t.offsets.length), [1, 3, 9]);
});

test('isProtected knows what has to survive', () => {
  assert.ok(isProtected(CELL.BALK) && isProtected(CELL.LEIDING) && isProtected(CELL.KABEL));
  assert.ok(!isProtected(CELL.STEEN) && !isProtected(CELL.LEEG));
});

test('onwrikbaar is exactly what can never fall on its own', () => {
  const grid = parseGrid(['###', '#L#', '###']);
  const vast = onwrikbaar(grid);
  // Bottom course: on the ground. Middle course: shoulders on the pipe.
  // Top course: on the pipe, via its shoulders.
  assert.ok(vast.includes(2 * 3 + 0), 'bottom left sits on the ground');
  assert.ok(vast.includes(0 * 3 + 1), 'the brick over the pipe is held for good');
  assert.ok(!vast.includes(1 * 3 + 0), 'the middle course is only held by brick');
});

test('services only ever go into brick, never into a window', () => {
  const surface = SURFACES.find((s) => s.id === 'woonkamer-tuinwand')!;
  const kaal = surfaceToRows(surface);
  const metK = metLeidingen(kaal, { kabel: { rij: 5, van: 0, tot: 14 } });
  for (let y = 0; y < kaal.length; y++) {
    for (let x = 0; x < kaal[0]!.length; x++) {
      if (kaal[y]![x] !== '#') {
        assert.equal(metK[y]![x], kaal[y]![x], `${x},${y} was not brick and was changed`);
      }
    }
  }
});

test('an opening lands where the scan says it does', () => {
  const surface = SURFACES.find((s) => s.id === 'tvkamer-kopgevel')!;
  const { cols, rows } = gridSize(surface);
  const extent = openingCells(surface, surface.openings[0]!)!;
  assert.ok(extent.c0 >= 0 && extent.c1 < cols);
  assert.ok(extent.r0 >= 0 && extent.r1 < rows);
});

test('every shipped wall is standing still when you walk in', () => {
  for (const level of SLOOP_LEVELS) {
    const grid = gridFor(level);
    assert.equal(instorten(grid).length, 0, `${level.id} falls over on its own`);
  }
});

test('every shipped wall can actually be brought down, and par does it', () => {
  for (const level of SLOOP_LEVELS) {
    const grid = gridFor(level);
    const { par, moves } = solve(cloneGrid(grid));
    assert.equal(moves.length, par, `${level.id} par does not match its line`);
    for (const m of moves) {
      assert.ok(swing(grid, m.tool, m.x, m.y), `${level.id} plays an illegal swing`);
    }
    assert.ok(isSolved(grid), `${level.id} is not clear after par swings`);
  }
});

test('the wall does most of the work', () => {
  for (const level of SLOOP_LEVELS) {
    const grid = gridFor(level);
    const par = solve(cloneGrid(grid)).par;
    // A sledge takes nine bricks at the absolute most and usually far fewer,
    // so anything near nine a swing means the collapse is carrying the level.
    assert.ok(steenCount(grid) / par >= 4,
      `${level.id}: ${(steenCount(grid) / par).toFixed(1)} bricks a swing is just hammering`);
  }
});

test('the stage gets harder as it goes', () => {
  const pars = SLOOP_LEVELS.map((l) => solve(gridFor(l)).par);
  for (let i = 1; i < pars.length; i++) {
    assert.ok(pars[i]! >= pars[i - 1]!, `level ${i} (par ${pars[i]}) is easier than the one before`);
  }
});

test('whacking the biggest hole every time is not good enough', () => {
  // The whole complaint about the old stage was that there was nothing to
  // work out. If greed ever reaches par again, that is a regression.
  for (const level of SLOOP_LEVELS) {
    const start = gridFor(level);
    const par = solve(cloneGrid(start)).par;
    const g = cloneGrid(start);
    let n = 0;
    while (steenCount(g) > 0 && n < 60) {
      let beste = -1;
      let keus: { tool: (typeof TOOLS)[number]; x: number; y: number } | null = null;
      for (const tool of TOOLS) {
        for (let y = 0; y < g.height; y++) {
          for (let x = 0; x < g.width; x++) {
            if (!isLegal(g, tool, x, y)) continue;
            const probe = cloneGrid(g);
            const voor = steenCount(probe);
            if (!swing(probe, tool, x, y)) continue;
            const won = voor - steenCount(probe);
            if (won > beste) { beste = won; keus = { tool, x, y }; }
          }
        }
      }
      if (!keus) break;
      swing(g, keus.tool, keus.x, keus.y);
      n++;
    }
    assert.ok(n > par, `${level.id}: greed reaches par (${n} vs ${par})`);
  }
});

test('stars reward getting near par', () => {
  assert.equal(stars(5, 5), 3);
  assert.equal(stars(7, 5), 2);
  assert.equal(stars(8, 5), 1);
});

test('cloneGrid does not share cells', () => {
  const grid = parseGrid(['##', '##']);
  const copy = cloneGrid(grid);
  swing(copy, voorhamer, 0, 1);
  assert.equal(steenCount(grid), 4);
  assert.equal(steenCount(copy), 0);
});
