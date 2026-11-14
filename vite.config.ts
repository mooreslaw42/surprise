import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * The text editor's way back into the project.
 *
 * /teksten.html is a page for reading and rewriting everything anybody says
 * in the game. It runs in the browser, so it cannot write a file; this is
 * the two endpoints that can. Only while developing: `apply: 'serve'` keeps
 * it out of the build, and the page itself is not a build input, so neither
 * ever reaches the public site.
 */
const BESTAND = fileURLToPath(new URL('./src/data/teksten.eigen.ts', import.meta.url));

function lees(): { eigen: Record<string, string[]>; nagekeken: string[] } {
  const bron = readFileSync(BESTAND, 'utf8');
  const stuk = (naam: string): unknown => {
    const m = new RegExp(`export const ${naam}[^=]*= ([\\s\\S]*?);\\n`).exec(bron);
    return m ? JSON.parse(m[1]!) : null;
  };
  return {
    eigen: (stuk('EIGEN') as Record<string, string[]> | null) ?? {},
    nagekeken: (stuk('NAGEKEKEN') as string[] | null) ?? [],
  };
}

function schrijf(eigen: Record<string, string[]>, nagekeken: string[]): void {
  writeFileSync(BESTAND, `/**
 * Pim's own wording, over the top of what is written in the code.
 *
 * WRITTEN BY THE EDITOR at /teksten.html — do not edit by hand, it is
 * replaced whole every time Save is pressed there. A key here is a text in
 * data/tekstregister.ts; what is not listed keeps the wording in the code.
 */
export const EIGEN: Record<string, string[]> = ${JSON.stringify(eigen, null, 2)};

/** Texts Pim has read and signed off, by the same keys. */
export const NAGEKEKEN: string[] = ${JSON.stringify(nagekeken, null, 2)};
`);
}

function teksten(): Plugin {
  return {
    name: 'teksten-editor',
    apply: 'serve',
    // Saving rewrites a file the game imports, and by default that reloads
    // every open page — including the editor, which then loses its place.
    // So: mark it stale and tell the game, which reloads itself; the editor
    // does not listen. (A 'full-reload' cannot be aimed at one page: Vite's
    // client treats /index.html as meaning everybody.)
    handleHotUpdate({ file, modules, server }) {
      if (file !== BESTAND) return undefined;
      for (const module of modules) server.moduleGraph.invalidateModule(module);
      server.ws.send({ type: 'custom', event: 'teksten:bewaard' });
      return [];
    },
    configureServer(server) {
      server.middlewares.use('/__teksten', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          res.end(JSON.stringify(lees()));
          return;
        }
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('{}');
          return;
        }
        let body = '';
        req.on('data', (deel) => { body += deel; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body) as { eigen?: unknown; nagekeken?: unknown };
            const eigen: Record<string, string[]> = {};
            for (const [sleutel, waarde] of Object.entries(data.eigen ?? {})) {
              if (Array.isArray(waarde) && waarde.every((w) => typeof w === 'string')) eigen[sleutel] = waarde;
            }
            const nagekeken = Array.isArray(data.nagekeken)
              ? data.nagekeken.filter((w): w is string => typeof w === 'string') : [];
            schrijf(eigen, nagekeken);
            res.end(JSON.stringify({ ok: true }));
          } catch (fout) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, fout: String(fout) }));
          }
        });
      });
    },
  };
}

export default defineConfig({ plugins: [teksten()] });
