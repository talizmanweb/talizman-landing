#!/usr/bin/env node
// doczidev launch checker: the `auto` items of .claude/skills/launch-check/checklist.md.
// Zero dependencies. Static checks run against the build output; live checks need --url.
//
// Usage (from a project root):
//   node scripts/check-launch.mjs [--dist dist] [--url https://example.hu] [--preview-url https://x.vercel.app]
//                                 [--profile doczidev.json] [--skip-audit] [--out .launch/auto-report.json]
// Exit code: 1 if any check fails, otherwise 0.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// ---------- args & profile ----------
const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const distDir = path.resolve(root, args.dist ?? 'dist');
const profilePath = path.resolve(root, args.profile ?? 'doczidev.json');
const profile = fs.existsSync(profilePath) ? JSON.parse(fs.readFileSync(profilePath, 'utf8')) : {};
const site = (args.url ?? profile.site ?? '').replace(/\/$/, '');
const siteOrigin = site ? new URL(site).origin : '';
const outPath = path.resolve(root, args.out ?? '.launch/auto-report.json');

const results = [];
const add = (id, status, msg, details = []) =>
  results.push({ id, status, msg, details: details.slice(0, 15) });
const pass = (id, msg) => add(id, 'pass', msg);
const fail = (id, msg, d) => add(id, 'fail', msg, d);
const warn = (id, msg, d) => add(id, 'warn', msg, d);
const na = (id, msg) => add(id, 'na', msg);
const check = (id, problems, okMsg, failMsg, level = 'fail') =>
  problems.length ? add(id, level, failMsg, problems) : pass(id, okMsg);

if (!fs.existsSync(distDir)) {
  console.error(`Nincs build kimenet: ${distDir}. Futtasd előbb: pnpm build`);
  process.exit(2);
}

// ---------- collect files ----------
const allFiles = walk(distDir);
const rel = (f) => '/' + path.relative(distDir, f).split(path.sep).join('/');
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const jsFiles = allFiles.filter((f) => /\.(m?js)$/.test(f));
const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
const is404 = (f) => /\/(404|500)(\/index)?\.html$/.test(rel(f));
const pages = htmlFiles
  .filter((f) => !is404(f))
  .map((f) => ({ file: f, url: fileToUrl(rel(f)), html: fs.readFileSync(f, 'utf8') }));
const has = (p) => fs.existsSync(path.join(distDir, p));
const readDist = (p) => (has(p) ? fs.readFileSync(path.join(distDir, p), 'utf8') : null);

