import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alleTonen, boeken, hertz, lied, partij, stapDuur, stappenVan, toon, zelfdeKeuze,
} from './muziek.ts';
import { AFTITELING_MUZIEK as AFTITELING, BAAS, LIEDJES, MENU, OPENING, thema } from '../data/liedjes.ts';
import { ANGIE, BROWN_SUGAR, MISS_YOU, START_ME_UP } from '../data/stones.ts';
import { Save } from './save.ts';
import { TitleScene } from '../scenes/title.ts';
import { IntroScene } from '../scenes/intro.ts';
import { HouseMapScene } from '../scenes/housemap.ts';
import { STAGES } from '../data/stages.ts';

test('note names land on the right pitch', () => {
  assert.equal(toon('c4'), 60, 'middle C');
  assert.equal(toon('a4'), 69);
  assert.equal(toon('c#4'), 61);
  assert.equal(toon('db4'), 61, 'a flat is the sharp below it');
  assert.equal(toon('bb3'), 58);
  assert.equal(toon('C4'), 60, 'case should not matter');
  assert.equal(toon('c5') - toon('c4'), 12);
});

test('concert pitch, and an octave is a doubling', () => {
  assert.equal(hertz(69), 440);
  assert.ok(Math.abs(hertz(81) - 880) < 1e-9);
  assert.ok(Math.abs(hertz(57) - 220) < 1e-9);
});

test('a token that is not a note is named, not ignored', () => {
  // A typo that parsed as silence would be a hole in the music nobody heard
  // until December.
  assert.throws(() => toon('h4'), /not a note/);
  assert.throws(() => toon('c'), /not a note/);
  assert.throws(() => partij({ stem: 'puls', noten: 'c4 wat c4 c4' }, 4), /wat/);
  assert.doesNotThrow(() => partij({ stem: 'puls', noten: 'c4 c4 c4 c4' }, 4));
});

test('bar lines are for the eye and the shorthand is for the hand', () => {
  assert.deepEqual(stappenVan('c4 | d4'), ['c4', 'd4'], 'bar lines drop out');
  assert.deepEqual(stappenVan('  c4\n   d4  '), ['c4', 'd4'], 'any whitespace will do');
  assert.deepEqual(stappenVan('c4*3'), ['c4', '-', '-'], 'a star is the note and then holds');
  assert.deepEqual(stappenVan('.*2 e4'), ['.', '-', 'e4']);
  assert.deepEqual(stappenVan('c4*1'), ['c4']);
  assert.throws(() => stappenVan('c4*0'), /at least one step/);
});

test('a hold lengthens the note instead of striking it again', () => {
  const p = partij({ stem: 'puls', noten: 'c4 - - - e4 - . -' }, 4);
  assert.equal(p.stappen, 8);
  assert.equal(p.perStap[0]!.length, 1);
  assert.equal(p.perStap[0]![0]!.lengte, 4, 'four steps of one note, not four notes');
  assert.deepEqual(p.perStap.slice(1, 4).map((s) => s.length), [0, 0, 0], 'nothing is struck on a hold');
  assert.equal(p.perStap[4]![0]!.lengte, 2);
  assert.equal(p.perStap[6]!.length, 0, 'a rest strikes nothing');
});

test('a rest stops a note carrying on', () => {
  const p = partij({ stem: 'puls', noten: 'c4 . - -' }, 4);
  assert.equal(p.perStap[0]![0]!.lengte, 1, 'the rest ended it; the holds had nothing left to hold');
});

test('a hold with nothing before it is a rest, not a crash', () => {
  // It reads as a tie the writer meant to carry over a bar line, which is a
  // mistake worth surviving.
  const p = partij({ stem: 'puls', noten: '- - c4 -' }, 4);
  assert.equal(p.perStap[2]![0]!.lengte, 2);
});

