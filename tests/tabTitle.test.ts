import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORLD_IDS } from '../src/level/worlds';
import { TAB_TITLES } from '../src/ui/tabTitle';

describe('animated tab titles', () => {
  it('gives every world its own show that settles on the game name', () => {
    const shows = WORLD_IDS.map((id) => TAB_TITLES[id]);
    for (const frames of shows) {
      expect(frames.length).toBeGreaterThan(5);
      expect(frames[frames.length - 1][0]).toContain('Cake Walk');
    }
    expect(new Set(shows.map((f) => f.map(([t]) => t).join('|'))).size).toBe(WORLD_IDS.length);
  });

  it('keeps frames short enough for a narrow tab and slow enough to read', () => {
    for (const id of WORLD_IDS) {
      for (const [text, ms] of TAB_TITLES[id]) {
        expect(text.trim()).toBe(text);
        expect([...text].length).toBeLessThanOrEqual(24);
        expect(ms).toBeGreaterThanOrEqual(150);
      }
    }
  });

  it('leaves the static HTML title for crawlers and link previews', () => {
    expect(readFileSync('index.html', 'utf8')).toMatch(/<title>Cake Walk: [^<]+<\/title>/);
  });
});
