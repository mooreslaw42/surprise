# DE EEUWIGE VERBOUWING
*Een Sinterklaassurprise voor Wouter — 5 december 2026*

A pixel-art puzzle game about a house that, unlike the real one, actually gets finished.

---

## 1. Concept

Three connected rooms — woonkamer, keuken, tv-kamer. Each wall, floor and ceiling is a level.
Levels are grouped into renovation stages. The gate is the joke: **no room may start a stage
until every room has finished the previous one.** You are forced through the same phase-by-phase
slog he has actually lived, except this time it ends.

Shut, though, is not hidden. The menu pages through the whole ladder whether or not you have
earned it: every stage is a pip along the top, every wall still shows its card, and the ones
you cannot start yet sit behind a padlock with a line saying what is in the way. Looking ahead
at eight phases of work you have not reached is part of the joke, and it is the only way to
see that the ventilation keeps on not happening.

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
| Wiep | de zus. Asks, every stage, for help with the tiny house — until the asking stops and a trailer turns up on the drive |
| Zwart & Dekker | the tools. They break. *Altijd dekking, nooit garantie.* |
| Het ventilatiesysteem | planned forever, delivered never |

---

## 2. Stage ladder

| # | Stage | Mechanic | What you do |
|---|---|---|---|
| 0 | Leeghalen | Rush Hour sliding blocks | shove bank, kast, koelkast out through the door opening |
| 1 | Sloop | collapse / load paths | bring the wall down on itself, around de dragende balk, de gasleiding, en die ene kabel |
| 2 | Isolatie | polyomino packing | fit odd-shaped wool between the studs — target Rc, zero koudebruggen |
| 3 | Elektra | non-crossing routing (Flow) | sockets and lights to the meterkast, nothing crosses, groups stay under 16A |
| 4 | Water & afvoer | pipe rotation + gravity | warm, koud, afvoer — and the afvoer must run downhill |
| 5 | Dichtzetten | deduction (tents-and-trees) | find the klossen behind the board before you drill |
| 6 | Vloeren | plank laying | wooden floors, staggered joints, reuse your cut-offs |
| 7 | Schilderen | Eulerian path | roller every tile without lifting the roller or walking through wet paint |
| 8 | Oplevering | boss | see below |

### Ventilatie — the running gag
Sits outside the ladder. One planning level after most stages, six in total.
**Mini Metro mechanics**: route ducts from the WTW unit to every room, balance airflow in m3/h,
stay inside the duct budget. Each is harder than the last. Each ends with a delivery notice.
`WTW = Wachten Totdat 't Werkt.` It never arrives.

### Het tuinhuis — the other running gag
Also outside the ladder, and the counterweight to the one above: this one pays off, halfway,
in a boss of its own. Wiep stops asking and arrives with a trailer, and the tiny house is
finished in an afternoon while Wouter's own house is still somewhere in the wiring. Then
kanaalplan 2 lands, with its delivery notice, and the unit is still on its way.

Designed out in full in **[TUINHUIS.md](TUINHUIS.md)**: a section through a trailer, nine
functions that have to be stacked under a road-legal four metres, and a tow-ball gauge that
moves while you do it. It sits between Elektra and kanaalplan 2, behind the same gate as
everything else — this once, he cannot put it off.

### Boss level — Oplevering
The ventilation unit is delivered. One mega-level across all three rooms at once: ducts have to
pass through the walls you already closed, around the wiring you already routed, under the floor
you already laid. **Everything you built becomes an obstacle.** Two years of running gag, paid off
in one level. Then the outro video plays.

Designed out in full in **[BAAS.md](BAAS.md)**: two layers rather than one plan, three schachten
the player has to site, and the one thing that has to be written to the save to make the obstacle
genuinely his own work.

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
- *Slow Blues in C* (Ten Years After) — the bosses and the credits. Was *I'm Going Home*; Pim swapped it
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
| Music transcription eats time | done, and early: arrangements rather than transcriptions, written as data |

---

## 9. Stand van zaken

Week 1 done: engine, palette, save, house map, and **Sloop playable end to end**.

The Sloop mechanic was minimum set cover with forbidden cells, and it was
too easy: with a 3x3 voorhamer and nothing much in the way, hitting whatever
was in front of you was as good as thinking. There was nothing to work out.

