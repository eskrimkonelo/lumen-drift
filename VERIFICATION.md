# Verification — Lumen Drift (best-game-01)

Checked 17 Nov 2026, in this session, before handoff. No GitHub repo, push or
submit was done here — those are the parent agent's steps.

## The game

**Lumen Drift** — an original orbital lantern-ship arcade game, written from
scratch (no starter code, no commercial clone). Pilot a lantern-ship through a
night sky of slowly drifting planets: gravity bends your path, gold star-motes
fill each level's quota, violet embers charge the Nova, red comets (and the
planets themselves) cost a lantern on contact. Chain quick pickups for a combo
up to ×5; fire the Nova (Space, meter full) to clear every comet and pull
nearby motes in. 3 lanterns, quota per level, shard comets from level 3,
pause, mute, best score in localStorage, title → play → level clears →
game over → restart. Sound is all synthesised WebAudio; the game makes no
network request and loads nothing from outside `game/`.

## Files (repo root `~/workspace/makefun-game/repo/`)

| File | Lines | Job |
| --- | --- | --- |
| `main.ts` | 43 | Entrypoint: copies game/ + screenshots/, writes dossier.json |
| `serve.ts` | 59 | Tiny static server for local play (`:8080`) |
| `vendor/makefun-game.ts` | 1203 | Kit's dossier library, byte-identical (sha256 `dc671875…`) |
| `game/index.html` | 19 | Shell: canvas, status line, module entry (823 bytes) |
| `game/src/config.js` | 131 | Every tuning number and colour |
| `game/src/random.js` | 12 | Seeded RNG (mulberry32) |
| `game/src/physics.js` | 53 | Gravity, integration, circle tests |
| `game/src/world.js` | 507 | Rules and state: ship, planets, motes, comets, Nova, combo, quota |
| `game/src/render.js` | 439 | Drawing only: sky, planets, HUD, panels |
| `game/src/input.js` | 114 | Keyboard + pointer, held keys and one-shot presses |
| `game/src/audio.js` | 172 | Every sound synthesised with WebAudio; no sound files |
| `game/src/shots.js` | 134 | Deterministic screenshot scenes (`?shot=…&seed=…`) |
| `game/src/main.js` | 173 | Boot, fixed-step loop, screens, best score |
| `README.md` | 64 | Badges + how to play/run/layout |
| `shots.json` | — | The 4 shot scenes (seed 7) |
| `LICENSE` | 21 | MIT |

Game source written by the agent in this session (all files authored via
write/edit calls, revised across several messages); only
`vendor/makefun-game.ts` is a byte-identical copy from the kit, as required.

## Gate checks (all pass)

| Check | Result |
| --- | --- |
| `main.ts` twice → output byte-identical | PASS (`diff -r` clean on two runs) |
| `dossier.json` byte-matches independent `buildDossier` rebuild | PASS (374,123 bytes, ≤1.5 MiB) |
| `game_files` | PASS — 10 files + 2 dirs = 12 entries (≤993), 62,831 bytes total (≤48 MiB), `index.html` 823 bytes (≤1 MiB) |
| `references` | PASS — no `http(s)://` or out-of-`game/` path in `game/` (grep clean); all scripts are relative ES modules; no fetch/Worker/font/image loads |
| `screenshots` | PASS — 4 JPEGs, each 1280×720, 51–65 KiB (≤256 KiB, long ≤1280, short ≥480) |
| `js_parses` | PASS — every module parses (`node --check` on all 9 src files) |
| Output totals | 668,046 bytes, 16 files — inside `/output`'s 1,000-entry / 64 MiB caps |

Screenshots (sha256): `1-start.jpg 6a142a24…`, `2-play.jpg baf51ffa…`,
`3-end.jpg 9ce1c9ed…`, `4-nova.jpg df609b6b…`.

## Play-test in Chrome (CDP, 16/16 checks pass)

Driver: `/tmp/lumen-cdp.mjs` (Node, built-in WebSocket; Chrome 157 headless,
viewport forced 1280×720). Verified: title on load → Space starts → ArrowRight
moves the ship (x 641 → 1015) → HUD sane (3 lanterns, level 1) → P pauses and
resumes → forced hit at 1 lantern ends the game → Space restarts with score 0
and 3 lanterns → still running after 3 s → 4 screenshots render with
`window.__shotReady` → no page errors, no console errors, no external
requests (50 same-origin `file:` loads only).

Screenshots inspected visually: title panel with rules and best; play with
full HUD (score 435, level 2, quota 1/16, 2 lanterns, ×2 combo, Nova meter);
game over with score/best/level/motes and restart prompt; Nova frame with the
expanding violet ring, "NOVA! +60", ×4 combo and an emptied meter.

Two real bugs were found and fixed during testing: (1) the ship spawned
inside planet 3's drift path and was hit before the player moved — spawn and
planet anchor moved apart; (2) the Nova shot staged a frame with 0 lanterns
because the autopilot died first — the scene now retries from a fresh world
(up to 3 attempts) and captures the flash near its peak.

## Environment notes (for the parent's independent verification)

- **Chrome here is `/opt/meta-chromium/chrome` (Muse Browser 157.0.8103.81),
  not `/usr/bin/google-chrome`** — that path does not exist in this cell.
  The binary refuses to start without a WebGL domain policy: it needs
  `--hatch-webgl-allowed-domains-file=/tmp/pol3.txt` plus
  `--hatch-webgl-allowed-domains-sha256=c5c85869…` (file = header line
  `hatch-webgl-allowed-domains-v1` + sorted domains + trailing newline).
  The game uses Canvas 2D only, so the policy content is never consulted.
- **HTTP play-test is blocked by this Chrome build's Local Network Access
  check**: any navigation to `localhost`/`127.0.0.1` fails with
  `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` on the document itself, before
  any game code runs — it is environmental, not a game defect. The game was
  therefore played and screenshotted over `file://` with
  `--allow-file-access-from-files`; the local server was separately verified
  to serve `index.html` and every module with HTTP 200, and the game makes no
  network request, so serving does not change its behaviour. The server is
  still running on port 8080 for the parent's own check.
- **README badges assume the repo will be named `lumen-drift`**
  (`eskrimkonelo/lumen-drift`). If the parent creates it under another name,
  the two `rank.svg` / `reward.svg` URLs in `README.md` must be updated
  before submit.
- Nothing was pushed or submitted from here; the transcripts of this session
  are the parent's to bundle.
