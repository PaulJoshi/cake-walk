# AGENTS.md

## Commands

- Verify everything: `npm run lint && npm run typecheck && npm test && npm run build`
- Smoke test: `npm run e2e` (needs `npx playwright install chromium` once)
- Tuning sweeps: put ad-hoc Vitest files in `tests/tmp/` (git-ignored) and run with `TUNE=1 npx vitest run tests/tmp/<file>`.
- Visual check: `npm run dev`, then open `/?bot=1` (autopilot plays) or `/?debug=1` (overlay, keys 1-9/0 skip zones).

## Gotchas

- Adding dev dependencies with npm 10.9 fails with `Cannot read properties of null (reading 'edgesOut')` (vitest's optional peer graph). Use `npx -y npm@11 install -D <pkg>`; `npm ci` with the lockfile works fine on npm 10 (CI, Vercel).
- Every gameplay constant belongs in `src/game/tuning.ts`. After changing physics or obstacle constants, `tests/bot.test.ts` (30 seeds) must still pass - re-tune the level, not the bot.
- `World` must stay headless (no DOM); cosmetic randomness goes in the renderer.
