# Parcel & Petal

A stranger keeps mailing you flowers, in containers that make no sense.
You open them anyway.

A small, cozy, one-thumb collection game. Single HTML file, no build step, no
dependencies, no art or audio assets — every flower, parcel and sound is
generated from numbers at runtime.

```
open index.html
```

That's it. Works on a phone or a desktop browser. Saves to `localStorage`.

---

## The loop

1. **Parcels accrue while you're away** — one every 90 seconds, capped at 8, so
   coming back always has something waiting and time away is never wasted.
2. **Unwrap with one thumb.** Each parcel has one to three layers, each cleared
   by a single gesture: peel the tape, swipe across the twine, pop the bubble
   wrap, wind off the thread, press and hold until it gives, lift the lid.
3. **Bloom.** Petals unfurl on a spring, pollen scatters, a chime rings at a
   pitch set by rarity. This frame is the whole game.
4. **Invest.** Arrange the windowsill. Neighbouring flowers that agree are
   **bonded**, bonded neighbours are unioned into a set, and every pot in a set
   is thrown in the same glaze — terracotta, sage, slate or ochre — so you can
   see at a glance which flower is answering which. Drag any flower to
   rearrange. Nine pots, so a full sill means choosing what to swap out.
5. **The gaps pull you back.** The Herbarium logs every species and colourway
   you've seen, and shows every one you haven't.

A session is about ninety seconds. That's deliberate.

## Bonds

Two neighbouring flowers can agree in four ways. Each pair takes its best tier,
and each tier leaves a mark between the pots — between them for a shelf-mate,
stamped on the plank for the one below.

| Tier | The two flowers are… | Mark | Bonus |
|---|---|---|---|
| **Kin** | the same species | seed | +0.12 |
| **Counterpoint** | more than 150° apart on the wheel | bowtie | +0.10 |
| **Tone** | tinted with the same colourway | diamond | +0.09 |
| **Echo** | within 42° of each other | ring | +0.06 |

On top of the pairs: a **shelf in accord** (all three on one plank, both pairs
bonded) is +0.10, a **full sill** is +0.10, and each ornament on the ledge is
+0.03. The whole thing caps at ×2.00, which a real sill will not reach.

Every tier is something you can *see* — that is the constraint each one was
checked against. `dawn` is excluded from Tone for exactly this reason: it is
the untinted colourway, so two dawn flowers share nothing visible, and counting
them would have paid out for a coincidence and glazed two unrelated-looking
flowers together.

## What arrives

A parcel holds one of three things, and they are not weighted the same way.

- **A flower**, nearly always.
- **An ornament** (~5%) — a brass bell, a paper moth, a glass float. These go
  on the **ledge** beneath the window, three spaces, +0.03 each. Purely
  yours to arrange.
- **A letter from the sender** — the key, the ticket stub, the thimble, the
  button, the snail, the frog. These are **not random**. They arrive at fixed
  open counts (`CFG.storyAt`), always in order, and each carries one line. A
  random order would be noise; a schedule makes the thread read. They
  accumulate in the Herbarium under *The Sender*, and finish with a closing
  line once all six are in.

## The Hooked model, explicitly

Built on Nir Eyal's four stages, with the sharp edges deliberately filed off:

| Stage | Here |
|---|---|
| **External trigger** | The mailbox filling up; a Special Delivery once a day |
| **Internal trigger** | The `?` cells in the Herbarium — an unfinished set itches |
| **Action** | One gesture. Nothing between tapping a parcel and the bloom |
| **Variable reward** | Species × colourway × rare mutation, announced by sound before sight. Occasionally a parcel holds a frog instead |
| **Investment** | Arranging the sill — bonds, glazed sets, shelves in accord, the ledge. The one thing you can't get back, and it feeds the trigger by speeding up accrual |

**What was left out on purpose.** Accrual caps rather than an energy meter, so
there is no penalty for leaving. A pity counter guarantees a Rare within seven
opens, so a bad run can't grind you down. The daily streak *wilts* — halving,
never resetting — so missing a day costs something without being punishing.
No currency, no ads, no paywall. Same retention, none of the resentment.

## Art direction

Morandi, by way of *A Little to the Left*: light, papery, low chroma, high
value, everything pulled toward one shared warm grey.

Four rules do most of the work:

- **Every colour goes through one function.** Nothing in the game authors a
  colour freely, which is what makes a screen of fourteen different species
  read as one family rather than fourteen decisions.
- **Ground and figure have separate envelopes.** This is the one that matters
  most. `mor()` paints the room — near-neutral, saturation 0–15, lightness
  48–95. `pet()` paints the flowers — saturation 11–38, lightness 46–90. One
  shared envelope was what made an earlier pass look *muddy*: the room and the
  flowers sat in the same value band, so nothing could separate from anything.
  Splitting them buys contrast without buying loudness.
- **Chroma falls with value.** A dark tone carrying the same saturation as a
  pale one reads as a poster colour, not a Morandi one. This single line is the
  difference between the palette looking muted and looking *chalky*.
