import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Save, type Storage } from './save.ts';

function fake(initial?: string): Storage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() { return this.value; },
    setItem(_k: string, v: string) { this.value = v; },
  };
}

test('records and reloads progress', () => {
  const storage = fake();
  const save = new Save(storage);
  save.record('sloop-1', 9, 2);
  assert.deepEqual(new Save(storage).get('sloop-1'), { swings: 9, stars: 2 });
});

test('keeps the best result when replaying', () => {
  const save = new Save(fake());
  save.record('sloop-1', 12, 1);
  save.record('sloop-1', 8, 3);
  assert.deepEqual(save.get('sloop-1'), { swings: 8, stars: 3 });
  save.record('sloop-1', 20, 1);
  assert.deepEqual(save.get('sloop-1'), { swings: 8, stars: 3 }, 'a worse run must not undo a good one');
});

test('a corrupt or foreign save is discarded, not thrown', () => {
  for (const junk of ['not json', '{}', '[]', '{"version":99,"levels":{}}', 'null']) {
    const save = new Save(fake(junk));
    assert.equal(save.totalStars(), 0);
    assert.doesNotThrow(() => save.record('x', 1, 3));
  }
});

test('works with no storage at all', () => {
  const save = new Save(null);
  save.record('sloop-1', 5, 3);
  assert.equal(save.get('sloop-1')?.stars, 3);
});

test('survives storage that throws on write', () => {
  const storage: Storage = {
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
  };
  const save = new Save(storage);
  assert.doesNotThrow(() => save.record('sloop-1', 5, 3));
  assert.equal(save.get('sloop-1')?.stars, 3, 'in-memory progress should still work');
});

test('counts stars and resets', () => {
  const save = new Save(fake());
  save.record('a', 1, 3);
  save.record('b', 1, 2);
  assert.equal(save.totalStars(), 5);
  save.reset();
  assert.equal(save.totalStars(), 0);
});

test('a version 1 save loads as a version 2 save with nothing extra in it', () => {
  const save = new Save(fake('{"version":1,"levels":{"sloop-1":{"swings":9,"stars":2}}}'));
  assert.deepEqual(save.get('sloop-1'), { swings: 9, stars: 2 });
  assert.equal(save.vlag('praatje-sloop'), false);
});

test('flags are set once and survive a reload', () => {
  const storage = fake();
  const save = new Save(storage);
  save.zetVlag('pech-sloop');
  assert.ok(new Save(storage).vlag('pech-sloop'));
  assert.equal(new Save(storage).vlag('pech-elektra'), false);
});

test('a skipped level opens the gate, earns nothing, and gives way to a real result', () => {
  const save = new Save(fake());
  save.slaOver('sloop-1');
  assert.ok(save.isDone('sloop-1'));
  assert.equal(save.totalStars(), 0);
  save.record('sloop-1', 14, 2);
  assert.deepEqual(save.get('sloop-1'), { swings: 14, stars: 2 }, 'the skip must not count as a best of zero');
  save.slaOver('sloop-1');
  assert.equal(save.get('sloop-1')?.stars, 2, 'and skipping can never undo a result');
});

test('cable routes are kept with the level and outlive a replay', () => {
  const storage = fake();
  const save = new Save(storage);
  save.record('elektra-x', 20, 2);
  save.bewaarDraden('elektra-x', [[1, 2, 3], [7, 8]]);
  save.record('elektra-x', 18, 3);
  assert.deepEqual(new Save(storage).get('elektra-x'), { swings: 18, stars: 3, draden: [[1, 2, 3], [7, 8]] });
});

test('the counter moves on a result and not on a skip', () => {
  const save = new Save(fake());
  save.slaOver('a');
  assert.equal(save.teller, 0);
  save.record('a', 1, 1);
  assert.equal(save.teller, 1);
});
