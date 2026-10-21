# DE EEUWIGE VERBOUWING
*Een Sinterklaassurprise voor Wouter — 5 december 2026*

A pixel-art puzzle game about a house that, unlike the real one, actually gets finished.

---

## 1. Concept

Three connected rooms — woonkamer, keuken, tv-kamer. Each wall, floor and ceiling is a level.
Levels are grouped into renovation stages. The gate is the joke: **no room may start a stage
until every room has finished the previous one.** You are forced through the same phase-by-phase
slog he has actually lived, except this time it ends.

Played first person: no avatar, you are looking at the surface you are working on.
Pim is the pixel-art host in the text box at the bottom.

**Title candidates** — working title is the first:
`DE EEUWIGE VERBOUWING` · `TWEE JAAR LATER` · `SUPER SLOOP BROS` · `KLUSKWARTIER`

### Cast
| Who | Role |
|---|---|
| Wouter | the player. Meticulous. Measures ten times. |
| Pim | host, narrator, hint-giver |
| Moeder | asks, every stage, when she gets her kleiatelier back |
| Zus | asks, every stage, for help with the tiny house |
| Zwart & Dekker | the tools. They break. *Altijd dekking, nooit garantie.* |
| Het ventilatiesysteem | planned forever, delivered never |

---

## 2. Stage ladder

| # | Stage | Mechanic | What you do |
|---|---|---|---|
| 0 | Leeghalen | Rush Hour sliding blocks | shove bank, kast, koelkast out through the door openings |
| 1 | Sloop | sledgehammer / Minesweeper | smash every tile except the dragende balk, de gasleiding, en die ene kabel |
| 2 | Isolatie | polyomino packing | fit odd-shaped wool between the studs — target Rc, zero koudebruggen |
| 3 | Elektra | non-crossing routing (Flow) | sockets and lights to the meterkast, nothing crosses, groups stay under 16A |
| 4 | Water & afvoer | pipe rotation + gravity | warm, koud, afvoer — and the afvoer must run downhill |
| 5 | Dichtzetten | cut-list optimisation | gipsplaat: cover it, minimise waste, never align four corners |
| 6 | Vloeren | plank laying | wooden floors, staggered joints, reuse your cut-offs |
| 7 | Schilderen | Eulerian path | roller every tile without lifting the roller or walking through wet paint |
| 8 | Oplevering | boss | see below |

### Ventilatie — the running gag
Sits outside the ladder. One planning level after most stages, six in total.
**Mini Metro mechanics**: route ducts from the WTW unit to every room, balance airflow in m3/h,
stay inside the duct budget. Each is harder than the last. Each ends with a delivery notice.
`WTW = Wachten Totdat 't Werkt.` It never arrives.

### Boss level — Oplevering
The ventilation unit is delivered. One mega-level across all three rooms at once: ducts have to
pass through the walls you already closed, around the wiring you already routed, under the floor
you already laid. **Everything you built becomes an obstacle.** Two years of running gag, paid off
in one level. Then the outro video plays.

---

## 3. Level matrix

Provisional — final surface selection waits on the floor plan. Each stage takes only the surfaces
that make construction sense, which is why the counts differ and why no surface appears in every
stage. Target **30 levels**.

| Stage | Levels | Surfaces |
|---|---|---|
| Leeghalen | 3 | one per room (room-scale, not surface) |
| Sloop | 3 | woonkamer binnenmuur, keuken achterwand, tv-kamer plafond |
| Isolatie | 3 | the three buitenmuren |
| Elektra | 3 | keuken wand (two groups), woonkamer wand, tv-kamer plafond (lighting) |
| Water & afvoer | 2 | keuken achterwand, keuken vloer — only the kitchen has water |
| Dichtzetten | 3 | woonkamer plafond, keuken wand, tv-kamer wand |
| Vloeren | 3 | all three floors |
| Schilderen | 3 | woonkamer wand, keuken wand, tv-kamer plafond |
| Ventilatie | 6 | interstitial |
| Oplevering | 1 | all rooms |
| **Total** | **30** | |

---

## 4. Three mechanics built on top

