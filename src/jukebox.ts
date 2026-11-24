/**
 * /jukebox.html: every song in the book, played the way the game plays it,
 * to judge by ear without playing a level. Development only, like the text
 * editor: the page is not a build input.
 */
import { Audio } from './engine/audio.ts';
import type { Lied, Muziekkeuze } from './engine/muziek.ts';
import { AFTITELING_MUZIEK, BAAS, LIEDJES, MENU, OPENING, thema } from './data/liedjes.ts';
import { STAGES } from './data/stages.ts';

/** Where each song plays, read off the songbook so this page cannot drift from it. */
function waar(lied: Lied): string {
  const plekken: string[] = [];
  if (OPENING.lied === lied) plekken.push('titelscherm');
  if (MENU.lied === lied) plekken.push('huiskaart');
  if (BAAS.lied === lied) plekken.push('eindbazen');
  if (AFTITELING_MUZIEK.lied === lied) plekken.push('aftiteling');
  for (const stage of STAGES) {
    if (stage.baas) continue;
    if (thema(stage.kind).lied === lied && !plekken.includes(stage.naam.toLowerCase())) plekken.push(stage.naam.toLowerCase());
  }
  return plekken.join(', ') || 'nergens';
}

const audio = new Audio();
let keuze: Muziekkeuze | null = null;
const lijst = document.getElementById('lijst')!;
const rijen = new Map<Lied, HTMLElement>();

function teken(): void {
  for (const [lied, rij] of rijen) {
    const speelt = keuze?.lied === lied;
    rij.classList.toggle('speelt', speelt);
    rij.querySelector('.knop')!.textContent = speelt ? '■' : '▶';
  }
}

for (const lied of LIEDJES) {
  const rij = document.createElement('div');
  rij.className = 'lied';
  rij.innerHTML = `<div class="knop">▶</div><div class="tekst"><div class="naam"></div><div class="waar"></div></div><div class="bpm"></div>`;
  rij.querySelector('.naam')!.textContent = lied.naar;
  rij.querySelector('.waar')!.textContent = waar(lied);
  rij.querySelector('.bpm')!.textContent = `${lied.bpm} bpm`;
  rij.addEventListener('click', () => {
    audio.aan();
    keuze = keuze?.lied === lied ? null : { lied };
    teken();
  });
  lijst.appendChild(rij);
  rijen.set(lied, rij);
}

document.getElementById('stop')!.addEventListener('click', () => { keuze = null; teken(); });

// The synth books notes a little ahead each frame, the way the game loop drives it.
const lus = (): void => {
  audio.speel(keuze);
  audio.tik();
  requestAnimationFrame(lus);
};
requestAnimationFrame(lus);
