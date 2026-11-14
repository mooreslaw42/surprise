import { register, type Tekst } from '../data/tekstregister.ts';
import { kentTeken } from '../engine/font.ts';
import { C, PALETTE } from '../engine/palette.ts';
import { PixelBuffer } from '../engine/pixelbuffer.ts';
import type { SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';
import { Dialogue, wrap } from '../scenes/dialogue.ts';
import { SPREKER_NAAM } from '../scenes/portretten.ts';

/**
 * The script, as one page: everything anybody says in the game and every
 * explanation of a puzzle, in the order it is met, each beside a picture of
 * how it will look on screen.
 *
 * Nothing here is part of the game. It is opened at /teksten.html while the
 * dev server runs, it reads the wording out of the code through the
 * register, and Save sends what was changed to the dev server, which writes
 * it to data/teksten.eigen.ts for the game to pick up.
 */

const SCHERM_W = 384;
const SCHERM_H = 216;

type Staat = { eigen: Record<string, string[]>; nagekeken: Set<string> };

const teksten = register();
// Read before anything is laid over it: this is the wording in the code.
const origineel = new Map(teksten.map((t) => [t.sleutel, t.lees()]));
const staat: Staat = { eigen: {}, nagekeken: new Set() };
let bewaard = '';
let filter = 'alles';
let zoek = '';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

function waarde(t: Tekst): string[] {
  return staat.eigen[t.sleutel] ?? origineel.get(t.sleutel)!;
}

function gewijzigd(t: Tekst): boolean {
  return staat.eigen[t.sleutel] !== undefined;
}

/** What is wrong with a text, as sentences. Empty means it will display. */
function problemen(t: Tekst, regels: readonly string[]): string[] {
  const uit: string[] = [];
  const vreemd = new Set<string>();
  for (const regel of regels) for (const ch of regel) if (!kentTeken(ch)) vreemd.add(ch);
  if (vreemd.size > 0) uit.push(`The pixel font has no ${[...vreemd].map((c) => `"${c}"`).join(' ')} - it would show as "?".`);
  if (t.max !== undefined && t.soort !== 'alineas') {
    regels.forEach((regel, i) => {
      if (regel.length > t.max!) {
        uit.push(`${t.soort === 'regel' ? 'This line' : `Line ${i + 1}`} is ${regel.length} characters; ${t.max} fit.`);
      }
    });
  }
  if (t.soort === 'alineas') {
    if (regels.length === 0) uit.push('Empty: the box would open with nothing in it.');
    const hoogte = new Dialogue(regels).height;
    if (hoogte > SCHERM_H - 8) uit.push('Too long: the box is taller than the screen. Split it or cut it.');
  }
  if (t.soort === 'regel' && (regels[0] ?? '').length === 0) uit.push('Empty.');
  return uit;
}

function alsTekst(t: Tekst, regels: readonly string[]): string {
  return regels.join(t.soort === 'alineas' ? '\n\n' : '\n');
}

function uitTekst(t: Tekst, ruw: string): string[] {
  const schoon = ruw.toUpperCase().replace(/\r/g, '');
  if (t.soort === 'regel') return [schoon.replace(/\n/g, ' ').trim()];
  if (t.soort === 'regels') {
    const regels = schoon.split('\n').map((r) => r.trimEnd());
    while (regels.length > 0 && regels[regels.length - 1] === '') regels.pop();
    return regels;
  }
  return schoon.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => p.length > 0);
}