It is now a collapse. The wall is masonry, and a brick stands as long as
there is something solid under it or under one of its two shoulders. Take
out three and the brick above follows; take out a whole course and the wall
has nothing left to stand on. A hole closes up into a triangle as it rises,
so a wide bite low down is worth far more than a deep one, and two swings
side by side are worth far more than two swings apart.

That turns the question from "how many hammer-widths of wall is there" into
"where do you have to hit before the wall does the rest" — and the answer is
not greedy. Every shipped wall is checked against the two obvious
approaches, always take the biggest bite and just work along the bottom, and
both have to lose by a clear margin, which is a test rather than a hope.

The services are what give it teeth. A gasleiding or a cable is an umbrella:
what rests on it never falls on its own, so there is a column of wall
standing dry underneath that has to come apart by hand, with the beitel,
because the voorhamer is not allowed near it. Where they run was chosen by
sweeping every position and keeping the layout that punished greed hardest.
tools/sloop-kies.ts does the sweep.

Par is computed by an exact solver rather than written down by hand, so it
can never drift from the level, and the same solver powers the hint. The
solver leans on one fact: swings and collapse both only ever take bricks
away, so playing a set of swings in any order leaves the same wall standing.
What is searched is a set, not a sequence.

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
one marked GELEVERD. That boss is a stand-in: the same rotation puzzle at
full size, with nothing you built in the eight phases before it in the way. What it should be
instead is BAAS.md.

The sliding puzzle it replaced was good but wrong for ventilation, so it
moved to Leeghalen — stage 1, shoving the furniture out through the door,
which is what the stage table always wanted it for.

It arrived there still drawn as ventilation duct, which meant six identical
ribbed grey rectangles in a room the text kept calling a bank and a kast.
Every piece now knows what it is and is drawn as that thing seen from above:
the bank has arms and cushions, the boekenkast has spines, the koelkast has
a freezer and two handles, the aanrecht has a sink and draining grooves, the
dozen are taped shut. The floor under them is the white marble that was
there before the sloop, because stage 1 is the last time anyone sees it.
What has to get out keeps its own colours and wears a yellow ring instead,
so the room stays a room and the target still reads at a glance.

Isolatie is built: pack the stud cavity full of wool with no gap and no
overlap, because every gap is a koudebrug. There is more wool in the stack
than the cavity needs and the awkward shapes carry the most Rc, so which
batts get the space is the decision — the number on a batt changes the
outcome rather than decorating it.

Schilderen is the roller: cover the whole wall in one run, keeping the wet
edge, and every square you go over twice shows as a lap mark. The wall is a
measured one, drawn in its room, and it turns from the old finish to fresh
oker behind the roller — so how far you have got, and which corner you have
left bare, is something you look at. Par is the number of squares, which a
perfect run covers exactly once.

Water is dropped. Two attempts went in the bin: a manifold-balancing puzzle
that was unreadable, and a drain-fall one that read well but was work he
never did. If a stage needs inventing twice, the stage is the problem.

Vloeren is the floor: one decision per course, how long its first plank is,
with the off-cut carrying to the next course and the joint rule making the
cheap start often the illegal one.

Dichtzetten is deduction, which nothing else in the game is. The first go
at it was a nonogram of the frame and it did not work: a dense grid of
runs, abstract to look at, tedious to fill in. Replaced with klossen,
which is tents-and-trees with a stud finder.

Everything that hangs on the wall is pencilled on it where it really goes
— kastjes, a tv-beugel, a radiator — and each one needs its own klos, a
block of timber behind the board, in one of the four squares against it.
Two klossen never touch, not even at the corner, and the numbers on the
masking tape along the edges are what the detector beeps per row and per
column. One click rules a square out, the next one drills, the third fills
it back in. A hole in the wrong place still costs a star, and the wall
keeps a mark where it was, but it can be patched: holes used to be
permanent, which meant one slip left the counts wrong for good and the
level could never be finished. A wall that looks done and is not now says
what is wrong, because that is the moment someone decides the game is
broken — and it points: the squares a complaint is about are ringed in
red, and a row or column the detector disagrees with goes red on the
tape. Saying two klossen touch without saying which two sends the player
back over the whole wall, and on a grid a corner-to-corner pair does not
look like it is touching at all, so the message names the rule as well.

