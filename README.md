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

## The life of a flower

A flower placed on the sill has **25 parcels** of life, give or take a fifth so
a shelf never expires in unison. Life is spent by *opening parcels*, never by
the clock — so time away cannot consume it.

Only the ending runs on the wall clock, and there are two of them:

- **Spent.** Life reaches zero, the flower begins to fade, and after
  `wiltHours` it is **pressed into the Herbarium** — preserved. Nothing leaves
  the collection this way.
- **Ill.** A healthy flower can sicken. It fades much faster, and after
  `illHours` it is **lost** — and does *not* reach the book. A **tonic** cures
  it. Tonics are deliberately scarcer than illness, so you cannot save
  everything and have to choose.

### Illness has no rate

There is deliberately **no `illChance` constant**. Risk is derived from the
state of the sill, by `illRisk(i)`, from two causes that are both visible in
the room:

- **age** — a flower in its last third is frail;
- **spread** — rot travels from an **ill** neighbour to what stands beside it.

Only illness spreads. A flower that has merely finished its season is harmless,
because the game asks you to leave that one alone so it reaches the book — it
would be incoherent to punish you for doing what it asked. So the two endings
stay genuinely different: one is a slow goodbye, the other is a thing you have
hours to deal with before it takes a neighbour with it.

This is a monetization decision as much as a design one. The moment relief from
illness is sold, a single tuning constant becomes a revenue dial, and that is
the exact mechanism by which a gentle game turns predatory — not by decision,
but one A/B test at a time. Deriving the risk from what is on screen means
nobody *can* quietly turn it up without also changing what the player sees.

That split is the whole point: attention preserves, neglect actually costs, and
a fortnight away can only take the few that were already on their way out — it
can never take the shelf.

A fading flower keeps less of its bond (a bond is only as strong as its weaker
flower), droops, closes, and drains toward the colour of the wall. Replacing it
leaves a hole in the arrangement, so a spent flower is not just a slot to refill
— it is a puzzle to re-solve.

## Petals and the catalogue

Pressed petals are the soft currency, and they come from the one thing that was
previously worthless: **a flower you already have**. A discovery pays nothing —
it is its own reward — while a duplicate pays by rarity, and a flower that
finishes its season on the sill pays a few more on its way into the book. A
flower lost to illness pays nothing at all: a loss stays a loss.

That fixes a real problem the economy model exposed earlier: the late game had
nowhere to go once the book stopped surprising you. Now the book keeps paying
after it stops teaching.

They are spent in **the Sundries Catalogue** (the *Order* tab), which holds
glaze sets for the pots, papers for the room, the long ledge, seed packets that
name a species you have never been sent, and — the only place real money
appears — bundles of petals.

### Three rules hold it together

1. **Nothing for sale touches the rate.** Glazes and papers are paint. The long
   ledge is display space: it pays for its first three ornaments whether it
   holds three or five (`CFG.ledgePays`), so it buys room, not speed. A seed
   packet fills a gap in the book. None of them makes a parcel arrive sooner,
   which means no A/B test can ever discover that making the game worse sells
   better. Three assertions in `tests/framework.js` hold this line.
2. **No tonics, ever.** Selling relief from a loss the game engineered would
   convert best and cost most. It is also why illness has no constant to raise.
3. **Everything is reachable with petals.** Money buys petals faster; it does
   not buy anything petals cannot. A player who never pays reaches every glaze,
   every paper and the long ledge — the model puts the whole catalogue at about
   38 days of ordinary play, and the first glaze at five.

The catalogue states all of this on its own last page, where the player can read
it, rather than only here.

### Legibility survives a purchase

A glaze set never decides *which* pot gets which glaze — the bond grouping owns
that, because it has to for the sill to be readable. A set only decides what
those four glazes look like, and the relief marks stay in the same order in
every set, so a matched group is still readable by relief alone whatever you
have bought. The same rule governs papers: every one of them stays inside the
GROUND envelope, so a paper cannot start competing with the flowers.

### The payment seam

`PAY` is one object with three providers. `demo` is what runs in a browser and
charges nothing (the button says so). `telegram` opens a Stars invoice, and
`wx` is stubbed — both need a bot or mini-programme backend to mint the
invoice, so neither can work from a static file alone.

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

## Tuning the economy

`tests/economy.js` models the loop over sixty simulated days so the numbers are
chosen rather than guessed. It is a model, not the game — arrangement quality is
a parameter calibrated against real measurements — but accrual, the cap, parcel
contents, life in parcels, the wilt and illness windows and tonic supply all
follow the game's own rules.

```
node tests/economy.js           # the current settings
node tests/economy.js --sweep   # a grid over interval x cap
```

Two findings it produced, both of which changed the design:

- **The post was serving 51 parcels a day.** At one every 90s with a cap of 8,
  a player checking in three times a day never waited for anything. It now runs
  at one per 5 minutes, cap 5 — about 22 a day, and a session ends naturally
  when the mailbox runs dry, which is what makes the next one worth waiting for.
- **Slowing the post cannot make flowers scarce.** Because life is counted in
  parcels, halving the delivery rate halves the ageing rate too; the sweep shows
  occupancy pinned at 9/9 at every setting from 15 to 52 parcels a day. Rate and
  scarcity are independent levers. If the sill should ever feel *hungry*, that
  has to come from a shorter `flowerLife` or a shorter `wiltHours`, not from the
  post.
- **A wilting flower must not spread rot.** The first cut of the derived
  illness model let anything ailing infect its neighbours, and the sim jumped
  from 0.4 to **2.0 illnesses a day**, with 1.7 flowers lost. The cause was a
  contradiction rather than a number: spent flowers sit on the sill for up to
  `wiltHours` *because the game tells you to leave them there*, and each one was
  radiating risk for doing it. Restricting spread to genuinely ill neighbours
  brought it back to 0.40 illnesses and 0.32 losses a day.
- **The cap was a floor, not a ceiling.** A well-tended full sill reached the
  old 2.00 cap, so careful arrangement earned no more than adequate arrangement.
  Bond values came down (kin 0.12 → 0.09, shelf accord 0.10 → 0.08) and the cap
  went up to 2.50, which is now reachable only by a sill of one family with a
  full ledge. A good mixed sill lands around ×1.92.

The model also prices the catalogue, because petal income is entirely a function
of how full the book already is — early on nearly every flower is a discovery
and pays nothing, late on nearly every one is a duplicate. An average would hide
exactly the curve being tuned, so the model keeps a book of its own and reports
week one against the final week (32 → 49 petals a day).

## Tuning

Everything that governs the pull is in one block at the top of the script:

```js
const CFG = {
  parcelIntervalMs : 300 * 1000,  // accrual rate while away
  parcelCap        : 5,           // accrual stops here
  flowerLife       : 25,          // parcels a healthy flower lasts
  wiltHours        : 20,          // spent -> pressed into the book, preserved
  illHours         : 8,           // ill  -> lost, and NOT preserved
  ill              : { base: 0.0022, age: 0.0130, ageFrom: 0.34, spread: 0.0170 },
  bond             : {kin:0.09, counter:0.10, tone:0.09, echo:0.06},
  shelfAccord      : 0.08,
  harmonyCap       : 2.50,
  ledgePays        : 3,           // ornaments that count toward speed, ever
  petal            : { dup: {common:1, uncommon:2, rare:4, legendary:8},
                       press: 3, first: 0 },
  shop             : { ledge: 420, seed: 90 },
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

- **A second window**, as a progression unlock rather than more pots in one
  sill. `harmony()` is written against a fixed 3×3 neighbour graph, so this is
  a real change, not a constant.
- **Buying faster delivery**, the original monetization idea. Left out on
  purpose: it sells relief from a frustration the harmony system creates by
  design, and the catalogue's whole structure rests on nothing for sale
  touching the rate. The framework would take it as one more row — the
  question is whether it should.
- **Paid story chapters**, which sit in the same "sell carefully" bracket as
  seed packets.
- **A Telegram build.** The game is already an ordinary web page, so the port
  is one change: saving to `CloudStorage` rather than `localStorage`. A maximal
  save — every species, every colourway, full sill, everything found — measures
  3,390 characters against a 4,096-character limit, so it fits in one key.

## Structure

One file, in order: tuning and helpers · the Morandi palette · the boil engine ·
content tables (species, variants, bonds, ornaments, letters, glaze sets,
papers, parcels) · synthesised audio · genome→phenotype and the flower renderer ·
parcel bodies · the six gesture modules · state, saving and the v1→v4
migrations · scoring (`harmony()`) · input and dragging · the four screens ·
the catalogue and the payment seam · the main loop.

## Tests

Both suites drive the real build in headless Chromium — no mocks, no unit
harness around extracted logic. They need `playwright` and the page served over
HTTP (`localStorage` and the tests' own fixtures do not behave on `file://`):

```
python3 -m http.server 8899 &
node tests/framework.js     # 106 assertions
node tests/boil.js          # 10 assertions: boil cadence + frame-rate floors
node tests/playthrough.js   # opens 16 parcels end to end
node tests/economy.js       # 60 simulated days; --sweep for a grid
```

The framework suite covers the catalogue specifically: that a purchase you
cannot afford is refused, that the first tap on a price only quotes it and the
second is the purchase, that a sown packet is what the next parcel holds, that
the petal count steps aside on the screen that prints it, and — the three that
matter most — that a longer ledge, a different glaze and a different paper all
leave the multiplier exactly where it was.

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