**Measuring.** Appears only on the stages where you cut material — Isolatie, Dichtzetten, Vloeren.
Drag the rolmaat across the surface. Measure once and you get an estimate, and the grid may be off
by a tile. Measure three times and average, and you get exact dimensions.
*Meten is weten. Tien keer meten is Wouter.*

**Real numbers.** Rc-values that must sum to a target. Groups that trip at 3680W. Duct pressure
drop over length and bends. Afschot in mm per metre. Waste percentages on cut lists. Correct
physics, not decoration — but tuned to "satisfying", not "homework".

**Zwart & Dekker.** The tool snaps mid-level. Comic interruption only: sprite breaks, jingle plays,
Pim hands you a new one, you continue. It never costs progress. Tool durability as a real resource
would just be irritating.

**Scoring.** Three stars per level on an efficiency metric, never on time: metres of cable, percent
waste, number of swings, m3/h deviation. No timers anywhere, optional on the boss.

**Hints.** Pim offers one after 60 seconds, always available on demand, never forced. Skip unlocks
after three failed attempts so the hard gate can never become a dead end.

---

## 5. Art direction

- Internal resolution **384x216**, integer-scaled to the window, letterboxed. x5 is exactly 1080p.
- Flat front elevation per surface. Isometric cutaway for the house map.
- Fixed **24-colour palette**, C64-adjacent, extended so the real room colours fit.
- Hand-coded 5x7 bitmap font with Dutch diacritics. No web fonts, no licensing, no network.
- Scanlines and CRT vignette, both toggleable.
- Hammer-confetti on level complete. No photo crossfades, no sentiment.
- **Surfaces render procedurally** from a per-surface JSON spec — dimensions plus feature
  positions for windows, doors, sockets, radiators, beams. Adding a surface is a data entry, not a
  sprite sheet. Three or four hand-tuned hero screens on top: title, house map, boss, outro.

### Audio
Chiptune arrangements after his own records, written as data for a small WebAudio synth:
- *Can't You Hear Me Knocking* — riff, level themes
- *I'm Going Home* — boogie, the boss
- *Blue in Green* — ballad, house map and menus

All three are still in copyright, so the URL stays unlisted and unindexed. Private family gift.

### Dutch copy
`jij` throughout. Puns at full throttle. Seeds: *Opgeleverd!* · *Rc je wel?* ·
*Alles met een beetje afschot* · *Onder spanning* · *WTW: Wachten Totdat 't Werkt* ·
*Zwart & Dekker: altijd dekking, nooit garantie* · *Meten is weten, tien keer meten is Wouter*

---

## 6. Tech

TypeScript + Vite. Hand-rolled canvas-2D pixel renderer, no engine. Static deploy to Vercel.
localStorage with a versioned save schema. No backend, no Supabase, no telemetry.

```
src/data/house.ts      rooms, surfaces, real dimensions, features
src/data/levels.ts     manifest: surface x stage x puzzle config
src/engine/            canvas, palette, pixel font, input, scene stack, audio, save
src/puzzles/<name>/    each mechanic: load(config) / update / render / isSolved / score
src/solvers/<name>/    one solver per mechanic, runs in tests
src/scenes/            title, house map, stage select, level, dialogue, outro
```

**Every level is machine-verified solvable.** A hand-authored Sokoban or Flow board that turns out
to be impossible on 5 December would be a disaster, so each mechanic ships with a solver that runs
over the whole level manifest in the test suite. This is real work and it is in the schedule.

The house is pure data, so mechanics get built and tuned on placeholder geometry now and the real
floor plan drops in later without touching puzzle code.

---

## 7. Schedule

| Week | Dates | Work |
|---|---|---|
| 1 | 20-26 Oct | engine, palette, font, input, scenes, house data model, house map, Sloop end to end — **playable slice** |
| 2 | 27 Oct-2 Nov | Elektra and Ventilatie. The two hero mechanics, built early because they carry the game |
| 3 | 3-9 Nov | Isolatie, Water, solvers and test harness |
| 4 | 10-16 Nov | Dichtzetten, Vloeren, Schilderen |
| 5 | 17-23 Nov | real geometry in, full level content, art pass, audio, boss |
| 6 | 24-30 Nov | difficulty tuning on playtests, outro video, box art, poster, deploy |
| - | 1-4 Dec | buffer, nothing else |

