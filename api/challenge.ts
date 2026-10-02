// Challenge links (/c?world=...&seed=...&by=...&score=...): serve the game's own index.html
// with link-preview tags that name the challenger and the score to beat, so a link pasted
// into a chat previews as a challenge. The game reads the same parameters once it loads.
//
// vercel.json rewrites /c here and bundles dist/index.html with this function. If the page
// can't be read, the link redirects to the game with the challenge still in the query.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CHALLENGE_WORLD_NAMES,
  challengePath,
  challengeRound,
  parseChallenge,
  type Challenge,
} from '../src/score/challenge.js';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let page: string | null = null;

function loadPage(): string | null {
  try {
    page ??= readFileSync(join(process.cwd(), 'dist/index.html'), 'utf8');
  } catch {
    /* not bundled */
  }
  return page;
}

/** Replace a <meta name|property="key" content="..."> value (the tag may span lines). */
function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  return html.replace(re, (_, a: string, b: string) => `${a}${esc(value)}${b}`);
}

/** The game's page with its preview tags rewritten for this challenge. */
export function challengePage(html: string, c: Challenge, origin: string): string {
  const pts = Math.round(c.score).toLocaleString('en-US');
  const title = `${c.name} scored ${pts} in Cake Walk. Can you beat it?`;
  const desc = `Same round, same obstacles: ${challengeRound(c)}. Hold to walk, move to balance and get the cake to the table before the toast. Free, in your browser.`;
  const image = `${origin}/challenge-${c.world}.png`;
  const alt = `Cake Walk challenge in the ${CHALLENGE_WORLD_NAMES[c.world]}: can you beat the score?`;
  const url = origin + challengePath(c);
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  out = setMeta(out, 'name', 'description', desc);
  out = setMeta(out, 'name', 'robots', 'noindex, follow');
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'property', 'og:title', title);
  out = setMeta(out, 'name', 'twitter:title', title);
  out = setMeta(out, 'property', 'og:description', desc);
  out = setMeta(out, 'name', 'twitter:description', desc);
  out = setMeta(out, 'property', 'og:image', image);
  out = setMeta(out, 'property', 'og:image:secure_url', image);
  out = setMeta(out, 'name', 'twitter:image', image);
  out = setMeta(out, 'property', 'og:image:alt', alt);
  out = setMeta(out, 'name', 'twitter:image:alt', alt);
  return out;
}

/** The whole function, with the page injectable for tests. */
export function handle(req: Request, html: string | null): Response {
  const url = new URL(req.url);
  const c = parseChallenge(url.searchParams);
  if (!c || !html) {
    // No usable challenge: the plain game. No page: the game reads the challenge itself.
    const to = c ? challengePath(c).replace(/^\/c/, '/') : '/';
    return new Response(null, { status: 302, headers: { Location: to } });
  }
  return new Response(challengePage(html, c, url.origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=86400',
    },
  });
}

export function GET(req: Request): Response {
  return handle(req, loadPage());
}
