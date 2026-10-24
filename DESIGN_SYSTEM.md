# JiraVision Design System

Derived from the actual code: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`,
`components/sections/section.tsx`, `section-bg.tsx`, `page-kit.tsx`, `faq-accordion.tsx`.
Every statement below describes what is implemented, not aspiration.

## 1. Foundations

- Tailwind 3.4, `darkMode: "class"` (next-themes sets the class on `<html>`).
- All colors are shadcn-style HSL channel triplets in CSS variables, consumed as
  `hsl(var(--token))` via `tailwind.config.ts` `theme.extend.colors`. Existing shadcn
  variable names were kept and re-colored, so `components/ui/*` and the dashboard inherit
  the palette without per-file edits.
- Single source of truth for tokens: `app/globals.css`. Comments there record WCAG AA
  verification of the text pairs in both themes.

## 2. Palette (light → dark unless noted)

| Concept | CSS var | Tailwind color | Light value | Dark value |
|---|---|---|---|---|
| Page background | `--background` | `background` | `45 27% 96%` warm off-white `#F7F5F0` | `60 6% 9%` warm charcoal |
| Band surface | `--surface` / `--surface-2` | `surface` / `surface-2` | `44 22% 92%` / `42 18% 88%` | `45 8% 14%` / `44 9% 19%` |
| Card / popover | `--card`, `--popover` (+ `-foreground`) | `card`, `popover` | `45 27% 96%` / `45 30% 97%` | `45 8% 12%` |
| Ink (body text) | `--foreground` | `foreground`, `ink` | `40 9% 10%` `#1C1B19` | `41 18% 87%` (softened, not white) |
| Muted ink | `--ink-muted` | `ink-muted` | `41 11% 30%` (8.5:1 on background) | `42 17% 57%` |
| Muted block / text | `--muted`, `--muted-foreground` | `muted` | `43 19% 90%` / `40 9% 36%` | `44 9% 19%` / `42 17% 57%` |
| Primary (pine) | `--primary` / `--primary-foreground` | `primary` | `160 23% 24%` deep pine `#2F4A3F` | `148 17% 52%` lightened pine `#6E9A85` |
| Accent tint | `--accent` / `--accent-foreground` | `accent` | `153 18% 52%` — hover/tint only, not text on light bg | `148 25% 68%` |
| Secondary (stone) | `--secondary` / `--secondary-foreground` | `secondary` | `42 13% 77%` `#C6C0B2` | `44 9% 19%` |
| Clay (terracotta) | `--clay` / `--clay-foreground` | `clay` | `20 34% 46%` `#9D5F44` | `18 42% 62%` `#C68163` |
| Lines | `--border`, `--input`, `--ring` | `border`, `input`, `ring` | `43 20% 84%` / same / pine | `44 8% 22%` / same / light pine |
| Success (moss) | `--success` / `-foreground` | `success` | `88 29% 28%` `#485F2D` | `86 27% 58%` |
| Warning (ochre) | `--warning` / `-foreground` | `warning` | `64 25% 25%` | `43 52% 52%` |
| Destructive (brick) | `--destructive` / `-foreground` | `destructive` | `10 47% 33%` `#7E3B2D` | `14 47% 55%` |
| Chart series | `--chart-pine` `--chart-stone` `--chart-clay` `--chart-moss` | `chart.pine` etc. | pine/stone/clay/moss | re-lit for dark |
| Radius | `--radius: 0.5rem` (8px) | `rounded-lg` = var, `md` = −2px, `sm` = −4px | | |
| Shadows | `--shadow-sm`, `--shadow-md` (warm-tinted: `hsl(40 9% 10% / .06/.08)`) | `shadow-soft` = sm, `shadow-soft-md` = md | | |

Naming note: there is no separate "sage" or "pine" token. Pine is `--primary`; the
`band-sage` background variant is a tint of `--primary`. "Sage", "clay", "stone", "moss"
are descriptive names over the same four variable families.

Layout: container centered, `padding: 1.5rem`, `2xl` screen at 1240px; extra `xs: 475px` breakpoint.

## 3. Typography

- Display: **Fraunces** via `next/font/google` in `app/layout.tsx` — `variable: "--font-display"`,
  `axis: "opsz"`, weights 400/500/600, `display: swap`.
- Body/UI: **Inter** — `variable: "--font-sans"`, weights via default; body gets `font-sans antialiased`.
- `font-display` utility (globals.css) = `var(--font-display), var(--font-sans), ui-serif, Georgia, serif`.
  Used on hero H1s, `SectionHeading` H2s, card titles in page-kit, and the watermark glyph.
- Global base: `h1, h2` default to the display face at `font-weight: 500`, `letter-spacing: -0.01em`.
- `prose-body` utility: `max-width: 65ch` — applied to hero subtitles and section intros.
- Mono: Tailwind default `font-mono` (system mono, not a loaded webfont), used sparingly for
  step labels (`StepsSection` "Step N"), changelog dates (`UpdatesSection`), and `<kbd>` chips
  (search help dialog, keyboard-first section).
- Observed scale: PageHero `text-4xl → md:text-5xl → lg:text-[3.25rem]`; SectionHeading
  `text-3xl → md:text-4xl`; body 14–16px, `leading-relaxed`.

## 4. Shadows & radius usage

- Cards everywhere: `rounded-lg border bg-card shadow-soft` (the standard kit card).
- `shadow-soft` maps to `--shadow-sm`; `shadow-soft-md` to `--shadow-md`. (globals.css also
  exposes `.shadow-soft-sm` / `.shadow-soft-md` utilities; pages use the Tailwind `shadow-soft*` keys.)
- CTA buttons use `rounded-full` overrides; inputs/cards stay on `rounded-lg` (8px `--radius`).
- Shadows are the only elevation; there are no gradients (removed in Phase A; the only
  "gradient" CSS is inside decorative background layers, §5).

## 5. The 10 background variants

Defined in `app/globals.css` as `.jv-bg-*` utilities (CSS/SVG only, each with a `.dark`
counterpart), mapped by `BgVariant` in `components/sections/section-bg.tsx`, rendered by
`<SectionBg variant watermark>` as an `aria-hidden` absolute layer inside `<Section>` (which adds
`relative`).

| Variant | Class | Treatment (as coded) |
|---|---|---|
| `grain` | `jv-bg-grain` | Inline-SVG fractal noise (feTurbulence), 140px tile, opacity 0.05 (0.07 dark) — paper texture |
| `dots` | `jv-bg-dots` | 1px radial-gradient dots on 22px grid, elliptical mask fading edges |
| `grid` | `jv-bg-grid` | 40px hairline grid from two linear-gradients, vertical mask fade top/bottom |
| `contour` | `jv-bg-contour` | Two repeating-radial-gradient "topographic" ring clusters (clay bottom-left, pine top-right) |
| `hatch` | `jv-bg-hatch` | 45° repeating-linear hairlines, 1px stroke / 10px pitch |
| `shapes` | `jv-bg-shapes` | Three large radial-gradient shapes: pine disc top-right, clay disc bottom-left, thin pine ring center |
| `inverse` | `jv-bg-inverse` | Solid warm-charcoal band (fixed `hsl(60 6% 9%)`) with faint 48px grid; always dark in both themes |
| `band-clay` | `jv-bg-band-clay` | Flat clay tint (`--clay` at 0.09/0.14) with arched top (`border-radius: 50% 50% 0 0 / 4rem…`) |
| `band-sage` | `jv-bg-band-sage` | Flat pine tint (`--primary` at 0.08/0.13) with arched bottom |
| `stacked` | `jv-bg-stacked` | Paper-fold effect from three stacked inset box-shadows (background/surface-2/border layers) |

Two supporting pieces:

- `.jv-watermark` — oversized Fraunces glyph (`clamp(12rem, 28vw, 24rem)`, foreground at
  0.045 opacity), passed via `<Section watermark="J">` / `"$"`.
- `.jv-invert` — token-remap block applied automatically by `<Section>` when
  `bg="inverse"`; it redefines `--background/--foreground/--card/--primary/--clay/…` locally
  so every token-based utility inside the band resolves against charcoal in BOTH themes.
  It also re-resolves `color` because the body color is inherited.

## 6. Core section API (`components/sections/section.tsx`)

| Component | Props | Behavior |
|---|---|---|
| `Section` | `id?`, `className?`, `bg?: BgVariant`, `watermark?: string`, `children` | `<section className="relative py-16 md:py-24">` + `SectionBg` layer + `container relative` inner; adds `jv-invert` when `bg === "inverse"` |
| `SectionHeading` | `eyebrow?`, `title`, `intro?`, `className?` | Clay uppercase tracked eyebrow, `font-display` H2 (`text-3xl md:text-4xl`), `prose-body` intro; `mb-10 md:mb-14 max-w-2xl` |
| `Reveal` | `children`, `className?` | One-shot fade/slide on first intersection (IntersectionObserver, threshold 0.15, rootMargin −40px bottom); 500ms opacity + `translate-y-3`; inert under `motion-reduce`, plus a global `prefers-reduced-motion` kill-switch in globals.css |

`FaqAccordion` (`faq-accordion.tsx`, client): `{ items: { q, a }[] }` — single-open shadcn Accordion.

## 7. Page kit (`components/sections/page-kit.tsx`)

Shared builders for all marketing subpages. `Cta = { label, href }`. Default `bg` noted per row.

| Component | Props summary | Default bg |
|---|---|---|
| `PhotoCard` | `photoId`, `alt`, `ratio?` — remote Unsplash `next/image` in a `rounded-lg border shadow-soft` frame | — |
| `PageHero` | `eyebrow`, `title`, `subtitle`, `bullets?`, `primary: Cta`, `secondary?: Cta`, `visual?: ReactNode`, `badge?` — 2-col bordered band (`bg-surface`), not a Section | — |
| `ProblemSection` | `eyebrow?`, `title`, `intro?`, `items: {title, body}[]` — numbered 3-col cards | `dots` |
| `FeatureGridSection` | `eyebrow`, `title`, `intro?`, `items` — gap-px hairline grid on `bg-border` | `grain` |
| `SplitFeature` | `index?`, `title`, `body`, `bullets?`, `visual: ReactNode`, `flip?`, `bg?` — text/visual 2-col | none (bordered) |
| `StepsSection` | `id?`, `eyebrow?`, `title`, `intro?`, `steps: {title, body}[]` — numbered `<ol>` of mono "Step N" cards | `grid` |
| `AudienceSection` | `eyebrow?`, `title`, `intro?`, `items: {who, body, wins[]}[]` | `band-clay` |
| `MethodSection` | `eyebrow?`, `title`, `intro?`, `rows: {label, detail}[]` — divided `<dl>` | `contour` |
| `HonestFitSection` | `title`, `good: string[]`, `bad: string[]` — "Works well if" / "Not for teams that" two-up | `hatch` |
| `PlanIncludeBand` | `bg?` — "Included in every plan" card + pricing/signup CTAs (links hardcoded) | `band-clay` |
| `QuotesSection` | `title?`, `items: {quote, name, role}[]` — figures with curly quotes; renders a standing "Example quotes… only with permission" disclaimer | `band-sage` |
| `UpdatesSection` | `title?`, `entries: {date, version, category, title, body}[]`, `href?` — changelog rows, links to `/changelog` | `hatch` |
| `FaqSection` | `title?`, `items: {q, a}[]`, `moreHref?`, `moreLabel?` — `FaqAccordion` + link to `/faq` | `dots` |
| `RelatedSection` | `eyebrow?`, `title`, `items: {title, href, summary}[]` — linked cards | `shapes` |
| `CtaSection` | `title`, `body`, `primary: Cta`, `secondary?: Cta`, `bg?`, `watermark?` | `inverse` |

## 8. Background rotation rules

Observed, enforced-in-practice rules (REDESIGN_PLAN V2-1/V2-3 + homepage implementation):

- Each of the 10 variants: **at most 2 uses per page**.
- **No adjacent repeats** — consecutive `Section`s never share a variant.
- Demo sections have fixed variants (they double as anchors when composing a page):
  sandbox = `contour`, gamification = `shapes`, equity explorer = `band-sage`,
  calculators = `grid`.
- Homepage actual order (19 bands): ProblemSolution dots → Pillars grain → HowItWorks grid →
  ProductTour hatch → Sandbox contour → Gamification shapes → Equity band-sage →
  ResponsibleAi inverse (watermark "J") → UseCases contour → Integrations band-clay →
  Outcomes band-sage → Calculators grid → Templates stacked → Testimonials dots →
  KeyboardFirst shapes → PricingSeats inverse (watermark "$") → FaqTeaser hatch → CtaBand
  (plain `bg-primary`, not a Section variant). Counts: dots×2, grid×2, hatch×2, contour×2,
  shapes×2, band-sage×2, inverse×2, grain×1, band-clay×1, stacked×1.
- `SplitFeature`/`CtaSection` accept `bg` overrides so pages can rebalance without editing defaults.

## 9. Component conventions

- **Server components compose, client islands interact.** All copy/data lives in typed
  `content/*.ts` files read by server components; `"use client"` islands are colocated in
  the route directory they serve: `app/(marketing)/pricing/pricing-calculator.tsx`,
  `app/(marketing)/migration/migration-planner.tsx`, `app/(marketing)/faq/faq-explorer.tsx`,
  `app/(marketing)/templates/templates-library.tsx` + `template-request-form.tsx`. Shared
  islands sit in `components/features/`, `components/forms/`, `components/sections/demo-*.tsx`.
  Exception: islands shared by an index route *and* its `[slug]` sibling live at `components/`
  root (`doc-index.tsx` + `doc-reader.tsx`, `webinar-index.tsx`, `case-study-index.tsx`,
  `newsletter-form.tsx`), because they are not scoped to one route directory.
- **localStorage-backed state goes through `useSyncExternalStore` with a cached,
  hydration-stable snapshot (server snapshot = default/empty) — never `setState` in an
  effect.** Implemented this way in: `announcement-bar.tsx` (dismissal), `site-search.tsx`
  (recent searches), `lib/consent.ts` + `cookie-consent.tsx`, `lib/i18n/*` +
  `language-selector.tsx`, `bottom-bar.tsx` (desktop float dismissal, scroll state),
  `migration-planner.tsx` (saved plan), `demo-form.tsx` (timezone). 10 source files follow the
  pattern (grep `useSyncExternalStore`).
- Icons: **lucide-react only**, decorative ones get `aria-hidden`. No emoji anywhere in the
  marketing kit (the old chatbot `👋` was removed in D1 fix).
- Cards: `rounded-lg border bg-card shadow-soft`; prose: `prose-body`; headings: `font-display`.
- Chrome is provided once by `app/(marketing)/layout.tsx` (skip link, `<main id="main">`,
  Navbar/Footer/BottomBar/SiteSearch/CookieConsent) — pages never hand-roll it.

## 10. Honesty conventions (enforced in code)

- `NOTE(PLACEHOLDER)` is a **comment convention in `content/*.ts` only** — it marks
  unverified data for the owner and is never rendered to visitors. (The audit list lives in
  `PLACEHOLDERS.md`.)
- Unverified quotes render with generic attribution `"Early-access participant — Role"`
  (e.g. `content/products.ts:177`) inside `QuotesSection`, which appends the visible
  disclaimer "Example quotes from early-access conversations. We publish attributed
  testimonials only with permission."
- Where a number is unverified, the UI says so instead of showing it: `Outcomes`
  (`home-misc.tsx:128`) suppresses the stat row while `content/home.ts` values are
  `"PLACEHOLDER"` and shows "Measured outcomes coming soon…".
  Caveat: the homepage `Testimonials` section does NOT gate names — `content/home.ts`
  still feeds literal "PLACEHOLDER — Engineering manager" strings there (owner item in
  `PLACEHOLDERS.md`).
- Illustrative models are labelled: burnout/ROI calculators ("illustrative, not clinical"),
  migration hour model, ROI disclaimer on `/pricing`.
- Compare pages: no competitor prices/logos/scores, "verify current details on their site"
  note on tables (`content/compare.ts` header rules).
- Status page: hand-maintained manifest, and only real states are published (email
  delivery shows degraded until a Resend key is configured).
- `/resources/case-studies` publishes **illustrative scenarios, not customer stories**: a visible
  banner names the team as fictitious, measures state where the number is computed instead of
  asserting a result, and `tests/unit/case-studies.test.ts` fails if any entry carries a
  percentage, an attributed quote, or a `customer` field the owner has not supplied.
  `/resources/webinars` renders "No recording published" unless a `videoUrl` exists.
