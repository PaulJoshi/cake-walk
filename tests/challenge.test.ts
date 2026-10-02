import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { challengePage, handle } from '../api/challenge';
import { WORLDS, WORLD_IDS } from '../src/level/worlds';
import {
  CHALLENGE_WORLD_NAMES,
  challengePath,
  challengeRound,
  parseChallenge,
  type Challenge,
} from '../src/score/challenge';

const html = readFileSync('index.html', 'utf8');
const ORIGIN = 'https://cake-walk-two.vercel.app';
const daily: Challenge = {
  world: 'pirate',
  seed: '2026-10-02',
  name: 'Wobbly Otter',
  score: 18402,
};

const parse = (path: string) => parseChallenge(new URL(path, ORIGIN).searchParams);

function meta(page: string, attr: 'name' | 'property', key: string): string | undefined {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`);
  return re.exec(page.replace(/\s+/g, ' '))?.[1];
}

describe('challenge links', () => {
  it('round-trips through the link', () => {
    expect(challengePath(daily)).toBe(
      '/c?world=pirate&seed=2026-10-02&by=Wobbly+Otter&score=18402',
    );
    expect(parse(challengePath(daily))).toEqual(daily);
    const random: Challenge = { world: 'space', seed: 'K3J9QZ', name: 'Ann', score: 0 };
    expect(parse(challengePath(random))).toEqual(random);
  });

  it('names the round the way the game does', () => {
    expect(challengeRound(daily)).toBe('Pirate Ship · Daily Challenge 2026-10-02');
    expect(challengeRound({ ...daily, world: 'space', seed: 'K3J9QZ' })).toBe(
      'Space Station · Random #K3J9QZ',
    );
    for (const id of WORLD_IDS) expect(CHALLENGE_WORLD_NAMES[id]).toBe(WORLDS[id].name);
  });

  it('refuses anything malformed', () => {
    const ok = 'world=pirate&seed=ABC&by=Ann&score=100';
    expect(parse(`/c?${ok}`)).not.toBeNull();
    for (const bad of [
      ok.replace('pirate', 'moon'),
      ok.replace('ABC', 'A<b>'),
      ok.replace('ABC', 'X'.repeat(17)),
      ok.replace('Ann', '!'),
      ok.replace('100', '-5'),
      ok.replace('100', '1e5'),
      ok.replace('100', '99999999'),
      'world=pirate&seed=ABC&by=Ann',
    ]) {
      expect(parse(`/c?${bad}`)).toBeNull();
    }
  });

  it('cleans the name like the scoreboard does', () => {
    expect(parse('/c?world=wedding&seed=A&by=%3Cscript%3EBob&score=1')?.name).toBe('scriptBob');
  });
});

describe('challenge link preview', () => {
  const page = challengePage(html, daily, ORIGIN);

  it('names the challenger and the score to beat', () => {
    const title = 'Wobbly Otter scored 18,402 in Cake Walk. Can you beat it?';
    expect(meta(page, 'property', 'og:title')).toBe(title);
    expect(meta(page, 'name', 'twitter:title')).toBe(title);
    expect(page).toContain(`<title>${title}</title>`);
    expect(meta(page, 'property', 'og:description')).toContain('Daily Challenge 2026-10-02');
    expect(meta(page, 'name', 'robots')).toBe('noindex, follow');
    expect(meta(page, 'property', 'og:url')).toBe(
      ORIGIN + challengePath(daily).replace(/&/g, '&#38;'),
    );
  });

  it('shows the challenged world, with an image that ships', () => {
    for (const id of WORLD_IDS) {
      const p = challengePage(html, { ...daily, world: id }, ORIGIN);
      const img = meta(p, 'property', 'og:image')!;
      expect(img).toBe(`${ORIGIN}/challenge-${id}.png`);
      expect(meta(p, 'name', 'twitter:image')).toBe(img);
      expect(readFileSync(`public/challenge-${id}.png`).length).toBeGreaterThan(1000);
    }
  });

  it('keeps the rest of the page, so the game still loads', () => {
    expect(page).toContain('<script type="module" src="/src/main.ts"></script>');
    expect(page.length).toBeGreaterThan(html.length - 400);
  });

  it('serves the page for a good link and the plain game otherwise', async () => {
    const ok = handle(new Request(ORIGIN + challengePath(daily)), html);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('Wobbly Otter scored');
    const bad = handle(new Request(`${ORIGIN}/c?world=moon`), html);
    expect(bad.status).toBe(302);
    expect(bad.headers.get('Location')).toBe('/');
    // Without the bundled page the game still gets the challenge, just no custom preview.
    const bare = handle(new Request(ORIGIN + challengePath(daily)), null);
    expect(bare.headers.get('Location')).toBe(challengePath(daily).replace(/^\/c/, '/'));
  });
});
