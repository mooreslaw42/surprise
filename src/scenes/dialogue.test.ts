import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Dialogue, wrap } from './dialogue.ts';
import { HEIGHT } from '../engine/screen.ts';

test('wrap breaks on words and never exceeds the width', () => {
  const lines = wrap('ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST', 20);
  for (const line of lines) assert.ok(line.length <= 20, `"${line}" is ${line.length} long`);
  assert.equal(lines.join(' '), 'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST');
});

test('wrap keeps a word longer than the line rather than losing it', () => {
  const lines = wrap('KORT SUPERLANGWOORDDATNIETPAST KORT', 10);
  assert.ok(lines.some((l) => l.includes('SUPERLANGWOORDDATNIETPAST')));
});

test('the panel grows to fit what is said, and still fits the screen', () => {
  const short = new Dialogue(['KORT.']);
  const long = new Dialogue([
    'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST. SLEEP HEM ERHEEN.',
    'HET GETAL EROP IS WAT HIJ TREKT, IN AMPERE. EEN GROEP HOUDT ER 16. SAMEN MEER? DAN MOETEN ZE OVER TWEE GROEPEN.',
    'DRADEN MOGEN NAAST ELKAAR LOPEN, MAAR NOOIT OVER ELKAAR HEEN.',
  ]);
  assert.ok(long.height > short.height, 'more words should mean a taller box');
  assert.ok(long.height <= HEIGHT, `panel is ${long.height} tall, screen is ${HEIGHT}`);
});

test('verse is shown line for line: not wrapped, not spaced apart', async () => {
  const { strofen } = await import('../data/intro.ts');
  assert.deepEqual(strofen(['A', 'B', '', '', 'C', '']), [['A', 'B'], ['C']]);
  const proza = new Dialogue(['EEN', 'TWEE']);
  const vers = new Dialogue(['EEN', 'TWEE'], 'PIM', true);
  assert.ok(vers.height <= proza.height, 'two lines of verse must not take more room than two paragraphs');
});

test('every line of the opening gedicht fits beside the portrait', async () => {
  const { INTRO, strofen } = await import('../data/intro.ts');
  for (const regel of INTRO) assert.ok(regel.length <= 44, `"${regel}" is ${regel.length} characters`);
  assert.ok(strofen(INTRO).length >= 1);
});
