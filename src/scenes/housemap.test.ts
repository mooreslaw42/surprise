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
