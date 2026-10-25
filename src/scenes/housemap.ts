import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { STAGES, blokkade, stageAf, stageLabel, stageOpen, versteFase } from '../data/stages.ts';
import { LevelScene } from './level.ts';
import { ElektraScene } from './elektra.ts';
import { SchuifScene } from './schuifwerk.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { KanalenScene } from './kanalen.ts';
import { IsolatieScene } from './isolatie.ts';
import { ISOLATIE_LEVELS } from '../puzzles/isolatie/levels.ts';
import { KlosScene } from './klossen.ts';
import { KLOS_LEVELS } from '../puzzles/klossen/levels.ts';
import { VloerScene } from './vloeren.ts';
import { VLOER_LEVELS } from '../puzzles/vloeren/levels.ts';
import { SchilderScene } from './schilderen.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import { KANAAL_LEVELS } from '../puzzles/kanalen/levels.ts';

const CARD_W = 112;
const CARD_Y = 37;
const GAP = 7;
const PER_ROW = 3;
const FOOTER = 26;
const MAX_CARD_H = 66;

/** The ladder across the top: every stage at once, open or not. */
const STRIP_Y = 21;
const STRIP_H = 12;
const PIP_W = 24;
const PIP_GAP = 3;
const PIJL_W = 11;

const SLOT = [
  '.###.',
  '#...#',
  '#####',
  '##.##',
  '##.##',
  '#####',
];

/**
 * Pick a room. Free order within a stage; the stage itself is gated, which is
 * the whole joke, so the next one stays shut until all three are done.
 *
 * Shut, but not hidden: you can page through the whole ladder and look at
 * what is coming, which is the only way to see that the ventilation keeps
 * not happening. Locked stages show their walls behind a padlock and refuse
 * to start.
 */
export class HouseMapScene implements Scene {
  private readonly save: Save;
  private selected = 0;
  private stage = 0;
  private time = 0;
  /** When the last refusal was, so the card can flash and say why. */
  private geweigerd = -9;

  constructor(save: Save) {
    this.save = save;
    this.stage = versteFase((id) => save.isDone(id));
  }

  private gedaan = (id: string): boolean => this.save.isDone(id);

  private entries() {
    return STAGES[this.stage]!.entries;
  }

  private open(index = this.stage): boolean {
    return stageOpen(index, this.gedaan);
  }

  private cardHeight(): number {
    const rows = Math.ceil(this.entries().length / PER_ROW);
    const room = HEIGHT - CARD_Y - FOOTER - (rows - 1) * GAP;
    return Math.min(MAX_CARD_H, Math.floor(room / rows));
  }

  private cardPos(i: number): { x: number; y: number } {
    const n = this.entries().length;
    const row = Math.floor(i / PER_ROW);
    const inRow = Math.min(PER_ROW, n - row * PER_ROW);
    const total = inRow * CARD_W + (inRow - 1) * GAP;
    return {
      x: Math.round((WIDTH - total) / 2) + (i % PER_ROW) * (CARD_W + GAP),
      y: CARD_Y + row * (this.cardHeight() + GAP),
    };
  }

  private pipX(i: number): number {
    const total = STAGES.length * PIP_W + (STAGES.length - 1) * PIP_GAP;
    return Math.round((WIDTH - total) / 2) + i * (PIP_W + PIP_GAP);
  }

