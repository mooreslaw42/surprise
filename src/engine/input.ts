import { WIDTH, HEIGHT, type Screen } from './screen.ts';

/**
 * Fill the straight-line gaps between recorded pointer positions so no cell
 * boundary is skipped, however fast the flick or however coarsely the browser
 * sampled it. Steps a virtual pixel at a time, which is finer than any tile,
 * so consecutive points land on the same cell or an orthogonal neighbour.
 */
export function densify(points: readonly { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const out = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const span = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    for (let s = 1; s <= span; s++) {
      out.push({
        x: Math.round(a.x + ((b.x - a.x) * s) / span),
        y: Math.round(a.y + ((b.y - a.y) * s) / span),
      });
    }
  }
  return out;
}

/**
 * Keyboard and mouse, reported in virtual pixel coordinates so puzzle code
 * never sees a real screen pixel. Laptop target: mouse drives the puzzles,
 * keyboard drives menus and shortcuts.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();

  mouseX = 0;
  mouseY = 0;
  /**
   * Where the button went down, which is not where the mouse is now when a
   * whole gesture — press, travel, release — lands between two steps. Scenes
   * that drag something need the grab, not the let-go.
   */
  mousePressX = 0;
  mousePressY = 0;
  mouseDown = false;
  mouseClicked = false;
  mouseReleased = false;
  /** False until the pointer has been over the canvas at least once. */
  mouseOver = false;
  /**
   * Every pointer position seen since the last step, oldest first, starting
   * at the press when the button went down this step. The end position alone
   * is a lie when a flick crosses several cells between two steps — or when
   * the browser coalesces a burst of moves into one event — so a scene that
   * follows a drag cell by cell walks this instead. Densify it first: the
   * recorded points can still be cells apart.
   */
  readonly mousePath: { x: number; y: number }[] = [];

  private readonly screen: Screen;

  constructor(canvas: HTMLCanvasElement, screen: Screen) {
    this.screen = screen;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
    });

    const virtueel = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor(((e.clientX - rect.left) / rect.width) * WIDTH),
        y: Math.floor(((e.clientY - rect.top) / rect.height) * HEIGHT),
      };
    };

    canvas.addEventListener('mousemove', (e) => {
      const p = virtueel(e);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseOver = true;
      this.mousePath.push(p);
    });
    canvas.addEventListener('mouseleave', () => {
      this.mouseOver = false;
    });
    canvas.addEventListener('mousedown', (e) => {
      // Read the position off the press itself rather than trusting the last
      // mousemove: a press can arrive without one, and a scene that grabs
      // something has to know where the grab was.
      const p = virtueel(e);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mousePressX = p.x;
      this.mousePressY = p.y;
      this.mouseOver = true;
      this.mouseDown = true;
      this.mouseClicked = true;
      // Start the path at the grab, so a press-and-flick in one step still
      // traces from where the drag began.
      this.mousePath.push(p);
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.mouseReleased = true;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  justPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  justReleased(code: string): boolean {
    return this.released.has(code);
  }

  /** Any of the keys we treat as "confirm". */
  confirmed(): boolean {
    return this.justPressed('Enter') || this.justPressed('Space') || this.justPressed('NumpadEnter');
  }

  /** Called at the end of every frame. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
    this.mouseClicked = false;
    this.mouseReleased = false;
    this.mousePath.length = 0;
  }

  /** Hardware cursor is hidden, so we draw our own. */
  drawCursor(): void {
    if (!this.mouseOver) return;
    const { mouseX: x, mouseY: y } = this;
    const art = ['#....', '##...', '###..', '####.', '#####', '###..', '#.##.', '...##'];
    for (let gy = 0; gy < art.length; gy++) {
      const row = art[gy]!;
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === '#') {
          const edge = gx === 0 || gy === 0 || row[gx + 1] !== '#';
          this.screen.set(x + gx, y + gy, edge ? 0 : 1);
        }
      }
    }
  }
}
