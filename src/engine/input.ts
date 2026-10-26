import { WIDTH, HEIGHT, type Screen } from './screen.ts';

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