  private blader(richting: number): void {
    this.stage = (this.stage + richting + STAGES.length) % STAGES.length;
    this.selected = 0;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    const n = this.entries().length;

    if (ctx.input.justPressed('Tab')) {
      const terug = ctx.input.isDown('ShiftLeft') || ctx.input.isDown('ShiftRight');
      this.blader(terug ? -1 : 1);
      return;
    }
    if (ctx.input.justPressed('ArrowLeft')) this.selected = (this.selected + n - 1) % n;
    if (ctx.input.justPressed('ArrowRight')) this.selected = (this.selected + 1) % n;
    if (ctx.input.justPressed('ArrowUp')) this.selected = (this.selected + n - PER_ROW) % n;
    if (ctx.input.justPressed('ArrowDown')) this.selected = (this.selected + PER_ROW) % n;
    if (ctx.input.justPressed('Escape')) ctx.pop();

    const klik = ctx.input.mouseClicked && ctx.input.mouseOver;
    if (klik && ctx.input.mouseY >= STRIP_Y && ctx.input.mouseY < STRIP_Y + STRIP_H) {
      if (ctx.input.mouseX < this.pipX(0)) { this.blader(-1); return; }
      if (ctx.input.mouseX >= this.pipX(STAGES.length - 1) + PIP_W) { this.blader(1); return; }
      for (let s = 0; s < STAGES.length; s++) {
        const px = this.pipX(s);
        if (ctx.input.mouseX >= px && ctx.input.mouseX < px + PIP_W) {
          this.stage = s;
          this.selected = 0;
          return;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const { x, y } = this.cardPos(i);
      const inside = ctx.input.mouseOver &&
        ctx.input.mouseX >= x && ctx.input.mouseX < x + CARD_W &&
        ctx.input.mouseY >= y && ctx.input.mouseY < y + this.cardHeight();
      if (inside) {
        this.selected = i;
        if (ctx.input.mouseClicked) this.start(ctx, i);
      }
    }
    if (ctx.input.confirmed()) this.start(ctx, this.selected);
  }

  /** Looking is free. Starting needs the stage to be open. */
  private start(ctx: SceneContext, index: number): void {
    if (!this.open()) {
      this.geweigerd = this.time;
      return;
    }
    const entry = this.entries()[index];
    if (!entry) return;
    const kind = STAGES[this.stage]!.kind;
    if (kind === 'sloop') {
      const level = SLOOP_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new LevelScene(level, this.save));
    } else if (kind === 'leeghalen') {
      const level = SCHUIF_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new SchuifScene(level, this.save));
    } else if (kind === 'isolatie') {
      const level = ISOLATIE_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new IsolatieScene(level, this.save));
    } else if (kind === 'klossen') {
      const level = KLOS_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new KlosScene(level, this.save));
    } else if (kind === 'vloeren') {
      const level = VLOER_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new VloerScene(level, this.save));
    } else if (kind === 'schilderen') {
      const level = SCHILDER_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new SchilderScene(level, this.save));
    } else if (kind === 'kanalen') {
      const level = KANAAL_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new KanalenScene(level, this.save));
    } else {
      const level = ELEKTRA_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new ElektraScene(level, this.save));
    }
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ROET);
    screen.ditherRect(0, 0, WIDTH, HEIGHT, C.ROET, C.ZWART);

    const stage = STAGES[this.stage]!;
    const open = this.open();

    screen.fillRect(0, 0, WIDTH, 20, C.ZWART);
    screen.fillRect(0, 19, WIDTH, 1, C.STEEN);
    screen.text(stageLabel(stage), 6, 7,
      !open ? C.STEEN : stage.tussendoor ? C.MAGENTA : C.LICHTOKER);

    const entries = this.entries();
    const done = entries.filter((e) => this.gedaan(e.id)).length;
    const label = open ? `${done} / ${entries.length} RUIMTES` : 'OP SLOT';
    screen.text(label, WIDTH - 6 - label.length * 6, 7,
      !open ? C.STEEN : done === entries.length ? C.SALIE : C.ASGRIJS);

    this.drawStrip(screen);
    for (let i = 0; i < entries.length; i++) this.drawCard(screen, i, open);
    this.drawFooter(screen, open, done, entries.length);
  }

  /** Every stage as one pip, so the whole job is on screen at once. */
  private drawStrip(screen: Screen): void {
    screen.fillRect(0, STRIP_Y - 1, WIDTH, STRIP_H + 1, C.ZWART);
    STAGES.forEach((stage, s) => {
      const x = this.pipX(s);
      const af = stageAf(stage, this.gedaan);
      const open = stageOpen(s, this.gedaan);
      const hier = s === this.stage;

      screen.fillRect(x, STRIP_Y, PIP_W, STRIP_H - 2, af ? C.DONKERSALIE : C.ZWART);
      screen.strokeRect(x, STRIP_Y, PIP_W, STRIP_H - 2,
        hier ? C.WIT : af ? C.SALIE : open ? C.ASGRIJS : C.ROET);

      const inkt = hier ? C.WIT : af ? C.LICHTSALIE : open ? C.KALK : C.STEEN;
      if (stage.tussendoor) {
        // The ventilation drawings are not phases, so they are not numbered.
        const cx = x + Math.floor(PIP_W / 2);
        const cy = STRIP_Y + Math.floor((STRIP_H - 2) / 2);
        for (let d = -2; d <= 2; d++) {
          screen.fillRect(cx - (2 - Math.abs(d)), cy + d, 2 * (2 - Math.abs(d)) + 1, 1,
            open ? C.MAGENTA : hier ? C.ASGRIJS : C.STEEN);
        }
      } else {
        const tekst = String(stage.nummer);
        screen.text(tekst, x + Math.round((PIP_W - tekst.length * 6) / 2) + (open ? 0 : -2),
          STRIP_Y + 2, inkt);
        if (!open) drawSlot(screen, x + PIP_W - 7, STRIP_Y + 2, C.ROET);
      }
    });

    // Page arrows, either side of the ladder.
    const links = this.pipX(0) - PIJL_W + 3;
    const rechts = this.pipX(STAGES.length - 1) + PIP_W + 4;
    const midden = STRIP_Y + Math.floor((STRIP_H - 2) / 2);
    for (let i = 0; i < 4; i++) {
      screen.fillRect(links + i, midden - i, 1, 2 * i + 1, C.ASGRIJS);
      screen.fillRect(rechts + i, midden - (3 - i), 1, 2 * (3 - i) + 1, C.ASGRIJS);
    }
  }

  private drawFooter(screen: Screen, open: boolean, done: number, totaal: number): void {
    screen.fillRect(0, HEIGHT - FOOTER, WIDTH, FOOTER, C.ZWART);
    screen.fillRect(0, HEIGHT - FOOTER, WIDTH, 1, C.STEEN);

    const vers = this.time - this.geweigerd < 1.4;
    let regel: string;
    let kleur: number;
    if (vers) {
      regel = 'NOG OP SLOT. EERST DE VORIGE FASE AF.';
      kleur = C.ROESTROOD;
    } else if (!open) {
      const blok = blokkade(this.stage, this.gedaan)!;
      regel = `EERST ${stageLabel(blok)} AF`;
      kleur = C.STEEN;
    } else {
      const next = STAGES[this.stage + 1];
      regel = !next ? 'LAATSTE FASE'
        : done < totaal ? `${stageLabel(next)}: EERST ALLES HIER`
        : `${stageLabel(next)} IS OPEN`;
      kleur = !next || done < totaal ? C.STEEN : C.SALIE;
    }
    screen.textCentered(regel, WIDTH / 2, HEIGHT - 19, kleur);
    screen.textCentered(open
      ? 'TAB = BLADEREN   PIJLTJES = KIEZEN   ENTER = AAN DE SLAG'
      : 'TAB = BLADEREN   ESC = TERUG',
      WIDTH / 2, HEIGHT - 9, C.ASGRIJS);
  }

  private drawCard(screen: Screen, i: number, open: boolean): void {
    const level = this.entries()[i]!;
    const { x, y } = this.cardPos(i);
    const cardH = this.cardHeight();
    const active = i === this.selected;
    const record = this.save.get(level.id);
    const bons = active && this.time - this.geweigerd < 1.4
      && Math.floor((this.time - this.geweigerd) * 8) % 2 === 0;

    screen.fillRect(x, y, CARD_W, cardH, C.ZWART);
    const rand = bons ? C.ROESTROOD : !open ? (active ? C.ASGRIJS : C.ROET)
      : active ? C.LICHTOKER : C.STEEN;
    screen.strokeRect(x, y, CARD_W, cardH, rand);
    if (active && open) screen.strokeRect(x + 1, y + 1, CARD_W - 2, cardH - 2, C.DONKEROKER);

    screen.textCentered(level.titel, x + CARD_W / 2, y + 4,
      !open ? C.ASGRIJS : active ? C.WIT : C.KALK);
    screen.textCentered(level.vlak, x + CARD_W / 2, y + 13, !open ? C.ROET : C.ASGRIJS);

    // A thumbnail of the wall when there is room for one, otherwise a line
    // saying what the job is. At nine cards the art collapses to single
    // pixels and tells you nothing.
    const rows = level.rows ?? [];
    const cols = rows[0]?.length ?? 0;
    const art = cardH - 34;
    const cell = cols === 0 ? 0 : Math.min(3, Math.min(
      Math.floor(76 / cols),
      Math.floor(art / Math.max(1, rows.length)),
    ));
    if (cell >= 2) {
      const gx = x + Math.round((CARD_W - cols * cell) / 2);
      const gy = y + 22;
      for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          const ch = rows[ry]![rx]!;
          const color = !open ? (ch === '.' ? C.ZWART : C.ROET)
            : ch === '#' ? C.KALK : ch === 'B' ? C.HOUT
            : ch === 'L' ? C.ASGRIJS : ch === 'K' ? C.LICHTOKER : C.ROET;
          screen.fillRect(gx + rx * cell, gy + ry * cell, cell - 1, cell - 1, color);
        }
      }
    } else if (level.samenvatting) {
      // Clamped so a long summary can never bleed into the next card.
      const fits = Math.floor((CARD_W - 8) / 6);
      screen.textCentered(level.samenvatting.slice(0, fits), x + CARD_W / 2, y + 24,
        !open ? C.ROET : active ? C.SALIE : C.STEEN);
    }

    if (!open) {
      drawSlot(screen, x + Math.round((CARD_W - SLOT[0]!.length * 2) / 2), y + cardH - 18,
        active ? C.ASGRIJS : C.STEEN, 2);
      return;
    }
    if (record) {
      const span = 3 * STAR_W + 2 * 4;
      for (let s = 0; s < 3; s++) {
        drawStar(screen, x + Math.round((CARD_W - span) / 2) + s * (STAR_W + 4),
          y + cardH - 10, s < record.stars);
      }
    } else if (active && Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('AAN DE SLAG', x + CARD_W / 2, y + cardH - 9, C.ROESTROOD);
    }
  }
}

function drawSlot(screen: Screen, x: number, y: number, color: number, scale = 1): void {
  for (let gy = 0; gy < SLOT.length; gy++) {
    const row = SLOT[gy]!;
    for (let gx = 0; gx < row.length; gx++) {
      if (row[gx] === '#') screen.fillRect(x + gx * scale, y + gy * scale, scale, scale, color);
    }
  }
}