test('chords strike together and an accent is per note', () => {
  const p = partij({ stem: 'driehoek', noten: 'c4+e4+g4 - - -' }, 4);
  assert.deepEqual(p.perStap[0]!.map((n) => n.toon), [60, 64, 67]);
  for (const noot of p.perStap[0]!) {
    assert.equal(noot.lengte, 4, 'a hold lengthens the whole chord, not its last note');
  }

  const d = partij({ stem: 'slagwerk', noten: 'k!+h . . .' }, 4);
  assert.equal(d.perStap[0]![0]!.accent, true);
  assert.equal(d.perStap[0]![1]!.accent, false);
  assert.throws(() => partij({ stem: 'puls', noten: '! . . .' }, 4), /bare accent/);
});

test('drums and pitches do not get into each others tracks', () => {
  const d = partij({ stem: 'slagwerk', noten: 'k s h o' }, 4);
  assert.deepEqual(d.perStap.map((s) => s[0]!.slag), ['kick', 'snare', 'hat', 'open']);
  for (const stap of d.perStap) assert.equal(stap[0]!.toon, -1);

  assert.throws(() => partij({ stem: 'slagwerk', noten: 'c4 . . .' }, 4), /not a drum/);
  assert.throws(() => partij({ stem: 'puls', noten: 'k . . .' }, 4), /is a drum/);
});

test('a track that is not a whole number of bars is refused', () => {
  // Tracks loop independently, so one odd step would slide a little further
  // out of time on every pass.
  assert.throws(() => partij({ stem: 'puls', noten: 'c4 c4 c4' }, 4), /0\.75 bars/);
  assert.throws(() => partij({ stem: 'puls', noten: '' }, 4), /empty track/);
  assert.doesNotThrow(() => partij({ stem: 'puls', noten: 'c4*8' }, 4));
});

test('a sixteenth at 120 is an eighth of a second', () => {
  assert.equal(stapDuur(120, 16), 0.125);
  assert.equal(stapDuur(60, 16), 0.25);
  // Twelve steps to the bar is how a blues shuffles: two steps then one.
  assert.ok(Math.abs(stapDuur(150, 12) - 0.13333) < 1e-4);
});

test('a song has to have something on it', () => {
  assert.throws(() => lied({ id: 'x', naam: 'X', naar: 'X', bpm: 100, sporen: [] }), /needs a track/);
});

test('steps are booked ahead of the clock, never on it', () => {
  const b = boeken(0, 1.0, 1.0, 0.1, 0.25);
  assert.deepEqual(b.stappen.map((s) => s.stap), [0, 1, 2]);
  assert.ok(Math.abs(b.volgende - 1.3) < 1e-9);
  assert.equal(b.stap, 3);

  // Called again with nothing new due, it books nothing and stays put.
  const stil = boeken(b.stap, b.volgende, 1.0, 0.1, 0.25);
  assert.deepEqual(stil.stappen, []);
  assert.equal(stil.volgende, b.volgende);
  assert.equal(stil.stap, b.stap);
});

test('a minute in a background tab is skipped, not played back at speed', () => {
  // requestAnimationFrame stops in a hidden tab and the audio clock does not,
  // so coming back means the clock is a long way ahead. Catching up step by
  // step would fire four hundred notes at once.
  const b = boeken(100, 1.0, 61.0, 0.1, 0.25);
  assert.ok(b.stappen.length <= 3, `booked ${b.stappen.length} steps for one frame`);
  assert.equal(b.stappen[0]!.stap, 100, 'the song carries on where it was');
  assert.ok(b.stappen[0]!.t >= 61.0, 'and nothing is booked in the past');
});

