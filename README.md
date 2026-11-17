# Lumen Drift

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/eskrimkonelo/lumen-drift/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/eskrimkonelo/lumen-drift/reward.svg)](https://make.fun/c/best-game-01)

Pilot a lantern-ship through a night sky of drifting planets. Gravity bends your
path; harvest the falling starlight, dodge the comets, and spend a full Nova meter
to clear the sky. Built for the [make.fun](https://make.fun/c/best-game-01)
"Make the best game" bounty.

## How to play

- **Goal:** fill each level's mote quota to clear it. Lose all 3 lanterns and the
  run ends; your best score is kept between visits.
- **Move:** WASD or arrow keys to thrust — or hold the mouse button and the ship
  steers toward the cursor. **Shift** brakes. Fly off one edge to wrap around.
- **Gold motes** score 10 × your combo (chain quick pickups to raise it, up to ×5).
  **Violet embers** charge the Nova; a rare **prism** is worth 50 and half a meter.
- **Space** fires the Nova when the meter is full: every comet on screen bursts
  for points and nearby motes are pulled in.
- **Comets and planets** cost a lantern on contact. Shard comets — fast and small
  — join from level 3. **P** pauses, **M** mutes.

## Run it

```sh
node serve.ts   # game/ on http://localhost:8080 — no build step, no network
```

Or hand it in:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22 or later, standard library only. The run is deterministic: the same
repository bytes always produce the same output bytes. `main.ts` copies `game/`
and `screenshots/` and writes `dossier.json` into the output directory.

## Layout

- `main.ts` — the entrypoint: copies the game and screenshots, writes the dossier.
- `serve.ts` — a tiny static server for local play.
- `vendor/makefun-game.ts` — the make.fun dossier library, as the kit ships it.
- `game/` — the game itself, plain ES modules, one clear job per file:
  - `index.html` — the shell: canvas, status line, module entry.
  - `src/config.js` — every tuning number and colour.
  - `src/random.js` — the seeded generator behind repeatable scenes.
  - `src/physics.js` — gravity, integration, circle tests.
  - `src/world.js` — the rules and state: ship, planets, motes, comets, Nova,
    combo, quota, levels.
  - `src/render.js` — drawing only: sky, planets, HUD, panels.
  - `src/input.js` — keyboard and pointer, held keys and one-shot presses.
  - `src/audio.js` — every sound synthesised with WebAudio; no sound files.
  - `src/shots.js` — the deterministic screenshot scenes (`?shot=…&seed=…`).
  - `src/main.js` — boot, the fixed-step loop, screens, best score.
- `screenshots/` — the title, play, game-over and Nova frames, real renders of
  the game's own code in Chrome (see `shots.json` for the scenes).
- `shots.json` — which scene each screenshot is.

## License

MIT. See [LICENSE](LICENSE).
