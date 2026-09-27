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
4. **Invest.** Put the flower on the windowsill. Neighbouring flowers that
   agree on hue are unioned into a **glazed set**, and every pot in a set is
   thrown in the same glaze — terracotta, sage, slate or ochre — so you can
   see at a glance which flower is answering which. Nine pots, so a full sill
   means choosing what to swap out.
5. **The gaps pull you back.** The Herbarium logs every species and colourway
   you've seen, and shows every one you haven't.

A session is about ninety seconds. That's deliberate.

## The Hooked model, explicitly

Built on Nir Eyal's four stages, with the sharp edges deliberately filed off:

| Stage | Here |
|---|---|
| **External trigger** | The mailbox filling up; a Special Delivery once a day |
| **Internal trigger** | The `?` cells in the Herbarium — an unfinished set itches |
| **Action** | One gesture. Nothing between tapping a parcel and the bloom |
| **Variable reward** | Species × colourway × rare mutation, announced by sound before sight. Occasionally a parcel holds a frog instead |
| **Investment** | Arranging the sill, which is the one thing you can't get back, and which feeds the trigger by speeding up accrual |

**What was left out on purpose.** Accrual caps rather than an energy meter, so
there is no penalty for leaving. A pity counter guarantees a Rare within seven
opens, so a bad run can't grind you down. The daily streak *wilts* — halving,
never resetting — so missing a day costs something without being punishing.
No currency, no ads, no paywall. Same retention, none of the resentment.

## Art direction

Morandi, by way of *A Little to the Left*: light, papery, low chroma, high
value, everything pulled toward one shared warm grey.

Three rules do most of the work, and they live in `mor()`:

- **Every colour goes through one function.** Nothing in the game authors a
  colour freely. `mor(hue, sat, lit)` clamps saturation to 5–30 and lightness
  to 38–89, which is what makes a screen of fourteen different species read as
  one family rather than fourteen decisions.
- **Chroma falls with value.** `sat × (0.45 + 0.55 × lit/100)`. A dark tone
  carrying the same saturation as a pale one reads as a poster colour, not a
  Morandi one. This single line is the difference between the palette looking
  muted and looking *chalky*.
- **Low chroma is not low contrast.** The room is built on a warm/cool split —
  cool grey-beige wall, warm dark wood — because a first pass that muted
  everything equally collapsed into one flat beige with nothing for the eye to
  hold.

Supporting the above: outlines are pencil (`rgba(86,75,60,.42)`) rather than a
darker shade of the fill, which is most of what separates a hand-drawn look
from a vector one; and a procedural paper grain is tiled over every frame.

Accessibility note: each glaze carries a **distinct relief mark** (band, dots,
stripe, cross) as well as a colour, because in a deliberately low-chroma
palette, colour alone is a weak signal — and for a colour-blind player it is no
signal at all.

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

14 species, 5 colourways each, 4 mutations, 4 rarity tiers, 6 oddments,
7 parcel types, 6 gestures. Flowers are drawn from a genome
(`{species, variant, rarity, mutation, seed}`) through a parametric renderer —
petal count, petal silhouette, frill, curl, hue blend, centre style, stem bend —
so the whole catalogue costs a few hundred lines and zero bytes of art.

## Parked

Ideas raised and deliberately not built yet, recorded so they aren't lost:

- **Tiered matching.** Hue agreement is the basic tier; higher tiers (species
  family, complementary pairs, a full row in one glaze) would grant larger
  accelerations. Turns the sill from a check into a craft.
- **Draggable sill.** Rearranging in place rather than only on placement.
- **Two item categories.** Deliveries split into *decorations* (things that
  furnish the window) and *story items* (the key, the frog, the ticket stub) —
  the oddments becoming the game's narrative carrier rather than a novelty.
- **Monetization.** An option to buy faster delivery when a player can't find
  a match. Noted, not designed. See the caveat in the commit discussion: this
  particular shape sells relief from a frustration the harmony system creates
  on purpose, which is in tension with the "kind by design" choices above.
  Cosmetic glazes, wallpapers and vases, or paid story chapters, sit more
  comfortably next to them.

## Structure

One file, in order: tuning and helpers · content tables · synthesised audio ·
genome→phenotype and the flower renderer · parcel bodies · the six gesture
modules · state and saving · input · the three screens · the main loop.
