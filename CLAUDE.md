# Talizmán Hetes – landing page

Egyoldalas, kétnyelvű (HU alapértelmezett a `/` alatt, EN a `/en/` alatt) bemutatkozó oldal a Talizmán Hetes étteremnek (TALIZMÁN HETES Kft., 1031 Budapest, Dinamó utca 7.). Célközönség: óbudai és budapesti vendégek hétköznapi ebédhez, romantikus vacsorához, baráti találkozóhoz és családi ünnephez, valamint külföldi vendégek. A cél egy hangulatos, bizalomkeltő oldal, ami asztalfoglalásra visz, és megmutatja az étlapot és a kapcsolati adatokat. Az ügyfél kérésére nincs részletes launch-check: elég az alap (helyes meta, lang, hreflang, sitemap).

- **Design:** az impeccable irány-körben a user az „éttermi standard” világot választotta (esti fotók sötét átmenettel, Gloock serif display + Hanken Grotesk, sárgaréz kiemelés csak a cselekvésnek és a 7-es jelnek). Világ: `DESIGN.md` (helyi, nem kerül gitbe), direction contract: `.impeccable/surfaces/`.
- **Foglalás:** csak e-mailben (`src/components/Booking.astro`), űrlap nincs (az ügyfél kérése). Egy `mailto:` gomb előre kitöltött tárggyal és egy rövid kitöltendő sablonnal (dátum, időpont, létszám, név, alkalom), mellette az e-mail cím.
- **Szövegek:** minden szöveg egy helyen: `src/i18n/content.ts` (hu + en). A szintetikus részek ott `SYNTHETIC` megjegyzéssel jelölve.

- **Stack:** Astro 7 + Tailwind CSS v4, statikus (SSG), pnpm.
- **Hosting:** Cloudflare Pages (headerek: `public/_headers`).
- **Profil (`doczidev.json`):** landing, i18n (hu/en), sötét mód, LocalBusiness (az oldalon `Restaurant` JSON-LD-vel kiegészíthető); kapcsolat szekció van, űrlap nincs; nincs analytics, nincs cookie; AI tréning botok tiltva (`robots.txt`).
- **Tartalom forrása:** [docs/tartalom-hu.md](docs/tartalom-hu.md) (az ügyfél szövege + cégadatok). Az angol változat ennek fordítása. A kreatív kiegészítések (pl. a 7-es szerencseszám motívum) nem találhatnak ki tényeket: nyitvatartás, árak és ételnevek csak az ügyféltől jöhetnek.
- **Repo:** még nincs; a user később adja meg, abba initelünk (első commit: „chore: scaffold with doczidev kit”).

## Cserelista

- [ ] Végleges domain (`astro.config.mjs` `site`, `doczidev.json`, `public/robots.txt`, `public/llms.txt`, `public/.well-known/security.txt`). Most: `https://talizman-hetes.pages.dev` placeholder.
- [ ] **E-mail cím** (foglalás-összeállító, kapcsolat, lábléc, JSON-LD, `security.txt`): most `info@talizmanhetes.hu`, kitalált placeholder → `src/i18n/content.ts` `business.email` + `public/.well-known/security.txt`. Élesítés előtt kötelező, különben a foglalások elvesznek.
- [ ] Telefonszám (az ügyfél később küldi); most sehol nem jelenik meg. Ha megjön: hero/kapcsolat + JSON-LD `telephone`.
- [ ] **Nyitvatartás**: most kitalált (H–Cs 12–22, P–Szo 12–23, V 12–21) → `content.ts` `hours`. A JSON-LD-be csak a valódi kerüljön (`openingHoursSpecification`).
- [ ] **Étlap és árak**: a fogások kitalált, klasszikus magyar ízelítő → `content.ts` `menu`. Az árak becslések 2025–26-os budapesti házias éttermi étlapok alapján, a középsávba lőve (levesek 2 490–2 990 Ft, főételek 4 490–5 290 Ft, desszertek 1 890–3 290 Ft). Élesítés előtt az ügyfél valódi étlapjára és áraira cserélendő.
- [ ] Cégjegyzékszám ellenőrzése (01-09-411435, a cégkivonat fájlnevéből).
- [ ] Logó: most egy generált jel (`public/logo.svg`, `src/components/SevenMark.astro`: serif 7 vékony gyűrűben). Ha lesz valódi logó, ebből újragenerálandó a favicon szett és az OG kép (`design-lab/brand/make.mjs`).
- [ ] **Fotók**: illusztratív Unsplash stockfotók (`src/assets/photos/`, források: `src/assets/photos/CREDITS.md`). A lábléc jelzi, hogy illusztrációk. Saját belső tér- és ételfotókra cserélendők, utána a lábléc „A fotók illusztrációk” sora törlendő.
- [ ] Közösségi profilok (`doczidev.json` `entity.sameAs`), pontos Google Maps hely (most cím alapú keresőlink).

Workflow rules come from the doczidev plugin (dev-claude).

---

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
