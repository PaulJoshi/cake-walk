# 🎂 CAKE WALK

> **60 seconds to save the wedding.** Hold to walk. Move to balance.

<p align="center"><img src="docs/title-screen.png" alt="Cake Walk title screen: pixel-art wedding reception with the CAKE WALK logo, the menu buttons and three square world pictures (wedding cake, pirate ship, space station)" width="720"/></p>

```text
     ___________
    '._==_==_=_.'     .------------------------------------.
    .-\:      /-.     |                                    |
   | (|:. 1st |) |    |          * W I N N E R *           |
    '-|:.     |-'     |                                    |
      \::.    /       |          TINKERHUB  KOCHI          |
       '::. .'        |      DEVIN EVENT - 1ST PRIZE       |
         ) (          |                                    |
       _.' '._        |  7 TIERS . 60 SECONDS . 0 DROPPED  |
      '-------'       '------------------------------------'
```

<p align="center"><b>🏆 1st prize winner at the <a href="http://luma.com/fivtwyix">TinkerHub x Devin event in Kochi</a> 🏆</b><br/>
<i>Seven tiers, sixty seconds, and not a single cake dropped.</i></p>

You are a nervous waiter carrying a 7-tier wedding cake from the kitchen to the cake table
across a chaotic reception. The best man's toast happens at 0:00. If the cake isn't on the table
by then, or if it falls, the wedding is ruined.

Made for the **"60 Seconds to Save It"** game jam (Night Out with Devin): one minute, one level,
two inputs, a clear win or loss, and a cake that almost falls a lot but rarely actually does.

![Gameplay GIF placeholder](docs/gameplay.gif)

<!-- Record a GIF of a run (e.g. with ?bot=1) and save it as docs/gameplay.gif -->

**Play:** <https://cake-walk-two.vercel.app>

## Controls

Both inputs act on the same horizontal axis: speeding up tips the cake **back**, stopping tips it
**forward**. Slide the tray under the lean.

|             | Desktop                                               | Mobile                                                                |
| ----------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| **Walk**    | Hold `Space` / `W` / `↑` or the left mouse button     | Touch and hold the right half of the screen                           |
| **Balance** | Move the mouse left/right, or `A`/`D` / `←`/`→`       | Tilt the phone (tap _Enable tilt controls_), or drag on the left half |
| Retry       | `R`                                                   | _Retry_ button                                                        |
| Pause       | `P` / `Esc` (also automatic when the tab loses focus) | ❚❚ button                                                             |
| Mute        | `M`                                                   | ♪ button                                                              |
| Fullscreen  | `F`                                                   | ⛶ button                                                              |

Stop inside the glowing zone in front of the cake table, slow and upright, and hold still for
half a second to set the cake down.

## Worlds

Pick a world on the title screen with the three square picture buttons under the menu (or
`←` / `→` on a keyboard). The choice is remembered, and `?world=pirate` or `?world=space` links
straight to it.

### Wedding Hall (the original)

1. **Kitchen doors** - calm tutorial zone with floating hints.
2. **Champagne spill** - slippery floor: stopping takes ~3x longer and you get random slips.
3. **Dancing Uncle** - hip-bumps into your path on a (seeded) rhythm. Wait for the gap or power through.
4. **Roomba** - patrols an ellipse; running into it makes you hop.
5. **Toddler Dash** - once you cross the trigger a toddler sprints across, aiming at you. Stop in time!
6. **Grandma with a walker** - blocks the lane for a few seconds. Patience, dear.
7. **Bass Drop** - at 20 s remaining the DJ counts 3-2-1 and drops the bass (wherever you are).
8. **Bouquet Toss** - the bouquet lands on the top tier, raising the centre of mass.
9. **Conga Line** - dancers cross the lane in sequence; each one that overlaps bumps you.
10. **Cake Table** - stop, hold still, deliver.

### Pirate Ship

The same 60-second walk across two ships lashed together at sunset, to the captain's table.

