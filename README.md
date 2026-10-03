# Crochet utils

A small, dependency-free web app for working flat crochet circles round by round. It generates the
stitch sequence for each round and lets you tick stitches off as you go, so you never lose your
place.

The interface is in Ukrainian.

## How it works

Each round is shown as a sequence of tokens:

- `I` - a single stitch (стовпчик)
- `II` - an increase, two stitches in one (прибавка)

Rounds follow the standard 6-increases-per-round circle: round 1 is 6 increases, round 2 is
`(1 stitch, increase) × 6`, round 3 is `(2 stitches, increase) × 6`, and so on. On odd-numbered
rounds (from round 3 onward) the increases are offset by half a repeat, which spreads them out and keeps the circle round
instead of turning it into a hexagon.

For example, round 3 is laid out as `1 · inc · (2 · inc) × 5 · 1`.

## Features

- Generate any number of rounds, and add more later.
- Step through stitches with **Позначити виконаним** (mark done) and **Скасувати** (undo), or tap
  any stitch to jump to it.
- The current position shows a hint like "додати 3 стовпчики" (add 3 stitches) for the run of
  identical stitches ahead.
- Complete a whole round at once, or remove the last unfinished round.
- Progress is saved in the browser's `localStorage`, so it survives reloads.

## Running

No build step. Open `index.html` in a browser, or serve the folder with any static file server:

```sh
npx serve .
```