Walls are generated and filtered, never drawn: the rules-only solver has
to reach the end on its own, and the exact counter has to find exactly one
answer. There is a test that the rules never deduce a square the answer
disagrees with, because a rule that oversteps would hand the player a hole.

No plumbing stage. He did not do any worth the name.

There is music. Three pieces after his own records, written as text in
`data/liedjes.ts` and played by seven voices and one buffer of noise. Nothing
is sampled and nothing is downloaded, so the whole soundtrack is a few
kilobytes of notation and the synth does the rest. The riff opens the game
and carries the work, the ballad is the menus, the slow blues is the bosses.

The ballad is an arrangement. The riff and the blues were too, at first, and
Pim's verdict was that they sounded nothing like the Stones or Ten Years
After. So those two now follow the records, off guitar tabs he sent: the
open-G intro riff in D with its verse changes, and the slow blues' ninth-chord
comping, walk-ups and turnaround on a twelve-step (12/8) grid. They play on
two guitar voices added for the purpose, one overdriven and one clean. Nobody
has checked the result by ear yet except Pim.

The riff is transposed per stage, which is what makes eight themes out of one
loop, and for the kanaalplan it is four semitones down and slower, because
that is what planning the ventilation for the fourth time feels like. Its
lead runs eight bars over a two-bar rhythm section and then shuts up for half
a bar, which is what lets it stay on while somebody measures a wall.

Scenes do not start music, they declare it, and the loop asks whoever is on
top. Push, pop and the design sheet all then do the right thing without a
scene having to remember to hand the music back, and asking for what is
already playing costs nothing — so the riff runs unbroken across the six
walls of a stage instead of restarting on every one.

Timing comes off the audio clock and not the game loop. Notes are booked a
fifth of a second ahead, because a sixteenth at 150bpm is 130ms and a slow
frame is 50. The rule that is not obvious is that a tab left in the
background must never catch up: requestAnimationFrame stops and the audio
clock does not, so coming back to a minute of missed music and playing it as
fast as the loop can book it would be the worst noise this game could make.
It skips to now. Both the notation and that decision are pure, and tested —
a mistyped note throws by name the moment the songbook is imported, which
means in the test suite rather than on 5 December.

The title screen swings before it lets you through, and that is the music's
fault rather than the art's. Nothing may make a sound until the player has
pressed something, so the press that starts the riff is also the press that
would leave — and the title would never get to play its own theme. So Enter
puts the voorhamer through the wall: wind up, drive, a hole with the cavity
behind it, plaster on its way to the floor, and two seconds of riff before
the house map. The screen was already telling you to slopen.

M mutes it.

## 9b. What landed on 14 November

Everything that was a design or a line in the plan and is now in the game:

- **Het tuinhuis** is built, to TUINHUIS.md, between Elektra and kanaalplan 2.
  Two things changed in the building. The BANK is 1,5 m and not 2,0: as
  written the five floor pieces were fifteen cells on a fourteen-cell floor.
  And "loze ruimte" is the empty cells cut off from the main open space,
  because nine fixed pieces in a fixed box always leave the same number empty.
- **Oplevering** is the real boss, in `puzzles/oplevering/`: two drawings,
  ONDER DE VLOER and BOVEN HET PLAFOND, three schachten, and a schacht refused
  where his own cable or a klos is in the wall. Elektra now writes its routes
  to the save (schema v2) and the board is grown from them when the level
  starts. Simpler than BAAS.md in two places: any free cell with duct on both
  drawings will take a schacht, rather than one fixed answer, and Sloop and
  Vloeren leave nothing behind. The old whole-house board became kanaalplan 5.
- **Six ventilation levels**: five plans, each with a later delivery date,
  and the boss.