1. **Galley** - calm tutorial zone.
2. **Rolling deck** - the ship rocks on the swell the whole way, nudging the cake one way, then
   the other. Watch the horizon tilt.
3. **Loose cannonballs** - roll from rail to rail with the swell. Running into one makes you hop.
4. **Swinging rum barrel** - swings from a crane at cake height and clips the top tiers (a
   shorter cake ducks under it).
5. **Walk the plank** - a springy gangplank over shark water. Every step bounces it; cross slowly
   or the bounces throw the cake about.
6. **The captain's parrot** - perches on the top tier, flaps about, then flies off.
7. **Kraken** - a tentacle bursts through the deck and blocks the way, then slams the deck as it
   sinks. Wait at a respectful distance.
8. **Rogue wave** - at about 20 s left the lookout rings 3-2-1 and a wave breaks over the rail,
   leaving the deck slippery for a few seconds.
9. **Captain's table** - stop, hold still, deliver.

### Space Station

An astronaut is marrying an alien on the observation deck. Carry the cake there from the docking
bay, past windows full of planets, while the station does its best to stop you.

1. **Docking bay** - calm tutorial zone.
2. **Moving walkway** - a conveyor belt that speeds you up. Getting on and off jolts the tray,
   so step on gently.
3. **Laser security gate** - a beam that blinks on and off. Get zapped and you hop. Watch the
   warning flicker and time your crossing.
4. **Gravity glitch** - the gravity generator cycles normal, 30%, normal, heavy. In low gravity
   the cake barely feels the tray; in heavy gravity every lean falls twice as fast. The sign
   overhead and the floor colour tell you which is coming.
5. **Teleporter pad** - beams you (and the cake) further down the corridor in one jump. The
   cake arrives a little shaken.
6. **Flying saucer** - parks outside and points its tractor beam at the cake, tugging it side
   to side and making it lighter. Keep walking.
7. **Meteor shower** - at about 42 s left the klaxon counts 3-2-1, meteors pound the hull from
   alternating sides, and the last one punches a hole that sucks the cake towards space until
   the shutters slam. (The saucer flees as soon as the alarm starts.)
8. **Observation deck** - stop, hold still, deliver.

Every obstacle telegraphs itself about a second ahead with a `!` bubble or animation.

### Modes and seeds