- **Low chroma is not low contrast.** The room is built on a warm/cool split —
  cool grey wall, warm wood, the window reading as the light between them —
  because a pass that muted everything equally collapsed into one flat beige
  with nothing for the eye to hold.

**Nothing is outlined.** The flowers, parcels, ornaments and pots are painted
shapes — gouache, not ink-and-wash. Outlines and boil fight each other: a
boiling outline pulls the eye to the *edge*, where an unlined shape reads as one
form redrawn. `CFG.outlines` flips the whole game back to ink if you want to
compare.

Removing them means something else has to do the separating, and the answer is
two rules working together:

- **Directional light** — each petal is shaded by where it points, from
  `CFG.lightAngle`. This separates one side of a flower from the other.
- **Alternating tone** — odd and even petals differ by about 7 in lightness.
  This is the one that matters, and the first pass missed it: neighbouring
  petals point almost the same way, so directional light cannot separate them,
  and a twenty-petal daisy fuses into a disc. Alternating tone is the old
  illustrator's answer, and it makes the petals read as petals.

Both fold into seven quantised shades per petal ring rather than a gradient per
petal, so the shading is nearly free. A soft cast shadow behind each bloom does
the other job an outline used to: it seats the flower against the ground without
drawing a line around it.

Strokes that *are* the form — thread on a cocoon, a snail's spiral, a candle
wick, the netting on a glass float, stems — are not outlines and stay. The
`outline()` helper marks the difference in one place. A procedural paper grain
is tiled over the cached background layers.

Accessibility note: each glaze carries a **distinct relief mark** (band, dots,
stripe, cross) as well as a colour, because in a deliberately low-chroma
palette, colour alone is a weak signal — and for a colour-blind player it is no
signal at all.

## Motion

The lines **boil** — the outlines wobble the way hand-drawn animation does,
because each frame was redrawn by hand. Two properties separate boil from
noise, and both are easy to get wrong:

- **It is stepped.** Real boil runs on 2s or 3s — about eight drawings a
  second, not sixty. Perturbing every rendered frame looks like electrical
  interference; holding each perturbation for ~125ms looks *drawn*.
- **It cycles a small number of fixed drawings.** Three offset sets per vertex,
  reused in order, so the eye reads "the same line, drawn again" rather than a
  line permanently crawling.

So there is a table of three fixed offset sets indexed by a clock ticking at
`CFG.boil.fps`. Lookups are array reads returning no objects, because this runs
a few thousand times a frame.

What boils is the **figure, not the ground** — the same split as the palette,
and the same convention as hand-drawn animation, where painted backgrounds hold
still behind moving characters. Petals wobble along their outline; small shapes
(leaves, centres, ornaments, parcels) shift as a whole, because that is what
boil looks like at small scale. Amplitude tracks stroke width, which scales
with flower size — a constant wobble shouts on a small flower and vanishes on a
large one.

The room's clouds and stars ride the same 8fps clock, so the whole scene
updates on one cadence. Dust drifts in the window light at full frame rate,
because stepped dust would read as a fault. `prefers-reduced-motion` holds every
line still.

## Performance

Adding boil exposed something that had been true for three rounds of art
changes and never measured: the game was repainting the entire static room —
wall gradient, table gradient, light pool, vignette, grain — on every frame, for
pixels identical 59 times out of 60. The table screen ran at **21fps** with boil
switched off.

Three fixes, in order of how much they returned:

1. **The room is cached** to an offscreen canvas and redrawn only when its
   inputs change (size, hour, the 8fps cloud tick). Grain bakes into that layer
   and into the Herbarium's page layer instead of being a full-canvas pattern
   fill per frame.
2. **One gradient per petal ring, not per petal.** Gradient coordinates resolve
   against the transform in force when the gradient is *used*, not when it is
   created — so a single object rotates correctly with each petal. This removed
   ~190 allocations per frame on a full sill.
3. **The petal profile is cached.** The silhouette is sampled at fixed
   positions, so it depends only on sample count and tip sharpness. Tabulated,
   ~5000 `pow`/`sin` calls per frame become array reads. Small petals drop from
   13 samples to 9.

Measured in this repo's container, which has no GPU (software rasterisation, so
treat these as a floor rather than a target): table 21 → 176fps, Herbarium
22 → 48, a typical sill 16 → 50, a worst-case sill of nine 21-petal roses
16 → 33. The boil itself costs about 1.5fps.

`tests/boil.js` asserts frame-rate floors, because this regression hid for three
rounds and nothing would have caught it.

Dropping the outlines afterwards gave the numbers back a second time — two fewer
draw operations per petal — taking a typical sill from 50 to 64fps and the
Herbarium from 46 to 59.

## Legibility

Everything on screen states what it is when you touch it. The three pills top
left are buttons: the mail pill gives the count and the time to the next
parcel, the flower pill breaks the multiplier down into the bonds and bonuses
earning it, the streak pill explains that a missed day wilts rather than
resets. On the sill, tapping a flower names its bonds *and what each tier
means*; tapping an empty pot says what it is for. In the Herbarium, tapping any
card, ornament or letter opens it.

