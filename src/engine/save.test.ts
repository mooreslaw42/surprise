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