// ---------- 1. domain & basics (static) ----------
{
  const manifestName = ['site.webmanifest', 'manifest.webmanifest'].find(has);
  const missing = [];
  if (!has('favicon.ico')) missing.push('favicon.ico');
  if (!has('favicon.svg') && !allFiles.some((f) => /favicon.*\.svg$/.test(f))) missing.push('SVG favicon');
  if (!has('apple-touch-icon.png')) missing.push('apple-touch-icon.png');
  if (!allFiles.some((f) => /32x32\.png$/.test(f)) && !pages.some((p) => /sizes=["']32x32/.test(p.html)))
    missing.push('32×32 PNG');
  if (!manifestName) missing.push('site.webmanifest');
  else {
    try {
      const sizes = (JSON.parse(readDist(manifestName)).icons ?? []).map((i) => i.sizes);
      for (const s of ['192x192', '512x512']) if (!sizes.includes(s)) missing.push(`manifest ikon ${s}`);
    } catch {
      missing.push('manifest nem valid JSON');
    }
  }
  check('DOM-06', missing, 'Favicon szett teljes', 'Hiányzó favicon elemek', 'fail');

  check(
    'DOM-07',
    pages.filter((p) => !metaName(p.html, 'theme-color')).map((p) => p.url),
    'theme-color minden oldalon',
    'theme-color hiányzik',
  );

  has('404.html') || has('404/index.html')
    ? pass('DOM-08', '404 oldal létezik (státuszkód: --url)')
    : fail('DOM-08', 'Nincs 404.html a buildben');

  const canon = pages
    .map((p) => linkRel(p.html, 'canonical'))
    .filter(Boolean)
    .map((c) => new URL(c, 'https://x').pathname)
    .filter((p) => p !== '/');
  const withSlash = canon.filter((p) => p.endsWith('/')).length;
  if (!canon.length) na('DOM-05', 'Nincs aloldal canonical');
  else if (withSlash === 0 || withSlash === canon.length)
    pass('DOM-05', `Trailing slash egységes (${withSlash ? 'mindig' : 'soha'})`);
  else fail('DOM-05', 'Vegyes trailing slash a canonicalokban', canon);
}

// ---------- 2. technical SEO ----------
{
  const titles = pages.map((p) => ({ url: p.url, t: decode(tagText(p.html, 'title')) }));
  const titleProblems = [];
  for (const { url, t } of titles) {
    if (!t) titleProblems.push(`${url}: nincs title`);
    else if (/^(home|index|react app|vite \+ react|astro|untitled|document)$/i.test(t.trim()))
      titleProblems.push(`${url}: generikus "${t}"`);
    else if (t.length < 30 || t.length > 60) titleProblems.push(`${url}: ${t.length} karakter: "${t}"`);
  }
  const dupTitles = dups(titles.map((x) => x.t).filter(Boolean));
  dupTitles.forEach((t) => titleProblems.push(`duplikált: "${t}"`));
  const hardTitle = titleProblems.some((x) => /nincs title|generikus|duplikált/.test(x));
  check('SEO-01', titleProblems, 'Title-k rendben', 'Title problémák', hardTitle ? 'fail' : 'warn');

  const descs = pages.map((p) => ({ url: p.url, d: decode(metaName(p.html, 'description') ?? '') }));
  const descProblems = [];
  for (const { url, d } of descs) {
    if (!d) descProblems.push(`${url}: nincs meta description`);
    else if (d.length < 120 || d.length > 160) descProblems.push(`${url}: ${d.length} karakter`);
  }
  dups(descs.map((x) => x.d).filter(Boolean)).forEach((d) =>
    descProblems.push(`duplikált: "${d.slice(0, 60)}…"`),
  );
  check(
    'SEO-02',
    descProblems,
    'Meta description-ök rendben',
    'Description problémák',
    descProblems.some((x) => /nincs|duplikált/.test(x)) ? 'fail' : 'warn',
  );

  const canonProblems = [];
  for (const p of pages) {
    const c = linkRel(p.html, 'canonical');
    if (!c) canonProblems.push(`${p.url}: nincs canonical`);
    else if (!/^https:\/\//.test(c)) canonProblems.push(`${p.url}: nem abszolút https: ${c}`);
    else if (siteOrigin && new URL(c).origin !== siteOrigin) canonProblems.push(`${p.url}: más domain: ${c}`);
  }
  if (!siteOrigin)
    canonProblems.push('(nincs "site" a doczidev.json-ban, a domain egyezést nem ellenőriztem)');
  check(
    'SEO-03',
    canonProblems,
    'Canonicalok rendben',
    'Canonical problémák',
    canonProblems.some((x) => !x.startsWith('(')) ? 'fail' : 'warn',
  );

  const h1Problems = [],
    jumpProblems = [];
  for (const p of pages) {
    const body = stripNonContent(p.html);
    const n = (body.match(/<h1[\s>]/gi) ?? []).length;
    if (n !== 1) h1Problems.push(`${p.url}: ${n} db H1`);
    const levels = [...body.matchAll(/<h([1-6])[\s>]/gi)].map((m) => +m[1]);
    for (let i = 1; i < levels.length; i++)
      if (levels[i] > levels[i - 1] + 1) {
        jumpProblems.push(`${p.url}: h${levels[i - 1]} → h${levels[i]}`);
        break;
      }
  }
  check(
    'SEO-04',
    [...h1Problems, ...jumpProblems],
    'Egy H1 oldalanként, nincs szintugrás',
    'Címsor problémák',
    h1Problems.length ? 'fail' : 'warn',
  );

  const noAlt = [];
  for (const p of pages)
    for (const img of tags(p.html, 'img'))
      if (attr(img, 'alt') === null) noAlt.push(`${p.url}: ${attr(img, 'src')}`);
  check('SEO-05', noAlt, 'Minden img-nek van alt attribútuma (minőség: a11y reviewer)', 'Alt nélküli képek');

  const sitemapFiles = allFiles.filter((f) => /\/sitemap[^/]*\.xml$/.test(rel(f)));
  const locs = sitemapFiles.flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()),
  );
  const pageLocs = locs.filter((l) => !/sitemap[^/]*\.xml$/.test(l));
  if (!sitemapFiles.length) fail('SEO-06', 'Nincs sitemap.xml / sitemap-index.xml');
  else {
    const bad = siteOrigin ? pageLocs.filter((l) => !l.startsWith(siteOrigin)) : [];
    check(
      'SEO-06',
      bad,
      `Sitemap: ${pageLocs.length} URL (beküldés GSC/Bing: manuális)`,
      'Sitemap URL nem a saját domainen',
    );
  }
  const lastmods = sitemapFiles.flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0]),
  );
  if (!lastmods.length) na('GEO-07', 'Nincs sitemap URL');
  else {
    const without = lastmods.filter((u) => !u.includes('<lastmod>')).length;
    without
      ? warn('GEO-07', `${without}/${lastmods.length} sitemap URL-ből hiányzik a lastmod`)
      : pass('GEO-07', 'lastmod minden URL-nél');
  }

  const robots = readDist('robots.txt');
  if (!robots) fail('SEO-07', 'Nincs robots.txt');
  else {
    const p = [];
    if (!/^sitemap:\s*https?:\/\//im.test(robots)) p.push('nincs abszolút Sitemap: sor');
    const star = robotsGroup(robots, '*');
    if (star.some((l) => /^disallow:\s*\/\s*$/i.test(l)))
      p.push('User-agent: * → Disallow: / (minden tiltva!)');
    check('SEO-07', p, 'robots.txt rendben', 'robots.txt problémák');
  }

  check(
    'SEO-08',
    pages.filter((p) => /noindex/i.test(metaName(p.html, 'robots') ?? '')).map((p) => p.url),
    'Nincs noindex éles oldalon',
    'noindex éles oldalon!',
  );

  check(
    'SEO-09',
    pages.filter((p) => !/<html[^>]*\slang=["'][a-z]{2}/i.test(p.html)).map((p) => p.url),
    'lang attribútum rendben',
    'Hiányzó lang a html tagen',
  );

  if (!profile.flags?.i18n) na('SEO-10', 'Nem többnyelvű');
  else
    check(
      'SEO-10',
      pages.filter((p) => !/hreflang=["']x-default/i.test(p.html)).map((p) => p.url),
      'hreflang + x-default rendben',
      'Hiányzó hreflang/x-default',
    );

  check(
    'SEO-11',
    pages.map((p) => p.url).filter((u) => !/^[a-z0-9\-/.]*$/.test(u)),
    'URL-ek kisbetűsek, ékezet nélküliek',
    'Nem szabályos URL-ek',
  );

  const ldProblems = [],
    ldTypes = new Set();
  for (const p of pages) {
    const blocks = [
      ...p.html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    ];
    if (!blocks.length) ldProblems.push(`${p.url}: nincs JSON-LD`);
    for (const b of blocks) {
      try {
        collectTypes(JSON.parse(b[1]), ldTypes);
      } catch {
        ldProblems.push(`${p.url}: érvénytelen JSON-LD`);
      }
    }
  }
  if (![...ldTypes].some((t) => /Organization|Person|LocalBusiness|Corporation/.test(t)))
    ldProblems.push('nincs Organization/Person/LocalBusiness');
  if (!ldTypes.has('WebSite')) ldProblems.push('nincs WebSite');
  check(
    'SEO-12',
    ldProblems,
    `JSON-LD típusok: ${[...ldTypes].join(', ')}`,
    `JSON-LD hiányok (talált: ${[...ldTypes].join(', ') || '–'})`,
    ldProblems.some((x) => /érvénytelen/.test(x)) ? 'fail' : 'warn',
  );

  const thin = pages
    .filter((p) => visibleText(p.html).length < 200)
    .map((p) => `${p.url}: ${visibleText(p.html).length} karakter`);
  check(
    'SEO-14',
    thin,
    'Tartalom a statikus HTML-ben van (SSG)',
    'Kevés szöveg a statikus HTML-ben (kliens oldali render?)',
    'warn',
  );
  pass('GEO-03', 'Lásd SEO-14 (statikus HTML) + élő curl: --url');

  const gtm = pages.some((p) => /googletagmanager\.com\/gtm\.js/.test(p.html));
  if (!ldTypes.size) fail('GEO-04', 'Nincs JSON-LD a statikus HTML-ben (lásd SEO-12)');
  else
    gtm
      ? warn('GEO-04', 'GTM van az oldalon: a JSON-LD ne GTM-ből jöjjön')
      : pass('GEO-04', 'JSON-LD a HTML-ben, nincs GTM');
}

// ---------- 3. Open Graph ----------
{
  const req = ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name'];
  const missing = [],
    imgProblems = [],
    altMissing = [],
    tw = [],
    locale = [];
  for (const p of pages) {
    const m = req.filter((k) => !metaProp(p.html, k));
    if (m.length) missing.push(`${p.url}: ${m.join(', ')}`);
    const img = metaProp(p.html, 'og:image');
    if (!img) imgProblems.push(`${p.url}: nincs og:image`);
    else if (!/^https:\/\//.test(img)) imgProblems.push(`${p.url}: nem abszolút: ${img}`);
    else if (siteOrigin && img.startsWith(siteOrigin)) {
      const local = path.join(distDir, decodeURIComponent(new URL(img).pathname));
      if (fs.existsSync(local)) {
        const size = fs.statSync(local).size;
        const dim = imageSize(local);
        if (size > 1024 * 1024) imgProblems.push(`${p.url}: ${(size / 1048576).toFixed(1)} MB`);
        if (dim && (dim.w !== 1200 || dim.h !== 630))
          imgProblems.push(`${p.url}: ${dim.w}×${dim.h} (1200×630 kell)`);
      } else imgProblems.push(`${p.url}: og:image nincs a buildben: ${img}`);
    }
    if (img && !metaProp(p.html, 'og:image:alt')) altMissing.push(p.url);
    const card = metaName(p.html, 'twitter:card');
    const twm = ['twitter:title', 'twitter:description', 'twitter:image'].filter(
      (k) => !metaName(p.html, k) && !metaProp(p.html, k),
    );
    if (card !== 'summary_large_image' || twm.length)
      tw.push(`${p.url}: card=${card ?? '–'} ${twm.join(', ')}`);
    if (!metaProp(p.html, 'og:locale')) locale.push(p.url);
  }
  check('OG-01', missing, 'OG alap tagek rendben', 'Hiányzó OG tagek');
  check('OG-02', imgProblems, 'og:image rendben', 'og:image problémák');
  check('OG-03', altMissing, 'og:image:alt rendben', 'Hiányzó og:image:alt', 'warn');
  check('OG-04', tw, 'Twitter card rendben', 'Twitter card problémák');
  check('OG-05', locale, 'og:locale rendben', 'Hiányzó og:locale', 'warn');
}

// ---------- 4. GEO ----------
{
  const robots = readDist('robots.txt') ?? '';
  const retrieval = ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User'];
  const training = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'];
  const blocked = retrieval.filter((b) =>
    robotsGroup(robots, b, false).some((l) => /^disallow:\s*\/\s*$/i.test(l)),
  );
  const undecided = training.filter((b) => !new RegExp(`user-agent:\\s*${b}\\b`, 'i').test(robots));
  if (blocked.length) fail('GEO-01', 'Retrieval botok tiltva', blocked);
  else if (undecided.length)
    warn('GEO-01', 'Tanító botokról nincs explicit döntés a robots.txt-ben', undecided);
  else pass('GEO-01', 'AI bot döntések explicitek');

  const llms = readDist('llms.txt');
  if (!llms) fail('GEO-05', 'Nincs /llms.txt');
  else {
    const p = [];
    if (!/^# /m.test(llms)) p.push('nincs H1 (# Név)');
    const links = (llms.match(/\]\(https?:\/\//g) ?? []).length;
    if (links < 3) p.push(`csak ${links} abszolút link`);
    check('GEO-05', p, `llms.txt rendben (${links} link)`, 'llms.txt problémák', 'warn');
  }
}

// ---------- 5. performance ----------
{
  const lhr = ['lighthouserc.json', 'lighthouserc.cjs', 'lighthouserc.js', '.lighthouserc.json'].find((f) =>
    fs.existsSync(path.join(root, f)),
  );
  lhr
    ? pass('MON-06', `Lighthouse CI konfig: ${lhr} (futtatás: pnpm lhci)`)
    : fail('MON-06', 'Nincs lighthouserc');
  na('PERF-01', 'A Lighthouse pontszámot a `pnpm lhci` adja');

  const fmt = [],
    dims = [],
    lazyHero = [];
  for (const p of pages) {
    const main = p.html.match(/<main[\s\S]*<\/main>/i)?.[0] ?? p.html;
    const imgs = tags(p.html, 'img');
    for (const img of imgs) {
      const src = attr(img, 'src') ?? '';
      if (/\.(jpe?g|png)(\?|$)/i.test(src) && !/apple-touch|favicon|og[-_]/.test(src))
        fmt.push(`${p.url}: ${src}`);
      if (!(attr(img, 'width') && attr(img, 'height')) && !/aspect-ratio/.test(attr(img, 'style') ?? ''))
        dims.push(`${p.url}: img ${src}`);
    }
    for (const t of [...tags(p.html, 'iframe'), ...tags(p.html, 'video')])
      if (
        !(attr(t, 'width') && attr(t, 'height')) &&
        !/aspect-ratio/.test(attr(t, 'style') ?? '') &&
        !/aspect-/.test(attr(t, 'class') ?? '')
      )
        dims.push(`${p.url}: ${t.slice(0, 60)}`);
    const first = tags(main, 'img')[0];
    if (first && attr(first, 'loading') === 'lazy')
      lazyHero.push(`${p.url}: első kép lazy (${attr(first, 'src')})`);
    else if (first && attr(first, 'fetchpriority') !== 'high')
      lazyHero.push(`${p.url}: első képen nincs fetchpriority="high" (ha hero)`);
  }
  check(
    'PERF-04',
    [...fmt.map((x) => `nem AVIF/WebP: ${x}`), ...lazyHero],
    'Képformátumok és hero kép rendben',
    'Kép problémák',
    'warn',
  );
  check('PERF-05', dims, 'Minden kép/embed méretezve', 'Méret nélküli img/iframe/video (CLS)');

  const gfonts = pages.filter((p) => /fonts\.(googleapis|gstatic)\.com/.test(p.html)).map((p) => p.url);
  check('PERF-06', gfonts, 'Fontok self-hostolva', 'Google Fonts CDN (self-host kell, GDPR is)');

  const blocking = [];
  for (const p of pages) {
    const head = p.html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? '';
    for (const s of tags(head, 'script'))
      if (
        attr(s, 'src') &&
        attr(s, 'async') === null &&
        attr(s, 'defer') === null &&
        attr(s, 'type') !== 'module'
      )
        blocking.push(`${p.url}: ${attr(s, 'src')}`);
  }
  check('PERF-09', blocking, 'Nincs render-blocking script a head-ben', 'Render-blocking scriptek');
}

// ---------- 6. UX ----------
{
  const deadHref = [],
    broken = [];
  for (const p of pages) {
    for (const a of tags(p.html, 'a')) {
      const href = attr(a, 'href');
      if (href === null) continue;
      if (href === '' || href === '#') {
        deadHref.push(`${p.url}: href="${href}"`);
        continue;
      }
      if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href) && !(siteOrigin && href.startsWith(siteOrigin)))
        continue;
      const target = new URL(href, 'https://x' + p.url).pathname;
      if (!resolveDist(target)) broken.push(`${p.url} → ${href}`);
    }
  }
  check(
    'UX-08',
    [...deadHref, ...new Set(broken)],
    'Nincs halott/törött belső link',
    'Halott vagy törött linkek',
  );

  const placeholder = pages
    .filter((p) =>
      /lorem ipsum|placehold\.co|via\.placeholder|picsum\.photos|TODO:|\bFIXME\b|\[\[[^\]]*\]\]|KITÖLTENDŐ|TO BE COMPLETED/i.test(
        p.html,
      ),
    )
    .map((p) => p.url);
  check(
    'UX-11',
    placeholder,
    'Nincs lorem ipsum / placeholder (helyesírás: ux reviewer)',
    'Placeholder tartalom',
  );

  const year = new Date().getFullYear(),
    stale = [];
  for (const p of pages) {
    const m = [...visibleText(p.html).matchAll(/(?:©|\(c\)|copyright)\s*(?:\d{4}\s*[–-]\s*)?(\d{4})/gi)];
    if (m.length && Math.max(...m.map((x) => +x[1])) < year) stale.push(`${p.url}: ${m[0][0]}`);
  }
  check('UX-12', stale, 'Copyright év aktuális', `Elavult copyright év (most: ${year})`);
  na('UX-05', 'Vízszintes scroll: pnpm test:e2e (quality.spec)');
}

// ---------- 7. accessibility ----------
{
  check(
    'A11Y-03',
    pages
      .filter((p) => !/<a[^>]+href=["']#(main|content|tartalom)[^"']*["']/i.test(p.html))
      .map((p) => p.url),
    'Skip link minden oldalon',
    'Nincs skip link',
    'warn',
  );

  const lm = [],
    onclick = [];
  for (const p of pages) {
    const miss = ['header', 'nav', 'main', 'footer'].filter(
      (t) =>
        !new RegExp(`<${t}[\\s>]`, 'i').test(p.html) &&
        !new RegExp(
          `role=["']${t === 'header' ? 'banner' : t === 'footer' ? 'contentinfo' : t === 'nav' ? 'navigation' : 'main'}`,
          'i',
        ).test(p.html),
    );
    if (miss.length) lm.push(`${p.url}: ${miss.join(', ')}`);
    if (/<(div|span)[^>]*\sonclick=/i.test(p.html)) onclick.push(p.url);
  }
  check(
    'A11Y-05',
    [...lm, ...onclick.map((u) => `${u}: div/span onclick`)],
    'Landmarkok rendben',
    'Landmark / szemantika problémák',
  );

  const unlabeled = [];
  for (const p of pages) {
    const forIds = new Set([...p.html.matchAll(/<label[^>]*\sfor=["']([^"']+)/gi)].map((m) => m[1]));
    // Controls wrapped in a <label> are labelled implicitly.
    const wrapped = new Set(
      [...p.html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].flatMap((m) => [
        ...tags(m[0], 'input'),
        ...tags(m[0], 'select'),
        ...tags(m[0], 'textarea'),
      ]),
    );
    for (const t of [...tags(p.html, 'input'), ...tags(p.html, 'select'), ...tags(p.html, 'textarea')]) {
      if (/type=["'](hidden|submit|button|reset|image)/i.test(t)) continue;
      if (attr(t, 'aria-label') || attr(t, 'aria-labelledby') || forIds.has(attr(t, 'id')) || wrapped.has(t))
        continue;
      // Honeypots are removed from the tab order and hidden on purpose.
      if (
        attr(t, 'tabindex') === '-1' &&
        (attr(t, 'aria-hidden') === 'true' || /visually-hidden|sr-only/.test(attr(t, 'class') ?? ''))
      )
        continue;
      unlabeled.push(`${p.url}: ${t.slice(0, 70)}`);
    }
  }
  check(
    'A11Y-06',
    unlabeled,
    'Minden mezőnek van label-je',
    'Label nélküli mezők (ha label-be ágyazott, ok)',
    'warn',
  );

  const nameless = [];
  for (const p of pages) {
    for (const m of p.html.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const [, tag, attrs, inner] = m;
      if (/aria-label(ledby)?=["'][^"']+/i.test(attrs) || /\stitle=["'][^"']+/i.test(attrs)) continue;
      const text = inner.replace(/<[^>]+>/g, '').trim();
      const imgAlt = [...inner.matchAll(/alt=["']([^"']+)/g)].length;
      const srOnly = /sr-only|visually-hidden/.test(inner);
      if (!text && !imgAlt && !srOnly) nameless.push(`${p.url}: <${tag}${attrs.slice(0, 50)}>`);
    }
  }
  check('A11Y-07', nameless, 'Ikon-gomboknak/linkeknek van neve', 'Accessible name nélküli gombok/linkek');

  const css =
    cssFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n') + pages.map((p) => p.html).join('\n');
  if (!/@keyframes|animation:|transition:/.test(css)) na('A11Y-09', 'Nincs animáció');
  else
    /prefers-reduced-motion/.test(css)
      ? pass('A11Y-09', 'prefers-reduced-motion kezelve')
      : fail('A11Y-09', 'Van animáció, de nincs prefers-reduced-motion');
  na('A11Y-04', 'Kontraszt: pnpm test:e2e (axe)');
}

// ---------- 8. legal ----------
{
  const embeds = [];
  for (const p of pages) {
    if (/fonts\.(googleapis|gstatic)\.com/.test(p.html)) embeds.push(`${p.url}: Google Fonts`);
    if (/youtube\.com\/embed/.test(p.html))
      embeds.push(`${p.url}: youtube.com/embed (youtube-nocookie kell)`);
    if (/google\.com\/maps\/embed/.test(p.html)) embeds.push(`${p.url}: Maps embed (consent mögé)`);
  }
  check('LEG-15', embeds, 'Nincs consent nélküli third-party embed', 'Third-party embedek');
  na('LEG-01', 'Első betöltés cookie/tracking: pnpm test:e2e (quality.spec)');
}

// ---------- 10. security ----------
{
  const maps = allFiles.filter((f) => f.endsWith('.map')).map(rel);
  const smUrl = jsFiles.filter((f) => /sourceMappingURL=/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  check(
    'SEC-01',
    [...maps, ...smUrl.map((f) => `${f}: sourceMappingURL`)],
    'Nincs source map',
    'Source map a buildben',
  );

  const logs = jsFiles.filter((f) => /console\.log\(/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  check(
    'SEC-02',
    logs,
    'Nincs console.log a buildben',
    'console.log a bundle-ben (lehet függőségből is, nézd meg)',
    'warn',
  );

  const secretRe = [
    [/sk_live_[0-9a-zA-Z]{16,}/, 'Stripe secret'],
    [/sk-ant-[0-9a-zA-Z_-]{20,}/, 'Anthropic key'],
    [/sk-(proj-)?[0-9a-zA-Z_-]{32,}/, 'OpenAI key'],
    [/AKIA[0-9A-Z]{16}/, 'AWS key'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
    [/gh[pousr]_[0-9a-zA-Z]{30,}/, 'GitHub token'],
    [/xox[abprs]-[0-9a-zA-Z-]{10,}/, 'Slack token'],
    [/re_[0-9a-zA-Z]{20,}_[0-9a-zA-Z]{6,}/, 'Resend key'],
    [/SUPABASE_SERVICE_ROLE|service_role/, 'Supabase service role'],
  ];
  const secrets = [];
  for (const f of [...jsFiles, ...htmlFiles]) {
    const c = fs.readFileSync(f, 'utf8');
    for (const [re, name] of secretRe) if (re.test(c)) secrets.push(`${rel(f)}: ${name}`);
  }
  check('SEC-04', secrets, 'Nincs secret-mintázat a kliens kódban', 'LEHETSÉGES SECRET A BUNDLE-BEN');

  has('.well-known/security.txt')
    ? pass('SEC-10', 'security.txt létezik')
    : fail('SEC-10', 'Nincs /.well-known/security.txt');

  const pm = fs.existsSync(path.join(root, 'pnpm-lock.yaml'))
    ? 'pnpm'
    : fs.existsSync(path.join(root, 'package-lock.json'))
      ? 'npm'
      : null;
  if (args['skip-audit'] || !pm) na('SEC-09', 'audit kihagyva (--skip-audit vagy nincs lockfile)');
  else {
    let out;
    const cmd = pm === 'pnpm' ? 'pnpm audit --prod --json' : 'npm audit --omit=dev --json';
    try {
      out = execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    } catch (e) {
      out = e.stdout?.toString() ?? '{}';
    }
    try {
      const j = JSON.parse(out);
      // high/critical package names: pnpm reports `advisories`, npm reports `vulnerabilities`
      const severe = [
        ...Object.values(j.advisories ?? {})
          .filter((a) => /high|critical/.test(a.severity))
          .map((a) => a.module_name),
        ...Object.entries(j.vulnerabilities ?? {})
          .filter(([, v]) => /high|critical/.test(v.severity))
          .map(([name]) => name),
      ];
      // doczidev.json "acceptedAdvisories": packages whose finding was assessed and accepted (keep the reason in the launch report)
      const accepted = new Set(profile.acceptedAdvisories ?? []);
      const open = [...new Set(severe.filter((n) => !accepted.has(n)))];
      const ok = [...new Set(severe.filter((n) => accepted.has(n)))];
      if (open.length) fail('SEC-09', `audit: high/critical sebezhetőség`, open);
      else if (ok.length)
        warn('SEC-09', 'audit: csak elfogadott high/critical tételek (acceptedAdvisories)', ok);
      else pass('SEC-09', 'audit: nincs high/critical');
    } catch {
      warn('SEC-09', 'audit kimenet nem értelmezhető');
    }
  }
  na('SEC-03', 'Console error/warning: pnpm test:e2e (quality.spec)');

  const e2e = walk(path.join(root, 'tests'), true).filter((f) => /\.spec\.[tj]s$/.test(f));
  e2e.length
    ? pass('MON-07', `Playwright spec-ek: ${e2e.length} db`)
    : fail('MON-07', 'Nincs Playwright teszt (tests/*.spec.ts)');
}

// ---------- live checks ----------
if (args.url) await liveChecks(args.url.replace(/\/$/, ''));
else
  for (const id of ['DOM-01', 'DOM-03', 'DOM-04', 'GEO-02', 'SEC-05', 'SEC-06', 'PERF-08'])
    na(id, 'Élő ellenőrzés: futtasd --url-lel');
if (args['preview-url']) await previewCheck(args['preview-url']);
else na('DOM-02', 'Preview noindex: futtasd --preview-url-lel');

// ---------- report ----------
results.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), site, pages: pages.length, results }, null, 2),
);

const icon = { pass: '✅', fail: '❌', warn: '⚠️ ', na: '➖' };
const count = (s) => results.filter((r) => r.status === s).length;
console.log(`\ndoczidev launch check: ${pages.length} oldal, ${site || '(nincs site)'}\n`);
for (const r of results) {
  console.log(`${icon[r.status]} ${r.id.padEnd(8)} ${r.msg}`);
  for (const d of r.details) console.log(`           · ${d}`);
}
console.log(
  `\n${count('pass')} ok · ${count('fail')} hiba · ${count('warn')} figyelmeztetés · ${count('na')} n/a → ${path.relative(root, outPath)}\n`,
);
process.exit(count('fail') ? 1 : 0);

// ================= helpers =================
async function liveChecks(base) {
  const u = new URL(base);
  /\.(vercel\.app|netlify\.app|pages\.dev|workers\.dev)$/.test(u.hostname)
    ? fail('DOM-01', `Preview domain fut: ${u.hostname}`)
    : pass('DOM-01', `Saját domain: ${u.hostname}`);

  try {
    const r = await fetch(`http://${u.host}/`, { redirect: 'manual' });
    const loc = r.headers.get('location') ?? '';
    [301, 308].includes(r.status) && loc.startsWith('https://')
      ? pass('DOM-03', `HTTP → HTTPS ${r.status}`)
      : fail('DOM-03', `HTTP válasz: ${r.status} ${loc}`);
  } catch (e) {
    warn('DOM-03', `HTTP nem elérhető: ${e.message}`);
  }

  const alt = u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`;
  try {
    const r = await fetch(`https://${alt}/`, { redirect: 'manual' });
    const loc = r.headers.get('location') ?? '';
    [301, 308].includes(r.status) && new URL(loc, `https://${alt}`).hostname === u.hostname
      ? pass('DOM-04', `${alt} → ${u.hostname} ${r.status}`)
      : fail('DOM-04', `${alt} válasz: ${r.status} ${loc}`);
  } catch {
    warn('DOM-04', `${alt} nem elérhető (DNS?), ellenőrizd, hogy szándékos-e`);
  }

  const r404 = await fetch(`${base}/doczidev-nem-letezo-oldal-${Date.now()}`);
  r404.status === 404
    ? pass('DOM-08', 'Valódi 404 státusz')
    : fail('DOM-08', `Nem létező oldal státusza: ${r404.status} (soft 404)`);

  const home = await fetch(base + '/');
  const html = await home.text();
  /<h1[\s>]/i.test(html) && visibleText(html).length > 200
    ? pass('SEO-14', 'Élő HTML JS nélkül is tartalmas')
    : fail('SEO-14', 'Élő HTML JS nélkül üres/vékony');

  const bots = [
    'OAI-SearchBot/1.0',
    'ChatGPT-User/1.0',
    'PerplexityBot/1.0',
    'Claude-SearchBot/1.0',
    'Claude-User/1.0',
  ];
  const botFails = [];
  for (const b of bots) {
    const r = await fetch(base + '/', { headers: { 'user-agent': `Mozilla/5.0 (compatible; ${b})` } });
    if (r.status !== 200) botFails.push(`${b}: ${r.status}`);
  }
  check('GEO-02', botFails, 'AI retrieval botok 200-at kapnak', 'WAF/CDN blokkolja az AI botokat');

  const llms = await fetch(base + '/llms.txt', { redirect: 'manual' });
  const ct = llms.headers.get('content-type') ?? '';
  llms.status === 200 && /text\/(plain|markdown)/.test(ct)
    ? pass('GEO-05', `llms.txt élőben: ${ct}`)
    : fail('GEO-05', `llms.txt élőben: ${llms.status} ${ct}`);

  const exposed = [];
  for (const p of ['/.env', '/.git/config', '/admin', '/api/debug', '/.env.local']) {
    const r = await fetch(base + p, { redirect: 'manual' });
    const body = r.status === 200 ? await r.text() : '';
    if (r.status === 200 && !/<html/i.test(body)) exposed.push(`${p}: 200`);
  }
  check('SEC-05', exposed, 'Érzékeny útvonalak nem elérhetők', 'Érzékeny útvonal elérhető!');

  const h = home.headers;
  const missingH = [];
  if (!h.get('content-security-policy')) missingH.push('Content-Security-Policy');
  if (!/max-age=\d{7,}/.test(h.get('strict-transport-security') ?? ''))
    missingH.push('Strict-Transport-Security (max-age ≥ 1 év)');
  if (h.get('x-content-type-options') !== 'nosniff') missingH.push('X-Content-Type-Options: nosniff');
  if (!h.get('referrer-policy')) missingH.push('Referrer-Policy');
  if (!h.get('permissions-policy')) missingH.push('Permissions-Policy');
  if (!/frame-ancestors/.test(h.get('content-security-policy') ?? '') && !h.get('x-frame-options'))
    missingH.push('frame-ancestors / X-Frame-Options');
  check('SEC-06', missingH, 'Security headerek rendben', 'Hiányzó security headerek');

  const asset = html.match(/(?:src|href)=["'](\/_astro\/[^"']+\.(?:js|css))["']/)?.[1];
  const perf = [];
  if (!/br|gzip|zstd/.test(h.get('content-encoding') ?? '')) perf.push('HTML nincs tömörítve (br/gzip)');
  if (asset) {
    const a = await fetch(base + asset);
    if (
      !/max-age=(3153600\d|[4-9]\d{7,})/.test(a.headers.get('cache-control') ?? '') &&
      !/immutable/.test(a.headers.get('cache-control') ?? '')
    )
      perf.push(`${asset}: cache-control = ${a.headers.get('cache-control')}`);
  }
  check('PERF-08', perf, 'Tömörítés és asset cache rendben', 'Cache/tömörítés problémák', 'warn');
}

async function previewCheck(url) {
  const r = await fetch(url, { redirect: 'manual' });
  const xr = r.headers.get('x-robots-tag') ?? '';
  const body = r.status === 200 ? await r.text() : '';
  r.status === 401 || r.status === 403 || /noindex/i.test(xr) || /<meta[^>]+noindex/i.test(body)
    ? pass('DOM-02', `Preview védett/noindex (${r.status} ${xr})`)
    : fail('DOM-02', `Preview indexelhető: ${r.status}`);
}

function parseArgs(a) {
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const k = a[i].slice(2);
    o[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  }
  return o;
}
function walk(dir, optional = false) {
  if (!fs.existsSync(dir)) return optional ? [] : [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(p)) : [p];
  });
}
function fileToUrl(r) {
  return r.replace(/index\.html$/, '').replace(/\.html$/, '') || '/';
}
function resolveDist(p) {
  p = decodeURIComponent(p);
  return [p, p + '.html', path.posix.join(p, 'index.html')].some(
    (c) => fs.existsSync(path.join(distDir, c)) && fs.statSync(path.join(distDir, c)).isFile(),
  );
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}
function attr(tag, name) {
  const m = tag.match(
    new RegExp(`\\s${name}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+)))?(?=[\\s/>])`, 'i'),
  );
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}
function metaName(html, n) {
  const t = tags(html, 'meta').find((m) => attr(m, 'name')?.toLowerCase() === n);
  return t ? attr(t, 'content') : null;
}
function metaProp(html, n) {
  const t = tags(html, 'meta').find((m) => attr(m, 'property')?.toLowerCase() === n);
  return t ? attr(t, 'content') : null;
}
function linkRel(html, r) {
  const t = tags(html, 'link').find((m) => attr(m, 'rel')?.toLowerCase() === r);
  return t ? attr(t, 'href') : null;
}
function tagText(html, name) {
  return html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim() ?? '';
}
function stripNonContent(html) {
  return html.replace(/<(script|style|template|noscript)[\s\S]*?<\/\1>/gi, '');
}
function visibleText(html) {
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  return decode(stripNonContent(body).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
}
function dups(arr) {
  const seen = new Set(),
    d = new Set();
  for (const x of arr) (seen.has(x) ? d : seen).add(x);
  return [...d];
}
function collectTypes(node, set) {
  if (Array.isArray(node)) return node.forEach((n) => collectTypes(n, set));
  if (node && typeof node === 'object') {
    if (node['@type']) [].concat(node['@type']).forEach((t) => set.add(t));
    Object.values(node).forEach((v) => collectTypes(v, set));
  }
}
function robotsGroup(txt, agent, includeStar = true) {
  // Returns the rule lines of the group(s) that apply to `agent`.
  const lines = txt
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean);
  const out = [];
  let agents = [],
    inRules = false;
  for (const l of lines) {
    if (/^user-agent:/i.test(l)) {
      if (inRules) {
        agents = [];
        inRules = false;
      }
      agents.push(l.split(':')[1].trim().toLowerCase());
      continue;
    }
    inRules = true;
    if (agents.includes(agent.toLowerCase()) || (includeStar && agent === '*' && agents.includes('*')))
      out.push(l);
  }
  return out;
}
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1],
        len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  }
  return null;
}