test('asking for the music already playing is free', () => {
  // Scenes name their music every frame, so this is what stops the riff
  // restarting sixty times a second.
  assert.ok(zelfdeKeuze(MENU, { lied: BROWN_SUGAR }));
  assert.ok(zelfdeKeuze(thema('leeghalen'), thema('elektra')), 'same song');
  assert.ok(!zelfdeKeuze(thema('leeghalen'), thema('sloop')), 'a different song');
  assert.ok(!zelfdeKeuze(MENU, { lied: BROWN_SUGAR, tempo: 0.9 }), 'slowed down is a different request');
  assert.ok(!zelfdeKeuze(MENU, BAAS));
  assert.ok(zelfdeKeuze(null, null));
  assert.ok(!zelfdeKeuze(MENU, null));
});

test('the songbook is seven distinct songs, all of them playable', () => {
  assert.equal(LIEDJES.length, 7);
  assert.equal(new Set(LIEDJES.map((l) => l.id)).size, 7);
  for (const l of LIEDJES) {
    assert.ok(l.naar.length > 0, `${l.id} should credit the record it is after`);
    assert.ok(l.bpm >= 40 && l.bpm <= 220, `${l.id} at ${l.bpm}bpm`);
    assert.equal(l.stappenPerMaat, 16);
    for (const p of l.partijen) {
      assert.equal(p.stappen / l.stappenPerMaat, 4, `${l.id} ${p.stem} is a four-bar loop`);
      assert.ok(p.volume > 0 && p.volume <= 1, `${l.id} ${p.stem} volume ${p.volume}`);
      assert.ok(p.perStap.some((s) => s.length > 0), `${l.id} ${p.stem} plays something`);
    }
    assert.ok(l.partijen.some((p) => p.stem === 'bas'), `${l.id} has a bass`);
    assert.ok(l.partijen.some((p) => p.stem === 'puls'), `${l.id} has a lead`);
  }
});

test('every note stays in a register a square can play', () => {
  const keuzes = [OPENING, MENU, BAAS, AFTITELING, ...STAGES.map((s) => thema(s.kind))];
  for (const keuze of keuzes) {
    const schuif = keuze.halveTonen ?? 0;
    const tonen = alleTonen(keuze.lied).map((t) => t + schuif);
    assert.ok(Math.min(...tonen) >= 24, `${keuze.lied.id} drops to ${Math.min(...tonen)}`);
    assert.ok(Math.max(...tonen) <= 96, `${keuze.lied.id} climbs to ${Math.max(...tonen)}`);
  }
});

test('every stage has something to play, and the bosses play Miss You', () => {
  for (const stage of STAGES) {
    assert.ok(LIEDJES.includes(thema(stage.kind).lied), `${stage.naam} points at a song not in the book`);
  }
  for (const k of [MENU, BAAS, OPENING, AFTITELING]) assert.ok(LIEDJES.includes(k.lied));
  assert.equal(BAAS.lied, MISS_YOU);
  assert.equal(AFTITELING.lied, ANGIE);
});

test('the game opens on Start Me Up', () => {
  // Once something has been played. Before that the title is silent: see below.
  const gehoord = new Save(null);
  gehoord.record('leeghalen-woonkamer', 20, 3);
  assert.equal(new TitleScene(gehoord).muziek?.lied, START_ME_UP);
});

test('Angie is the quiet one: no drums in it', () => {
  assert.ok(!ANGIE.partijen.some((p) => p.stem === 'slagwerk'));
  for (const l of LIEDJES.filter((l) => l !== ANGIE)) {
    assert.ok(l.partijen.some((p) => p.stem === 'slagwerk'), `${l.id} needs a kit`);
  }
});

test('a first visit is quiet until the poem is over', () => {
  // No save: the title and the poem play nothing, and the house map after
  // them is where the music starts.
  const nieuw = new Save(null);
  assert.equal(new TitleScene(nieuw).muziek, null);
  assert.equal(new IntroScene(nieuw, () => new HouseMapScene(nieuw)).muziek, null);
  assert.equal(new HouseMapScene(nieuw).muziek, MENU);
  // Having heard the poem is not progress: come back with nothing played and
  // it is quiet again.
  nieuw.zetVlag('intro');
  assert.equal(new TitleScene(nieuw).muziek, null);
});
