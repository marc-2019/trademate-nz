#!/usr/bin/env node
/**
 * check-routes.mjs — verifies every internal href in the web app maps
 * to a real Next.js page. Catches the "aspirational nav link" class of
 * bug that caused PIR 2026-04-27-bossboard-dashboard-404s.
 *
 * Scans:
 *   - <Link href="..."> JSX
 *   - <a href="..."> JSX (when starts with /)
 *   - router.push("..."), router.replace("..."), router.prefetch("...")
 *   - href="/foo" template-literal forms with no interpolation
 *
 * Validates against:
 *   - apps/web/src/app/**\/page.tsx
 *   - Next.js conventions: (group) routes are transparent in URL,
 *     [param] matches any single segment, [...slug] matches any tail.
 *
 * Skips: external URLs, mailto:, tel:, anchors (#...), data:, blob:,
 * dynamic hrefs that include ${...} interpolation (can't statically
 * verify those — they're checked at runtime by the nav-walk e2e).
 *
 * Usage:
 *   node scripts/check-routes.mjs
 *
 * Exit code: 0 if all hrefs route, 1 if any dead.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, join, extname } from 'node:path';

// Recursive walk that respects ignore prefixes — avoids the glob/minimatch
// ESM-vs-CJS dep dance and has no external dependencies.
function walk(dir, { ignoreDirs = [] } = {}) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join(cur, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (ignoreDirs.includes(name)) continue;
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, '..');
const APP_DIR = resolve(WEB_ROOT, 'src/app');

// 1. Build the set of routes that exist by walking app/ for page.tsx.
function appPathToRoute(absPath) {
  // /home/marc/.../apps/web/src/app/(dashboard)/invoices/[id]/page.tsx
  // -> /invoices/[id]
  let route = '/' + relative(APP_DIR, absPath);
  route = route.replace(/\/page\.[tj]sx?$/, '');
  // Drop (group) segments — they don't appear in URL.
  route = route.replace(/\/\([^/]+\)/g, '');
  // Root index page.
  if (route === '' || route === '/') return '/';
  return route;
}

function routeMatcher(route) {
  // Convert /invoices/[id] -> /^\/invoices\/[^/]+$/
  // Convert /docs/[...slug] -> /^\/docs\/.+$/
  const pattern = route
    .split('/')
    .map((seg) => {
      if (seg.startsWith('[...') && seg.endsWith(']')) return '.+';
      if (seg.startsWith('[') && seg.endsWith(']')) return '[^/]+';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp('^' + pattern + '$');
}

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const allFiles = walk(resolve(WEB_ROOT, 'src'), { ignoreDirs: ['node_modules', '.next'] });
const pageFiles = allFiles.filter((f) => /\/page\.(ts|tsx|js|jsx)$/.test(f));
const routes = pageFiles.map(appPathToRoute);
const matchers = routes.map(routeMatcher);

const sourceFiles = allFiles.filter((f) => SOURCE_EXTS.has(extname(f)));

const HREF_PATTERNS = [
  // <Link href="/foo">  or  <Link href={"/foo"}> or <a href="/foo">
  /\b(?:Link|a)\s+[^>]*?\bhref\s*=\s*(?:"([^"]+)"|\{\s*["'`]([^"'`]+)["'`]\s*\})/g,
  // router.push("/foo") / router.replace / router.prefetch
  /\brouter\.(?:push|replace|prefetch)\s*\(\s*["'`]([^"'`]+)["'`]/g,
  // redirect("/foo") from next/navigation
  /\bredirect\s*\(\s*["'`]([^"'`]+)["'`]/g,
];

const dead = [];
const SKIP = (h) =>
  !h ||
  h.startsWith('http://') ||
  h.startsWith('https://') ||
  h.startsWith('mailto:') ||
  h.startsWith('tel:') ||
  h.startsWith('#') ||
  h.startsWith('data:') ||
  h.startsWith('blob:') ||
  h.startsWith('javascript:') ||
  h.includes('${'); // template-literal interpolation — can't statically verify

const PUBLIC_PASSTHROUGH = new Set(['/_next', '/api', '/favicon.ico', '/robots.txt', '/sitemap.xml']);

function isInternalRoute(href) {
  if (SKIP(href)) return false;
  if (!href.startsWith('/')) return false;
  // Strip query string + fragment before matching.
  const path = href.split('?')[0].split('#')[0];
  // Skip /_next, /api/* (handled by route handlers, not page.tsx), and static assets.
  for (const prefix of PUBLIC_PASSTHROUGH) {
    if (path === prefix || path.startsWith(prefix + '/')) return false;
  }
  return true;
}

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of HREF_PATTERNS) {
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(text)) !== null) {
      const href = m[1] || m[2];
      if (!isInternalRoute(href)) continue;
      const path = href.split('?')[0].split('#')[0];
      const routed = matchers.some((re) => re.test(path));
      if (!routed) {
        dead.push({ file: relative(WEB_ROOT, file), href });
      }
    }
  }
}

// 3. Report.
if (dead.length === 0) {
  console.log(`check-routes: OK (${routes.length} routes, all hrefs map to a page)`);
  process.exit(0);
}

console.error(`check-routes: ${dead.length} dead href(s) found:\n`);
for (const { file, href } of dead) {
  console.error(`  ${file}  ->  ${href}`);
}
console.error('\nKnown routes:');
for (const r of routes.sort()) console.error(`  ${r}`);
console.error('\nFix: either add a page.tsx for the href, remove the link, or update the href.');
process.exit(1);
