import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const SITE = 'https://cake-walk-two.vercel.app';

function meta(attr: 'name' | 'property', key: string): string | undefined {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`);
  return re.exec(html.replace(/\s+/g, ' '))?.[1];
}

describe('link previews and search metadata', () => {
  it('points every share image at a file that ships, by absolute URL', () => {
    for (const url of [meta('property', 'og:image'), meta('name', 'twitter:image')]) {
      expect(url).toMatch(new RegExp(`^${SITE}/`));
      expect(existsSync(`public${url!.slice(SITE.length)}`)).toBe(true);
    }
  });

  it('has a title, description and large-image card', () => {
    expect(meta('property', 'og:title')).toBeTruthy();
    expect(meta('property', 'og:description')).toBeTruthy();
    expect(meta('name', 'description')!.length).toBeLessThanOrEqual(160);
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('uses one production URL across canonical, robots and sitemap', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE}/" />`);
    expect(readFileSync('public/robots.txt', 'utf8')).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain(`<loc>${SITE}/</loc>`);
  });

  it('has valid structured data and manifest', () => {
    const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)![1];
    expect(JSON.parse(ld)['@type']).toBe('VideoGame');
    const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true);
  });
});