/** A canvas showing the text the way the game will draw it. */
function proef(t: Tekst, regels: readonly string[]): HTMLCanvasElement {
  const buffer = new PixelBuffer(SCHERM_W, SCHERM_H);
  buffer.clear(C.ZWART);
  let x = 0;
  let y = 0;
  let w = SCHERM_W;
  let h = 14;

  if (t.soort === 'alineas') {
    const dialoog = new Dialogue(regels.length > 0 ? regels : [''], SPREKER_NAAM[t.wie ?? 'pim']);
    // Typed out in full: one very long frame with nothing pressed.
    const stil = { input: { confirmed: () => false, mouseClicked: false } } as unknown as SceneContext;
    dialoog.update(999, stil);
    dialoog.render(buffer as unknown as Screen, 0.3);
    h = Math.min(SCHERM_H, dialoog.height);
    w = 336;
    x = Math.round((SCHERM_W - w) / 2);
    y = Math.max(0, Math.round((SCHERM_H - dialoog.height) / 2));
  } else if (t.soort === 'regels') {
    h = Math.min(SCHERM_H, regels.length * 12 + 8);
    regels.slice(0, 17).forEach((regel, i) => buffer.textCentered(regel, SCHERM_W / 2, 4 + i * 12, C.KALK));
  } else {
    // The bar it sits in, with the room the key hint on the right takes.
    buffer.fillRect(0, 0, SCHERM_W, 14, C.ZWART);
    buffer.text(regels[0] ?? '', 6, 4, C.ASGRIJS);
    if (t.max !== undefined) buffer.fillRect(6 + t.max * 6, 0, 1, 14, C.ROESTROOD);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * (t.soort === 'alineas' ? 1.25 : 1.25)}px`;
  const ctx = canvas.getContext('2d')!;
  const beeld = ctx.createImageData(w, h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const hex = PALETTE[buffer.get(x + px, y + py)]!;
      const o = (py * w + px) * 4;
      beeld.data[o] = parseInt(hex.slice(1, 3), 16);
      beeld.data[o + 1] = parseInt(hex.slice(3, 5), 16);
      beeld.data[o + 2] = parseInt(hex.slice(5, 7), 16);
      beeld.data[o + 3] = 255;
    }
  }
  ctx.putImageData(beeld, 0, 0);
  return canvas;
}

function vuil(): boolean {
  return momentopname() !== bewaard;
}

function momentopname(): string {
  return JSON.stringify({ eigen: staat.eigen, nagekeken: [...staat.nagekeken].sort() });
}

function werkKopBij(): void {
  const alle = teksten.length;
  const klaar = teksten.filter((t) => staat.nagekeken.has(t.sleutel)).length;
  const anders = teksten.filter(gewijzigd).length;
  const mis = teksten.filter((t) => problemen(t, waarde(t)).length > 0).length;
  $('tel').textContent = `${alle} texts · ${klaar} reviewed · ${anders} changed${mis > 0 ? ` · ${mis} with problems` : ''}`;
  $<HTMLButtonElement>('bewaar').disabled = !vuil();
  if (vuil()) zegStatus('Unsaved changes');
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('nav a'))) {
    const groep = a.dataset.groep!;
    const inGroep = teksten.filter((t) => t.groep === groep);
    const af = inGroep.filter((t) => staat.nagekeken.has(t.sleutel)).length;
    a.querySelector('span')!.textContent = `${af}/${inGroep.length}`;
    a.classList.toggle('klaar', af === inGroep.length);
  }
}

function zegStatus(tekst: string, fout = false): void {
  const el = $('status');
  el.textContent = tekst;
  el.classList.toggle('fout', fout);
}

function zichtbaar(t: Tekst): boolean {
  if (filter === 'open' && staat.nagekeken.has(t.sleutel)) return false;
  if (filter === 'gewijzigd' && !gewijzigd(t)) return false;
  if (filter === 'mis' && problemen(t, waarde(t)).length === 0) return false;
  if (zoek) {
    const hooi = `${t.groep} ${t.kop} ${waarde(t).join(' ')} ${t.wie ?? ''}`.toUpperCase();
    if (!hooi.includes(zoek)) return false;
  }
  return true;
}

function kaart(t: Tekst): HTMLElement {
  const el = document.createElement('div');
  el.className = 'kaart';

  const kop = document.createElement('div');
  kop.className = 'kop';
  if (t.soort === 'alineas') {
    const wie = document.createElement('span');
    wie.className = `wie ${t.wie ?? 'pim'}`;
    wie.textContent = SPREKER_NAAM[t.wie ?? 'pim'];
    kop.append(wie);
  }
  const naam = document.createElement('span');
  naam.textContent = t.kop;
  const ruimte = document.createElement('span');
  ruimte.className = 'ruimte';
  const terug = document.createElement('button');
  terug.className = 'klein';
  terug.textContent = 'Back to original';
  const vink = document.createElement('label');
  const vakje = document.createElement('input');
  vakje.type = 'checkbox';
  vink.append(vakje, 'Reviewed');
  kop.append(naam, ruimte, terug, vink);

  const links = document.createElement('div');
  const veld: HTMLTextAreaElement | HTMLInputElement = t.soort === 'regel'
    ? Object.assign(document.createElement('input'), { className: 'regel', type: 'text' })
    : document.createElement('textarea');
  veld.spellcheck = false;
  const hulp = document.createElement('div');
  hulp.className = 'hulp';
  const waarschuwing = document.createElement('div');
  waarschuwing.className = 'waarschuwing';
  links.append(veld, hulp, waarschuwing);

  const rechts = document.createElement('div');
  rechts.className = 'proef';

  const ververs = (): void => {
    const regels = waarde(t);
    const mis = problemen(t, regels);
    el.classList.toggle('gewijzigd', gewijzigd(t));
    el.classList.toggle('nagekeken', staat.nagekeken.has(t.sleutel));
    el.classList.toggle('mis', mis.length > 0);
    terug.style.visibility = gewijzigd(t) ? 'visible' : 'hidden';
    vakje.checked = staat.nagekeken.has(t.sleutel);
    waarschuwing.textContent = mis.join(' ');
    if (t.soort === 'alineas') {
      const regelsOpScherm = regels.reduce((n, p) => n + wrap(p, 44).length, 0) + Math.max(0, regels.length - 1);
      hulp.textContent = `Blank line = new paragraph. ${regels.length} paragraph${regels.length === 1 ? '' : 's'}, ${regelsOpScherm} lines on screen.`;
    } else if (t.soort === 'regels') {
      hulp.textContent = `One line per line, blank lines kept. ${regels.length} lines${t.max ? `, ${t.max} characters each at most` : ''}.`;
    } else {
      hulp.textContent = `${(regels[0] ?? '').length} of ${t.max ?? '-'} characters. The red mark is where the line has to stop.`;
    }
    rechts.replaceChildren(proef(t, regels));
    werkKopBij();
  };

  veld.value = alsTekst(t, waarde(t));
  if (veld instanceof HTMLTextAreaElement) {
    veld.rows = Math.min(16, Math.max(3, veld.value.split('\n').length + Math.ceil(veld.value.length / 60)));
  }
  veld.addEventListener('input', () => {
    const nieuw = uitTekst(t, veld.value);
    const zelfde = JSON.stringify(nieuw) === JSON.stringify(origineel.get(t.sleutel));
    if (zelfde) delete staat.eigen[t.sleutel];
    else staat.eigen[t.sleutel] = nieuw;
    // Changing it un-reviews it: it was the old wording that was signed off.
    staat.nagekeken.delete(t.sleutel);
    ververs();
  });
  terug.addEventListener('click', () => {
    delete staat.eigen[t.sleutel];
    veld.value = alsTekst(t, waarde(t));
    ververs();
  });
  vakje.addEventListener('change', () => {
    if (vakje.checked) staat.nagekeken.add(t.sleutel);
    else staat.nagekeken.delete(t.sleutel);
    ververs();
  });

  el.append(kop, links, rechts);
  ververs();
  return el;
}

function anker(groep: string): string {
  return `g-${groep.replace(/[^A-Z0-9]+/g, '-').toLowerCase()}`;
}

function teken(): void {
  const main = $('main');
  const nav = $('nav');
  main.replaceChildren();
  nav.replaceChildren();
  const groepen = [...new Set(teksten.map((t) => t.groep))];
  let getoond = 0;

  for (const groep of groepen) {
    const a = document.createElement('a');
    a.href = `#${anker(groep)}`;
    a.dataset.groep = groep;
    a.append(groep, document.createElement('span'));
    nav.append(a);

    const tonen = teksten.filter((t) => t.groep === groep && zichtbaar(t));
    if (tonen.length === 0) continue;
    const sectie = document.createElement('section');
    sectie.id = anker(groep);
    const h2 = document.createElement('h2');
    h2.textContent = groep;
    sectie.append(h2, ...tonen.map(kaart));
    main.append(sectie);
    getoond += tonen.length;
  }
  if (getoond === 0) {
    const leeg = document.createElement('p');
    leeg.className = 'leeg';
    leeg.textContent = 'Nothing matches this filter.';
    main.append(leeg);
  }
  werkKopBij();
}