Type is one knob. Every canvas size is a design size multiplied by `UI.s`, and
the DOM mirrors it through a `--ui` custom property, so legibility scales
together rather than drifting apart. The tab bar sits at the bottom, in thumb
reach, which also keeps the top row from crowding.

The Herbarium scrolls by drag **and** by wheel, has a visible scrollbar and a
bottom fade, and its page is measured rather than estimated: `bookLayout()`
computes every position first, so the scroll range ends exactly where the
content does. An earlier version guessed at the height and supported only
dragging, which left the foot of the page unreachable on a desktop — the
gesture a mouse user actually reaches for did nothing at all.

## Tuning

Everything that governs the pull is in one block at the top of the script:

```js
const CFG = {
  parcelIntervalMs : 90 * 1000,   // accrual rate while away
  parcelCap        : 8,           // accrual stops here
  startParcels     : 3,
  pityAt           : 7,           // a Rare+ guaranteed within this many opens
  curioChance      : 0.055,       // chance of an oddment instead of a flower
  harmonyPerPair   : 0.06,        // sill bonus per matching neighbour pair
  harmonyCap       : 1.75,
  squeezeSeconds   : 1.15,        // hold-to-squeeze fill time
  boil             : {fps: 8, frames: 3, amp: 0.95},  // hand-drawn line boil
};
```

The console has a live handle for tuning: `PP.S` (save state), `PP.V` (scene),
`PP.CFG`, `PP.harmony()`, `PP.bookStats()`, and `PP.reset()` to wipe the save.

## A note on pressure

The squeeze gesture reads as pressing harder, but it is **hold-duration**, not
force. Apple removed 3D Touch hardware after the iPhone XS, so modern iPhones
have no force sensor to read — `PointerEvent.pressure` reports a flat `0.5`
for mouse and ordinary touch on every platform, and no game engine can change
that. Genuine graduated pressure only exists for a stylus, so when
`pointerType === 'pen'` the real `pressure` value feeds into the fill rate as a
bonus. Everyone else gets hold-time, which feels the same.

## Content

14 species, 5 colourways each, 4 mutations, 4 rarity tiers, 4 bond tiers,
6 ornaments, 6 letters, 7 parcel types, 6 gestures. All 70 species-colourway
names are checked unique and free of repeated words — "Ember" plus "Ember Cup"
falls back to the colourway's second adjective rather than reading "Ember Ember
Cup". Flowers are drawn from a genome
(`{species, variant, rarity, mutation, seed}`) through a parametric renderer —
petal count, petal silhouette, frill, curl, hue blend, centre style, stem bend —
so the whole catalogue costs a few hundred lines and zero bytes of art.

## Parked

Ideas raised and deliberately not built yet, recorded so they aren't lost:

- **Monetization.** An option to buy faster delivery when a player can't find
  a match. Noted, not designed. See the caveat in the commit discussion: this
  particular shape sells relief from a frustration the harmony system creates
  on purpose, which is in tension with the "kind by design" choices above.
  Cosmetic glazes, wallpapers and vases, or paid story chapters, sit more
  comfortably next to them.

## Structure

One file, in order: tuning and helpers · the Morandi palette · content tables
(species, variants, bonds, ornaments, letters, parcels) · synthesised audio ·
genome→phenotype and the flower renderer · parcel bodies · the six gesture
modules · state, saving and the v1→v2 migration · scoring (`harmony()`) · input
and dragging · the three screens · the main loop.

## Tests

Both suites drive the real build in headless Chromium — no mocks, no unit
harness around extracted logic. They need `playwright` and the page served over
HTTP (`localStorage` and the tests' own fixtures do not behave on `file://`):

```
python3 -m http.server 8899 &
node tests/framework.js     # 52 assertions
node tests/boil.js          # 9 assertions: boil cadence + frame-rate floors
node tests/playthrough.js   # opens 16 parcels end to end
```

`tests/framework.js` covers the bond tiers, scoring (shelf accord, full sill,
the cap), drag-to-rearrange versus tap-to-inspect, ledge hit-testing and
placement, letter pacing, both non-flower sheet paths, the v1→v2 save
migration, the explanatory pills, name uniqueness, gesture progress landing
exactly on its end, and — across four viewport
sizes from 360×640 to 520×1180 — that the wheel scrolls the Herbarium, that the
foot of its page lands above the hint and tab bar, and that scrolling clamps at
the top. `tests/playthrough.js` opens sixteen parcels, performing every
gesture with real pointer events, and asserts each one reaches bloom.

Two notes for anyone extending them. The suites talk to the game through
`window.PP`, which is the same dev surface you get in the console. And the
migration fixture stubs `Storage.prototype.setItem` before reloading, because
the game saves on `visibilitychange` — correct behaviour that would otherwise
overwrite the fixture before the reload reads it.