- **Daily Challenge** - everyone gets the same variation for today's date (`YYYY-MM-DD`).
- **Random** - a random seed every round.
- `?seed=anything` forces a seed (great for replaying a friend's run).

The layout is fixed; the seed varies the uncle's rhythm, the Roomba's route, the toddler's
delay, grandma's patience, the bass-drop direction, the bouquet's landing offset and the conga
timing. On the ship it varies the swell, where the cannonballs, barrel, plank and kraken sit,
the barrel's swing, how long the parrot stays and when the wave breaks. On the station it varies
the walkway's length and speed, the laser's rhythm, the gravity cycle, how far the teleporter
throws you, the saucer's sway and the meteors' count, timing and first side.

### Winning, losing, scoring

- **Win:** cake set down before 0:00 with at least 4 tiers.
- **Lose:** the tower topples (_"The cake has left the building."_), fewer than 4 tiers remain
  (_"That's not a wedding cake. That's a cupcake."_), or time runs out (_"The best man toasted
  an empty table."_).
- **Every try scores**, win or lose, with no ceiling. The score adds up:
  - **Distance** up to 3,000 for how far you got, and **Cargo** 500 per tier carried the whole
    way (a tier lost halfway keeps half).
  - **Delivery** on a win: 2,000 + 1,000 per tier delivered, plus **Pace** of 100 per second
    left (a loss earns a little pace too, scaled by how far it got).
  - **Poise** up to 2,000 for a level cake (halved at an average lean of 6°), **Clutch** 250
    per save (recovering from a lean past 30° without toppling), minus **Bumps** for every hit
    (up to 200 by strength) and spill skid (40).

  So two runs that end at the same spot still score differently. The parts are on the results
  card; the formula is `src/score/formula.ts` and its constants live in `tuning.ts`.

- **Grades:** S = 7 tiers and ≥ 15 s left, A = 6+, B = 5, C = 4, F = loss.
- **Personal best:** one per world (Daily Challenge and Random share it), kept in IndexedDB with
  the player's name and id. The title shows it next to a link to the scoreboard.
- **Scoreboard:** top 10 per world, this week (ISO week, UTC) and all time. Each player gets a
  random name (e.g. `WobblyOtter42`) that they can change under **Controls** or on the
  scoreboard. See [Scoreboard](#scoreboard) for how it is stored.
- **Share** sends a score card (the final frame plus the score) through the Web Share API, copies
  it to the clipboard on desktop, or saves it, along with text like
  `🎂 CAKE WALK — Daily Challenge 2026-09-30 — 19,880 pts — Grade S — 7/7 tiers — 17.3s left`.

## Running locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script              | What it does                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                                                           |
| `npm run build`     | Type-check and build to `dist/`                                                           |
| `npm run preview`   | Serve the production build                                                                |
| `npm test`          | Vitest unit tests + the 30-seed headless bot run                                          |
| `npm run lint`      | ESLint + Prettier check                                                                   |
| `npm run typecheck` | `tsc --noEmit` (strict)                                                                   |
| `npm run e2e`       | Playwright smoke test against the built site (run `npx playwright install chromium` once) |

### Debug tools

- `?debug=1` - overlay with FPS, θ, ω, L, aTray, per-tier slides, hitboxes, block line and the
  seed. Keys `1`-`9`, `0` skip to each zone.
- `?bot=1` - the autopilot plays the real round (handy for demos and recording GIFs).
- Every gameplay constant lives in [`src/game/tuning.ts`](src/game/tuning.ts), commented.

## How it works

- **Vite + strict TypeScript + Canvas 2D.** No engine, no framework, no runtime dependencies.
  The whole game is ~30 KB gzipped.
- **Fixed 120 Hz simulation** with an accumulator; rendering every animation frame; frame dt
  clamped to 100 ms. The back buffer matches the window's aspect ratio, so the game fills every
  screen: landscape shows the full 270 px scene height and a wider slice of the hall, portrait
  shows 300 px across with more wall above and floor below. Integer-scaled when that is close
  to the ideal fit, `imageSmoothingEnabled = false`, devicePixelRatio aware.
- **Physics** (`src/physics/`, pure and unit-tested): the cake is an inverted pendulum on the
  tray, `θ'' = (G/L)·sinθ − (aTray/L)·cosθ − DAMP·ω − GLUE·θ + impulses`, with `L` recomputed
  from the tiers still standing (so losing tiers makes the cake twitchier). Each tier slides on
  the one below with a damped spring; past 45 % of the lower tier's width it falls off along with
  everything above it.
- **Input** (`src/input/`) reduces keyboard, mouse, touch and gyro into one
  `Intent { walk, trayTarget }` per tick - the simulation never sees raw input.
- **World** (`src/game/World.ts`) is completely headless, so the **autopilot**
  (`src/bot/autopilot.ts`, a PD controller on the lean plus predictive hazard gating) can play it
  in tests and in the title-screen attract mode.
- **Art** is procedural pixel art: string-array pixel maps plus palettes rendered to offscreen
  canvases at load. The cake is drawn upright offscreen and rotated with nearest-neighbour
  sampling for a crunchy pixel look.
- **Audio** is synthesized with the Web Audio API (no files): footsteps, a creak that tracks the
  lean, thumps, splats, crowd gasps, the bass drop, a fanfare, a sad trombone and a chiptune
  "Here Comes the Bride" loop that speeds up in the final 10 seconds.

### Tuning notes

The feel was tuned with headless parameter sweeps against controllers with simulated human
reaction delays:

| Constant                | Value       | Why                                                                                 |
| ----------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `G / L_SCALE`           | 135 / 2.4   | Full cake L ≈ 61 px, G/L ≈ 2.2: an unbalanced full-throttle start topples in ~2.3 s |
| `DAMP`                  | 1.0         | Low on purpose - high damping makes slow tray corrections useless                   |
| `GLUE / GLUE_ZONE`      | 9 / 8.5°    | Frosting "catch net": small wobbles self-correct, big ones don't                    |
| `ARM_COUPLING`          | 0.5         | Half the walking jolt reaches the tray                                              |
| `TRAY_SPEED / RESPONSE` | 60 px/s / 7 | Smooth tray = forgiving of late, jerky corrections                                  |
| `SLIDE_GAIN`            | 4.1         | Top tier slides off after a sustained ~22° lean                                     |
| `TOPPLE_ANGLE`          | 40°         | Whole cake falls                                                                    |

A naive "hold walk and ignore the tray" run always topples; a tray controller with a 0.3 s
reaction delay still wins. The perfect bot wins all 30 test seeds with 7 tiers in 35.5-37.8 s
(22+ s to spare).

## Tests

- **Unit (Vitest):** pendulum stability at rest, toppling past the limit, tiers above a fallen
  tier are removed with it, seeded RNG determinism, outcomes (win/topple/cupcake/timeout),
  scoring parts and grades, scoreboard sanity checks against real rounds, the scoreboard API
  (against an in-memory Redis), the IndexedDB profile, share text, timer formatting.
- **Bot:** the autopilot runs the full simulation headlessly on 30 seeds and must win each with
  ≥ 5 tiers in under 55 s. If it can't, re-tune the level, not the bot.
- **Smoke (Playwright):** loads the built site, starts a game, holds walk for 3 s, and asserts no
  console errors and a decreasing timer.
- **CI:** GitHub Actions runs install, lint, typecheck, test and build on every push and PR.

## Deploying to Vercel

The repo deploys with zero configuration beyond importing it. `vercel.json` pins the Vite preset,
`npm ci`, `npm run build`, output `dist`, SPA-safe rewrites and immutable long-cache headers for
`/assets/*`.

1. Go to <https://vercel.com/new> and import the `cake-walk` GitHub repository.
2. Vercel detects **Vite**; leave the defaults (build `npm run build`, output `dist`).
3. Click **Deploy**. Every push to `main` then deploys to production, and PRs get previews.

Or from the CLI:

```bash
npx vercel@latest        # first run links the project
npx vercel@latest --prod
```

### Scoreboard

`api/scores.ts` is a Vercel Function backed by a free [Upstash Redis](https://upstash.com)
database. Until the database is connected it answers 503 and the game simply hides the
scoreboard; personal bests always work offline.

One-time setup: in the Vercel project open **Storage → Create Database → Upstash for Redis**
(free plan) and connect it to the project. That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`
(plain `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` work too). Redeploy.

- Only the top 100 per board are kept (`cw:all:<world>` and `cw:week:<week>:<world>` sorted
  sets, plus a `cw:names` hash). Weekly boards expire 40 days after their last write.
- Players are stored by a SHA-256 tag of a secret id that stays in their browser.
- The server range-checks the round stats, recomputes the score from them (a hand-edited score is
  refused), ignores runs faster than the fastest plausible win, and limits each IP to 20 writes
  a minute. It can't stop a determined cheater; remove a bad entry with `ZREM` in the Upstash
  console.
- Autopilot (`?bot=1`) and debug (`?debug=1`) rounds are never recorded.

### Link previews and search

`index.html` carries the Open Graph and Twitter tags that WhatsApp, iMessage, Slack, Discord and
X read for link previews, plus a canonical URL and `VideoGame` structured data for search engines.
`public/` holds the share image (`og-image.png`, 1200×630), icons, `site.webmanifest`,
`robots.txt` and `sitemap.xml`. These use the absolute production URL
`https://cake-walk-two.vercel.app`; if the domain changes, update it in `index.html`,
`robots.txt` and `sitemap.xml`.

## License

[MIT](LICENSE)
