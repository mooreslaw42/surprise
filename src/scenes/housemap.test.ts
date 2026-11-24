import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../data/stages.ts';

const CARD_W = 112;
const GLYPH = 6;

test('no card summary is wider than a card', () => {
  const fits = Math.floor((CARD_W - 8) / GLYPH);
  for (const stage of STAGES) {
    for (const entry of stage.entries) {
      if (!entry.samenvatting) continue;
      assert.ok(entry.samenvatting.length <= fits,
        `"${entry.samenvatting}" is ${entry.samenvatting.length} chars, ${fits} fit`);
    }
  }
});

test('every stage entry says which room and which wall', () => {
  for (const stage of STAGES) {
    assert.ok(stage.entries.length > 0, `${stage.naam} has no walls`);
    for (const entry of stage.entries) {
      assert.ok(entry.vlak.length > 0, `${entry.id} has no wall name`);
      assert.ok(entry.id.includes(stage.kind), `${entry.id} is not a ${stage.kind} level`);
    }
  }
});

import { blokkade, stageAf, stageLabel, stageOpen, versteFase } from '../data/stages.ts';

/** A save that has finished everything up to, but not including, `tot`. */
function tot(n: number): (id: string) => boolean {
  const klaar = new Set<string>();
  for (let s = 0; s < n; s++) for (const e of STAGES[s]!.entries) klaar.add(e.id);
  return (id) => klaar.has(id);
}

const NIKS = () => false;
const ALLES = () => true;

test('the first stage is open to a brand new save', () => {
  assert.ok(stageOpen(0, NIKS));
  assert.equal(blokkade(0, NIKS), null);
});

test('a stage stays shut until every stage before it is done', () => {
  for (let s = 1; s < STAGES.length; s++) {
    assert.ok(!stageOpen(s, tot(s - 1)), `${STAGES[s]!.naam} opened too early`);
    assert.ok(stageOpen(s, tot(s)), `${STAGES[s]!.naam} stayed shut`);
  }
});

test('one unfinished wall anywhere behind you keeps the rest shut', () => {
  const op_een_na = (id: string) => id !== STAGES[0]!.entries[0]!.id;
  for (let s = 1; s < STAGES.length; s++) {
    assert.ok(!stageOpen(s, op_een_na), `${STAGES[s]!.naam} opened with a wall outstanding`);
  }
});

test('a shut stage can say which one is in the way', () => {
  const blok = blokkade(STAGES.length - 1, tot(2));
  assert.equal(blok, STAGES[2]);
  assert.equal(blokkade(3, ALLES), null);
});

test('coming back drops you at the furthest stage you opened', () => {
  assert.equal(versteFase(NIKS), 0);
  assert.equal(versteFase(tot(4)), 4);
  // Everything done: the last stage, not one past the end.
  assert.equal(versteFase(ALLES), STAGES.length - 1);
});

test('every stage can be looked at, open or not', () => {
  // Browsing is not gated, so every stage must have something to show.
  for (const stage of STAGES) {
    assert.ok(stage.entries.length > 0, `${stage.naam} has nothing to look at`);
    assert.ok(stageLabel(stage).length <= 30, stageLabel(stage));
  }
  assert.ok(stageLabel(STAGES[0]!).startsWith('FASE '));
  const tussen = STAGES.find((s) => s.tussendoor)!;
  assert.ok(!stageLabel(tussen).startsWith('FASE '));
});

test('a finished stage reads as finished', () => {
  assert.ok(stageAf(STAGES[0]!, ALLES));
  assert.ok(!stageAf(STAGES[0]!, NIKS));
});

// ------------------------------------------------------------- Myrthe

import { HouseMapScene } from './housemap.ts';
import { Save } from '../engine/save.ts';
import { NA_FASE, NA_LEVEL } from '../data/praatjes.ts';

/** What the map would say on its next frame, as speakers. */
function wordtGezegd(scene: HouseMapScene): string[] {
  const s = scene as unknown as { praatjes: { naam: string }[]; zoekPraatje(): void };
  s.praatjes = [];
  s.zoekPraatje();
  return s.praatjes.map((p) => p.naam);
}

test('Myrthe has a word after every Sloop wall, the tuinhuis and every kanaalplan', () => {
  for (const stage of STAGES) {
    const wil = stage.kind === 'sloop' || stage.kind === 'tuinhuis' || stage.kind === 'kanalen';
    for (const entry of stage.entries) {
      assert.equal(!!NA_LEVEL[entry.id], wil, `${entry.id}`);
      for (const beat of NA_LEVEL[entry.id] ?? []) assert.equal(beat.wie, 'myrthe');
    }
  }
});

test('back from a wall, Myrthe says her line once, before what the phase has to say', () => {
  const save = new Save(null);
  for (const e of STAGES[0]!.entries) save.record(e.id, 1, 3);
  const map = new HouseMapScene(save);
  wordtGezegd(map); // Leeghalen's own beats, from finishing that phase.

  const sloop = STAGES.find((s) => s.id === 'sloop')!;
  save.record(sloop.entries[0]!.id, 1, 3);
  assert.deepEqual(wordtGezegd(map), ['MYRTHE']);
  assert.deepEqual(wordtGezegd(map), [], 'said once');

  for (const e of sloop.entries) save.record(e.id, 1, 3);
  const na = wordtGezegd(map);
  assert.equal(na[0], 'MYRTHE', 'the last wall first');
  assert.equal(na.length, 1 + NA_FASE.sloop!.length, 'then the phase');
});

test('an old save with several walls done hears one line, not a backlog', () => {
  const save = new Save(null);
  for (const stage of STAGES.slice(0, 2)) for (const e of stage.entries) save.record(e.id, 1, 3);
  const zinnen = wordtGezegd(new HouseMapScene(save));
  assert.equal(zinnen.filter((n) => n === 'MYRTHE').length, 1);
});