**Floor plan and video wanted by 1 November, hard stop 15 November.** Week 5 cannot slip.

### Print deliverables
- Box art, 300dpi PNG, for a 300x200x100mm box
- Level-map poster, A3 at 300dpi — the house as a stage ladder, Nintendo-manual style

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Floor plan arrives late | house is data-driven; build on placeholder geometry |
| Art volume across ~20 surfaces | procedural surface renderer from JSON spec |
| A hand-authored level is unsolvable | per-mechanic solvers in the test suite |
| Difficulty mis-tuned for a physics nerd | per-level knob, hints, skip-after-three; tuned week 6 |
| Eight mechanics is a lot | each is small and classic; two hardest first, in week 2 |
| Music transcription eats time | audio is week 5, two days budgeted, game ships silent if needed |

---

## 9. Stand van zaken

Week 1 done: engine, palette, save, house map, and **Sloop playable end to end**.

The Sloop mechanic is minimum set cover with forbidden cells. Hazards are
visible, so nothing is guesswork: the puzzle is working out where the
voorhamer still fits and where you have to reach for the beitel. Par is
computed by an exact solver rather than written down by hand, so it can never
drift from the level, and the same solver powers the hint.

Levels are no longer drawn by hand. tools/walls.py finds the wall planes in
the lidar scan, projects each one into an elevation, and detects the openings
as gaps bounded by wall above and below. data/house.ts holds the result as
measured surfaces, and the Sloop grid is generated from those: real width,
real ceiling height, real windows, with a lintel over each opening. Knock a
hole in an outside wall and you see the garden.

Which wall belongs to which room is still a guess, and marked so in the data.
Nothing downstream depends on it: relabelling is three fields in house.ts.

Week 2, Elektra: run a cable from every stopcontact to the meterkast without
any two crossing, around the real windows and lintels. The no-crossing rule
took three goes to get right — see model.ts — and the solver that sets par
also proves every level is wireable.

Six walls now, so six levels per stage. Elektra escalates: sockets to the
meterkast, then a lamp that must reach a schakelaar first, then two lamps
sharing one switch. A lamp's amps land on whichever groep its switch
reached, so the chain decides the load as well as the route.

Nine Elektra levels. The last three add a wisselschakelaar — one lamp
switched from two places, so the run goes lamp to the near switch, that to
the far one, and only the far one to the lichtgroep. Three walls appear in
Elektra only: interior walls that never had to come down but still need
wiring.

Later levels add a lichtgroep. Lights and wandcontactdozen may not share a
breaker, which is real practice, so lamps are forced onto LICHT and the
remaining decision is which of two socket groups each stopcontact goes on —
decided by the amps. Some walls also carry waterleiding that was already
there and has to be routed around.

Ventilatie is a rotation puzzle: the whole system as a blueprint with every
piece turned the wrong way. Click to turn a quarter; it is right when every
opening meets an opening, nothing vents into a wall, and the lot hangs
together back to the WTW. Duct that is actually joined lights up, so the
system fills in as it comes right. The drawing sits on the house: the real
footprint from the scan, walled, with the rooms named, so a rooster is in a
room rather than at a coordinate. Two plans between phases, each covering
one room, then the boss over the whole house — eighteen roosters, par 69. That one is the only
one marked GELEVERD.

The sliding puzzle it replaced was good but wrong for ventilation, so it
moved to Leeghalen — stage 1, shoving the furniture out through the door,
which is what the stage table always wanted it for.

Isolatie is built: pack the stud cavity full of wool with no gap and no
overlap, because every gap is a koudebrug. There is more wool in the stack
than the cavity needs and the awkward shapes carry the most Rc, so which
batts get the space is the decision — the number on a batt changes the
outcome rather than decorating it.

## 10. Open

- Final title
- Final surface selection (needs floor plan)
- Ceiling heights, window and door positions — from CamToPlan export plus video
- Outro video from Pim