- **The outro**: the house at night with the lights on, Moeder's last word,
  the gedicht scrolling (Pim's placeholder joke, kept on purpose), credits.
  No video.
- **Moeder and Wiep** have faces and say something after every phase. All of
  that copy is in `data/praatjes.ts` and `data/outro.ts`, and all of it is
  a draft.
- **Around every level** (`scenes/klus.ts`): hammer-confetti, Pim offering a
  hint after a minute, O to skip after three resets, and one Zwart & Dekker
  tool breaking per phase.
- **Meten**: the rolmaat, three times, before Isolatie, Dichtzetten and
  Vloeren. A gag rather than the mechanic in §4 — see `scenes/meten.ts`.

## 9c. The difficulty pass, also 14 November

Three stages could be finished without thinking, and three hints finished
the level for you. Both fixed.

- **Leeghalen** was six, eleven and twelve slides. It is twelve, twenty-one
  and thirty: `tools/schuif-zoek.ts` takes the position furthest from solved
  in a room's whole reachable set, and then hill-climbs on the furniture.
- **Isolatie** was three plates and some strips. Each stack is now twelve
  batts out of a book of fourteen shapes, the target is four tenths under the
  best fill, and 2, 11 and 8 fills in the whole stack reach it
  (`tools/wol-zoek.ts`).
- **Schilderen** was a snake. The ladder now stands at numbered spots that
  have to be passed in order, ending at the verfbak, and each wall is chosen
  so that exactly one clean run exists (`tools/verf-zoek.ts`; the test suite
  counts them).
- **Hints** in Isolatie, Elektra, Vloeren and Schilderen used to lay the whole
  answer. They give one batt, one cable, one course, five squares. Any hint
  caps the level at two stars.

Not touched, because they were reworked on Pim's own playtests and held up:
Sloop, Elektra, Dichtzetten, Vloeren.

**The kanaalplannen** were the last patience and are not one any more. From
plan 2 on the drawing is two systems, toevoer and afvoer, each with its own
roosters, which may never join; where they pass there is a kruising, one
duct over the other, bolted down. Every plan has exactly one answer, which
the test suite counts, and every piece ships turned. Par is 16, 18, 30, 32
and 49 — lower than the 59, 66 and 69 it was, because a turn now goes either
way round and because the work moved from the mouse to the head.

**The rooms, from the photos.** The woonkamer ceiling is one pale salie,
beams and boards alike; the keuken's is white; the tv-kamer's is white with
the old green band under it. Plain walls are cream, not grey. The floor is
strip parquet. The tree-trunk post, the purple curtains and the terracotta
ones are in. The bookcase wall is cream and the oker wall is the one beside
it. What the photos also show and the data still has wrong: the oker wall is
an outside wall with a tall steel window and a small arched one. Putting
those in moves Sloop and Elektra levels, so it waits for the wall designs.

## 10. Waiting on the wall designs

Deferred on purpose until the real wall drawings arrive, because they will
decide both:

- **Level content.** Every stage's levels should sit on the actual walls.
  Sloop and Elektra already do, from the scan; Isolatie's cavities and
  Ventilatie's plans are still stand-ins.
- **Difficulty.** The puzzles are a notch too easy across the board. Tuning
  them before the real geometry lands would only mean tuning them twice.

The data is all in `data/`, so both are data edits rather than rewrites.

## 11. Open

- Final title
- Final surface selection (needs floor plan)
- Ceiling heights, window and door positions — from CamToPlan export plus video
- Box art and poster; og:image; CRT vignette


## 9d. The house, from Pim's own floor plan

The walls and the footprint are no longer the lidar guess. Pim drew the plan
(woonkamer 4,5 x 5, keuken 3 x 5,5, tv-kamer 4,5 x 3, in a row north to
south), sketched walls I to V, sent photos and a walk-through video, and
corrected a schematic of how they were read. `data/house.ts` now holds eight
walls: I okerwand and II tuinwand in the woonkamer, III achterwand and the
kitchen-unit zijwand in the keuken, IV kopgevel, V tuinwand, the wallpaper
zijwand and the deurwand in the tv-kamer. He said to leave out four: both
other woonkamer walls and both end walls of the keuken.

What was rebuilt on them: Sloop (six walls, services re-swept), Elektra
(eight walls, placements from the new `tools/elektra-zoek.ts`), Klossen (new
seeds), Schilderen (new ladder spots), all five kanaalplannen and the end
boss (new 14 x 5 footprint, the plan laid on its side). Windows are drawn by
kind: the steel grid, the arch, hopper-topped, cross, and the doorway with
the orange curtain. The tv-kamer is shown as it is now, stripped plaster and
check wallpaper.

Not rebuilt, because they never used the wall data: Leeghalen (a 6 x 6
sliding board), Isolatie (stud cavities), Vloeren (course shapes, still
invented and not the real rectangles), and the tuinhuis.
