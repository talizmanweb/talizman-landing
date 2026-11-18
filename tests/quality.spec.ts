// doczidev quality gate: the browser-only items of the launch checklist.
// UX-05 horizontal scroll · SEC-03 console errors · A11Y-04 axe (incl. contrast) · LEG-01 no tracking before consent.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

// Every page in the sitemap; falls back to "/" before the first build.
function routes(): string[] {
  try {
    const xml = fs
      .readdirSync('dist')
      .filter((f) => /^sitemap-\d+\.xml$/.test(f))
      .map((f) => fs.readFileSync(`dist/${f}`, 'utf8'))
      .join('');
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    return paths.length ? paths : ['/'];
  } catch {
    return ['/'];
  }
}

const widths = [320, 375, 390, 768, 1024, 1440];

// Optional theme switch from doczidev.json: { "theme": { "storageKey": "…", "values": ["light", "dark"] } }.
// axe then runs once per theme; without it, once in the default theme.
const profile = (() => {
  try {
    return JSON.parse(fs.readFileSync('doczidev.json', 'utf8'));
  } catch {
    return {};
  }
})();
const themes: (string | null)[] = profile.theme?.values ?? [null];
const trackers =
  /google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|clarity\.ms|hotjar|linkedin\.com\/px|tiktok/;

for (const route of routes()) {
  test.describe(route, () => {
    test('nincs vízszintes scroll (UX-05)', async ({ page }) => {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
      }
    });

    test('nincs console error/warning (SEC-03)', async ({ page }) => {
      const messages: string[] = [];
      page.on(
        'console',
        (m) => ['error', 'warning'].includes(m.type()) && messages.push(`${m.type()}: ${m.text()}`),
      );
      page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
      page.on(
        'response',
        (r) =>
          r.status() >= 400 &&
          r.url().startsWith(page.url().split('/').slice(0, 3).join('/')) &&
          messages.push(`${r.status()}: ${r.url()}`),
      );
      await page.goto(route, { waitUntil: 'networkidle' });
      expect(messages).toEqual([]);
    });

    for (const theme of themes) {
      test(`axe WCAG 2.2 AA (A11Y-04)${theme ? ` · ${theme}` : ''}`, async ({ page }) => {
        if (theme)
          await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [profile.theme.storageKey, theme]);
        await page.goto(route);
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.length} elem – ${v.help}`)).toEqual([]);
      });
    }

    test('nincs tracking consent előtt (LEG-01)', async ({ page, context }) => {
      const hits: string[] = [];
      page.on('request', (r) => trackers.test(r.url()) && hits.push(r.url()));
      await page.goto(route, { waitUntil: 'networkidle' });
      const cookies = (await context.cookies())
        .map((c) => c.name)
        .filter((n) => /^(_ga|_gid|_fbp|_gcl|_clck|_clsk|_hj)/.test(n));
      expect([...hits, ...cookies]).toEqual([]);
    });
  });
}