async function bewaar(): Promise<void> {
  zegStatus('Saving...');
  try {
    const antwoord = await fetch('/__teksten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: momentopname(),
    });
    if (!antwoord.ok) throw new Error(`server said ${antwoord.status}`);
    bewaard = momentopname();
    werkKopBij();
    zegStatus('Saved to the project');
  } catch (fout) {
    zegStatus(`Not saved: ${String(fout)}`, true);
  }
}

async function begin(): Promise<void> {
  try {
    const data = await (await fetch('/__teksten')).json() as { eigen: Record<string, string[]>; nagekeken: string[] };
    const bekend = new Set(teksten.map((t) => t.sleutel));
    for (const [sleutel, regels] of Object.entries(data.eigen)) {
      // Wording that matches the code again is not an override any more.
      if (bekend.has(sleutel) && JSON.stringify(regels) !== JSON.stringify(origineel.get(sleutel))) {
        staat.eigen[sleutel] = regels;
      }
    }
    for (const sleutel of data.nagekeken) if (bekend.has(sleutel)) staat.nagekeken.add(sleutel);
    zegStatus('');
  } catch {
    zegStatus('Dev server not reachable: changes cannot be saved', true);
  }
  bewaard = momentopname();
  teken();
}

for (const knop of Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-filter]'))) {
  knop.addEventListener('click', () => {
    filter = knop.dataset.filter!;
    for (const k of Array.from(document.querySelectorAll('button[data-filter]'))) k.classList.toggle('aan', k === knop);
    teken();
  });
}
$<HTMLInputElement>('zoek').addEventListener('input', (e) => {
  zoek = (e.target as HTMLInputElement).value.trim().toUpperCase();
  teken();
});
$('bewaar').addEventListener('click', () => { void bewaar(); });
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (vuil()) void bewaar();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (vuil()) e.preventDefault();
});

void begin();
