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
| Chart series | `--chart-pine` `--chart-stone` `--chart-clay` `--chart-moss` `--chart-slate` `--chart-teal` `--chart-bark` `--chart-plum` `--chart-sage` `--chart-ochre` | `chart.pine` etc. | pine/stone/clay/moss + the six discipline-category tokens (`globals.css:57–68`) | re-lit for dark |
| Radius | `--radius: 0.5rem` (8px) | `rounded-lg` = var, `md` = −2px, `sm` = −4px | | |
| Shadows | `--shadow-sm`, `--shadow-md` (warm-tinted: `hsl(40 9% 10% / .06/.08)`) | `shadow-soft` = sm, `shadow-soft-md` = md | | |

Naming note: there is no separate "sage" or "pine" token. Pine is `--primary`; the
`band-sage` background variant is a tint of `--primary`. "Sage", "clay", "stone", "moss"
are descriptive names over the same four variable families.

Chart series tokens are **graphics**, verified to `>= 3:1` on every surface they sit on
(WCAG 1.4.11), not text colours: `--chart-*` paints dots, bars, lanes and swatch borders, and
the label beside it is always `--foreground`. Known debt: 15 call sites in eight dashboard pages
still put a series token on text (`text-[hsl(var(--chart-clay))]` at
`app/dashboard/team/page.tsx:197`, `app/dashboard/billing/page.tsx:561`,
`app/dashboard/ai-scrum-master/page.tsx:1144`, `app/dashboard/sprints/page.tsx:748`,
`app/dashboard/gamification/leaderboard/page.tsx:323` and the rest of that set), which inherits
the graphic contrast budget for body copy. Four more of the 15 are icons, where the 3:1 rule is
the right one. None of them were introduced by the work log and none were changed by phase 2.

Layout: container centered, `padding: 1.5rem`, `2xl` screen at 1240px; extra `xs: 475px` breakpoint.

**The breakpoint contract — `md` is a tablet, `lg` is a small laptop, `xl` is a desk.** Tablet
(768-1279) is a touch zone that is wide enough for a page to breathe but not for pointer chrome:

- Hover menus start at `xl`, and so does the marketing header bar. The mega-menu needs ~1120px
  beside the brand and the right cluster (and Google Translate can widen every label after
  hydration), so below `xl` the bar is not rendered at all — not `hidden xl:flex` — and the bottom
  tab bar is the only site chrome on a phone or tablet. Its Menu tab opens the drawer, which
  carries the pages, the language switch and the theme switch. The header/drawer split is
  JavaScript (`useDesktopNav`, a `matchMedia` store) because Google writes its translation
  container into one id per document, and a CSS hide would mount the picker twice.
- Everything fixed to the bottom edge of a public page clears that tab bar to the same `xl`, and
  the layout's footer spacer does too: `lg` in any of them leaves 1024-1279 with no navigation.
- The workspace spends tablet on the page, not the rail: the nav is a slide-over until `lg`, so a
  768px tablet gives the whole width to the content. What the top bar then has to hold is arithmetic,
  not taste — the pill switch, the full language label and the first name are `lg` pay-offs and the
  search field holds its 200px through tablet. `tests/unit/tablet-layout.test.ts` measures that sum
  from the class strings on disk.
- Five cards is a `xl` number. In the workspace `lg` leaves 1024 − 250 (rail) − 32 (padding) = 742px,
  so KPI strips ramp `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` — including a loading skeleton,
  which has to ramp with the strip it replaces or the page jumps when it fills.
- A `sizes` attribute tests `max-width: <breakpoint> − 1`, never the breakpoint itself: Tailwind's
  steps are `min-width`, so `max-width: 768px` hands a 768px tablet the phone size while the page is
  already in columns.

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
  `blog-index.tsx` + `blog-reader.tsx`, `newsletter-form.tsx`), because they are not scoped to
  one route directory. `doc-reader.tsx` and `blog-reader.tsx` both parse through
  `lib/markdown-lite.ts` — a db-free module, so vitest can import it (`content/blog.ts` and
  `content/documentation.ts` are db-free for the same reason).
- **localStorage-backed state goes through `useSyncExternalStore` with a cached,
  hydration-stable snapshot (server snapshot = default/empty) — never `setState` in an
  effect.** Implemented this way in: `announcement-bar.tsx` (dismissal), `site-search.tsx`
  (recent searches), `lib/consent.ts` + `cookie-consent.tsx`, `lib/accessibility.ts` +
  `accessibility-widget.tsx` (via `subscribeAccessibility`/`getAccessibilitySnapshot`),
  `google-translate.tsx` (chosen language), `bottom-bar.tsx` (desktop float dismissal, scroll
  state), `migration-planner.tsx` (saved plan), `demo-form.tsx` (timezone). 13 source files
  follow the pattern (grep `useSyncExternalStore`).
- **Visual adjustments are attribute-driven, never JS-styled.** `lib/accessibility.ts` maps each
  state key to a `data-jv-*` attribute and `app/accessibility.css` owns every rule; a
  pre-paint inline `bootstrapScript()` in `app/layout.tsx` restores the attributes before the
  first frame. Colour/contrast modes rewrite the HSL token triples rather than applying a CSS
  `filter` to a wrapper — a filter on an ancestor makes it the containing block for every
  `position: fixed` descendant (navbar, bottom bar, cookie bar, dialogs).
- **The bottom-right stack has fixed levels, and the widest element sits on top.** Accessibility launcher owns the corner (16px from xl), the assistant pill rests on it (84px), the cookie bar and the open chat panel rest on the pill (148px); below `xl` all four are 4rem higher to clear the marketing bottom bar. Positions are static — no control subscribes to consent state, because a bar that overlaps a button is a dead button.
- **A nav drawer is one accordion, and the state belongs to the drawer.** `navbar.tsx` holds the
  open section (`openGroup: string | null`) and `MobileGroup` is a controlled row, because two
  sections open at once turn a 48px-tall list into an unscrollable stack. Every dismissal path —
  overlay, Escape, a link, the two auth buttons — goes through `closeDrawer()`, which resets it,
  so the next open starts at the top.
- **Below `xl` the drawer is the header.** The bar that holds those controls on a desk is not
  rendered there, so the drawer carries the language switch and the theme switch under its own
  brand row, and the bottom tab bar's Menu tab is the only trigger. Removing the bar rather than
  collapsing it is also what keeps the two Google-translate mounts from ever being on the page
  together.
- **Chrome controls declare their edge.** Top-bar and floating controls carry
  `border border-border bg-card` rather than a bare ghost button, so they stay findable
  against the page and keep their shape when an accessibility colour mode rewrites the
  token triples those classes read.
- **Motion that fires during a theme flip is a keyframe animation, not a transition.**
  `app/layout.tsx` passes `disableTransitionOnChange` to next-themes, which freezes every
  CSS transition for the frames around the swap — the only moment a theme control moves.
  `components/theme-switch.tsx` slides its knob with `@keyframes jv-theme-to-dark`,
  `jv-theme-to-light` and `jv-theme-pop` (app/globals.css); the inline transform is just
  the resting state those animations move towards.
- **Ambient motion sweeps a token gradient, and its resting state is a design.** The footer
  wordmark's gleam is `.jv-wordmark` + `@keyframes jv-wordmark-gleam` (app/globals.css): a
  `--primary`/`--clay` band clipped to the glyphs travels 48%→100% of each 9s cycle and
  stands still for the first 48%, because `background-position` on `background-clip: text`
  repaints the glyphs instead of compositing. Both reduced-motion kill-switches shorten the
  duration without filling backwards, so the base rule — band parked off the left edge,
  letters a bare outline with a faint fill — is what a motion-off visitor sees. No hard hex:
  dark mode and the eight contrast modes rewrite the token triples the gradient reads.
- Icons: **lucide-react only**, decorative ones get `aria-hidden`. No emoji anywhere in the
  marketing kit (the old chatbot `👋` was removed in D1 fix).- Cards: `rounded-lg border bg-card shadow-soft`; prose: `prose-body`; headings: `font-display`.
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
  (`home-misc.tsx:125`) suppresses the stat row while `content/home.ts` values are
  `"PLACEHOLDER"` and shows "Measured outcomes coming soon…". That suppression is the only
  place the literal string still reaches a component; every testimonial name now reads
  "Early-access participant — Role" (`content/home.ts:241,248,255`).
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
- `/resources/blog` publishes **no bylines, no result figures and no engagement theatre**.
  Posts are credited "JiraVision team"; the `author` field in `content/blog.ts` is reserved for a
  confirmed real person and is currently absent from every post. Category counts come from
  `postsByCategory()` and read time from `readingMinutes()` (word count ÷ 200 wpm), so neither is
  typed by hand. Where the old articles asserted an outcome ("40% reduction in admin time"), the
  rewrite instead names the dashboard page where the reader can compute that number for their own
  team. `tests/unit/blog.test.ts` fails on a legacy byline, a percentage, an attributed quote, a
  view/like/comment counter, or raw HTML in a post body.

## 11. Work log (`/dashboard/worklog`, phase 2 2026-10-26)

One grid contains the whole page: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`
(`worklog-client.tsx:436`). Every card is a `SectionCard` from `components/dashboard-kit.tsx:37`
and owns its own span in `className`, so a section decides how wide it is and the client never
re-lays-out on data. The same twelve cards render in all five views; `?v=week` changes what is
inside the log slot, never which cards exist — a member who bookmarks a view gets the page they
left. `LogSection` and the bulk bar title their own cards (from `VIEW_LABEL[view]` and from the
selection count), which is why `SECTION_TITLES` in `sections.tsx` lists the other ten and
`tests/unit/worklog-page.test.ts` compares the declaration against the cards.

### Work log section inventory

| # | Card | Component | Grid span | Data |
| --- | --- | --- | --- | --- |
| 1 | This period | `TotalsSection` | 1 cell | `summary.totals`, `.days` |
| 2 | Quick add | `QuickAddSection` | 1 cell | `parseQuickAdd` → `POST /api/worklog/entries` |
| 3 | Find in the log | `FilterSection` | 1 cell | `lib/worklog/view-state` |
| 4 | View | `ViewToolbarSection` | 1 cell | `WORKLOG_VIEWS`, `RANGE_PRESETS` |
| 5 | `<view>` view | `LogSection` | `md:col-span-2 xl:col-span-3` | `summary.days` |
| 6 | Deliverables | `DeliverablesSection` | `md:col-span-2 xl:col-span-3` | `/api/worklog/deliverables` |
| 7 | Status changes | `TransitionsSection` | `md:col-span-2` | `summary.transitions` |
| 8 | Time by task | `TimeByTaskSection` | `md:col-span-2 xl:col-span-2` | `summary.tasks` |
| 9 | Where the time went | `DisciplineSplitSection` | `md:col-span-2 xl:col-span-2` | `summary.disciplines` |
| 10 | Mix of work | `KindMixSection` | `md:col-span-2 xl:col-span-2` | `summary.kinds`, `.openBlockers` |
| 11 | Coverage | `CoverageSection` | `md:col-span-2 xl:col-span-3` | `summary.gaps`, `.streak`, `.unlinked` |
| — | Selected — *n* entries | `BulkSection` | `md:col-span-2 xl:col-span-3`, only while rows are ticked | the selection |

Sections 1–4 are defined in `worklog-client.tsx` because their content is the mutation and filter
form state; 5–11 and the bulk bar live in `sections.tsx`, which is presentation only and imports no
fetch. A missing `summary` renders a `Skeleton` inside the live card, and an empty one renders an
`EmptyNote` inside it, so a heading and its View toolbar are always still reachable — a card is
never replaced by a second "nothing here" card.

### Kind and discipline colour

Kinds take `KIND_COLOUR[kind]` (`lib/worklog/entries.ts:22`): `action→pine`, `time→moss`,
`note→stone`, `review→clay`, plus `blocker→--destructive` and `deliverable→--accent`. Disciplines
take `DISCIPLINE_COLOUR[d]`, which is the **category** colour
(`lib/roles.ts:83`, `delivery→pine`, `technology→slate`, `information→teal`, `finance→moss`,
`operations→stone`, `engineering→bark`, `market→clay`, `people→plum`, `science→sage`,
`services→ochre`) — a discipline has no colour of its own, and that is what keeps 75 values legible
in a chart: ten families, not seventy-five hues.

Every map value is the wrapped form, `hsl(var(--chart-*))`. A bare `var(--chart-pine)` is an invalid
colour and renders nothing, which is why the wrap lives in the map and not at the call site; the same
applies to recharts `fill`/`Cell`, which takes the map value verbatim.

Two rules hold across the whole page:

- **Colour never carries meaning alone.** Every badge, bar, lane header and heat cell also prints its
  label or count (`KindBadge`, `DISCIPLINE_LABEL`, the `title` on each heat cell).
- **A series token is a graphic (3:1, WCAG 1.4.11), text is `--foreground`.** A chart fill, dot or
  swatch border may be `--chart-*`; the number beside it may not. Where a badge needs the colour as
  a background it is `color-mix(in srgb, … 15%, transparent)` behind `--foreground` text
  (`KindBadge`, `sections.tsx:116`), and the calendar heat cell mixes the same token from 12% to 67%
  by day intensity while printing the date and count (`sections.tsx:448`).

### Sentinel vocabulary in selects

Radix treats `SelectItem value=""` as "nothing chosen" and shows the placeholder, so an empty string
is never an option value. Two words carry the two different meanings, and they are not
interchangeable: `"none"` is *no value* in a **form** answer (the task a deliverable is not attached
to), `"all"` is *every value* in a **filter** answer (the discipline strip that keeps the URL clean).
`tests/unit/select-items.test.ts` enforces the empty-string ban repo-wide.

## 12. Period work reports (phase 3 2026-10-26)

The same grid as the work log — `grid gap-4 md:grid-cols-2 xl:grid-cols-3` — and the same rule: every card owns
its span in `className`, and the client never re-lays-out on data. What differs is where the cards come from. The
build view renders `sectionsFor(template)`, so the *template* decides the order and the `sectionNodes` map decides
that a section the template does not lead with is still present. Twelve cards, in this shape:

| Card | Component | Grid span | Where its numbers come from |
| --- | --- | --- | --- |
| Period | `PeriodSection` | 1 cell | the URL (`?p`, `?d`, `?from`, `?to`, `?tpl`) |
| My reports | `MyReportsSection` | 1 cell | `GET /api/reports/work`, capped at 100 |
| Header | `HeaderSection` | `md:col-span-2 xl:col-span-2` | computed; only the title is typed |
| Summary | `ProseSection section="summary"` | `md:col-span-2 xl:col-span-2` | the author |
| Actions completed … Next period (6 cards) | `RowSection` | 1 cell each | `rowsFor(section, aggregate)` |
| Metrics | `MetricsSection` | `md:col-span-2 xl:col-span-3` | `aggregate.metrics` plus `chartRows()` |
| Notes and asks | `ProseSection section="notes"` (`rows={8}`) | `md:col-span-2 xl:col-span-2` | the author |

### Report chart rules

| Chart | Label | Measure | Bar colour source |
| --- | --- | --- | --- |
| `discipline` | Time by discipline | minutes | `DISCIPLINE_COLOUR` (`lib/roles.ts`) |
| `kind` | Mix of work | minutes | `KIND_COLOUR` (`lib/worklog/entries.ts`) |
| `series` | Per day across the period | minutes | `hsl(var(--chart-pine))` |
| `taskStatus` | Tasks by status | a count of tasks | `TASK_BUCKET_FILL` |
| `priority` | Tasks by priority | a count of tasks | `PRIORITY_FILL` |

Every bar is horizontal (`layout="vertical"`), the same shape `DisciplineSplitSection` uses on the work log, so
the labels are read rather than rotated; the container height is `Math.max(120, rows * 26)` so a twelve-bucket
yearly series cannot overlap itself. `CHART_UNIT` is the single source of "is this time or a count" and the
tooltip asks it, never the component. Colours come from the existing `--chart-*` tokens plus `--destructive`;
**this phase adds no token to `app/globals.css`**, so `app/accessibility.css` needs no re-lighting and
`tests/unit/accessibility.test.ts` stays green unchanged. An unmapped bucket gets `FALLBACK_FILL`
(`hsl(var(--muted-foreground))`) rather than recharts' black, because an unmapped bucket is a naming gap and the
bar still has to be drawn.

### Report copy rules

- A quiet period says so in words: `Time logged` reads "None logged" at zero, and a zero tile's hint is
  "Nothing in this period" — a bare `0` reads like a rounding error.
- Singular and plural come from the module-private `plural()` in `lib/reports/row-sections.ts`; no card writes
  `s` by hand.
- A section with no rows still renders, with the explanation specific to it (`ROW_SECTION_HINT` for the empty
  commentary placeholder, and `EMPTY_CAPTION` — "No task reached a done status in this period." — as the
  completed caption).
- The figure source is always stated on the two computed cards: "Figures as saved" or
  "Live preview — not saved yet" (`SOURCE_LABEL`), never an icon.
- `?open=<section>` is the expansion. A row's ids print only when open, in `font-mono text-[10px]`, so the
  default report reads like prose and the audit reads like a table.

## 13. Submission, inbox, admin view (phase 4, 2026-10-27)

### Inbox page

`/dashboard/reports-work/inbox` — same grid as the builder. Each report is a card showing title, author, period, submitted date, revision number (if any), and recipient state badge (Pending review / Acknowledged / Returned). Actions: Acknowledge (primary button), Return with note (secondary → textarea → destructive button).

### Status badge

Four states: `draft` (muted), `submitted` (blue), `acknowledged` (green), `returned` (amber). Rendered in the builder header next to the title. The badge is a `<span>` with `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium` and a background color from the existing palette.

### Recipient picker

Multi-select dialog. Pre-filled from `preferences.settings.defaultReportRecipients`. Each member is a checkbox row with name. Submit button disabled until at least one recipient is selected. The dialog fetches `/api/team/members` and `/api/settings` in parallel on mount.

### Admin day view

Not yet a page; the API exists (`GET /api/reports/admin/day`) and returns a grouped query. The admin dashboard will consume it in a later phase.

### Report copy rules (phase 4)

- Submitted date: "Submitted {date}" in the inbox card footer.
- Revision: "revision of #{id}" when `revisionOf` is set.
- Return note: quoted block with "Return note:" label, amber background.
- Empty inbox: "No reports in your inbox."
- Admin view label: "All submitted reports (admin view)".
- Status badge text: capitalized status name (Draft, Submitted, Acknowledged, Returned).

## 14. Exports (phase 5, 2026-10-27)

### Export buttons

Three formats available wherever data is shown: CSV (existing), PDF, and Excel. Buttons use the `Download` icon from lucide-react, variant="outline", size="sm". In the report builder, they sit next to Reload and Copy link. In the worklog bulk bar, they sit next to Export CSV.

### PDF layouts

Three layouts, all generated client-side with `jspdf` + `jspdf-autotable`:

- **Report**: cover block (title, author, period, template, status, revision, recipients), KPI strip (5 metrics), completed tasks table, deliverables table. Page numbers and footer on every page.
- **Log**: header (author, period), entries table (date, title, kind, minutes, task), deliverables table.
- **Plan**: header (title, horizon), lane-grouped tables (one per lane, items with start/end/status).

Color palette: header background `rgb(41, 128, 185)` (blue-600), text black, footer gray.

### XLSX layouts

Multi-sheet workbooks generated client-side with `exceljs`:

- **Report workbook**: `Report` sheet (metadata), `Completed` sheet (task rows), `Deliverables` sheet, `By discipline` sheet (split bucket), `By status` sheet (split bucket), `Monthly series` sheet (yearly only).
- **Log workbook**: `Entries` sheet, `Deliverables` sheet.

Every sheet: frozen header row (ySplit: 1), bold header, autofilter on data sheets, date format `yyyy-mm-dd`, number format `#,##0`.

### Filename convention

`jiravision-<scope>-<stamp>.{pdf,xlsx,csv}` where scope is `report`, `log`, or `plan`, and stamp is the ISO date (YYYY-MM-DD).

## 15. Planner (phase 7, 2026-10-27)

### Planner page (`/dashboard/planner`)

The planner page has two main sections: extraction and plans list.

**Extraction section**: Two input modes (Paste Text, Upload PDF) with button toggle. Text mode shows a textarea with monospace font. PDF mode shows a drop zone with drag-and-drop support and file input. Both modes have an optional "Source name" field. The "Extract Plan with AI" button is full-width with a Loader2 spinner during extraction.

**Plans list section**: Each plan is a card with title, status badge (draft=yellow, promoted=green), summary (2-line clamp), horizon dates, created date, and action buttons (View, Delete for drafts). Empty state shows a centered message.

### Plan editor (`/dashboard/planner/[id]`)

The editor has three sections: header actions, plan details, and items list.

**Header actions**: Back button (ghost variant), Save Metadata (outline), Discard (outline), Promote to Tasks (default). All actions show Loader2 spinners during async operations. Promote is disabled when items.length === 0.

**Plan details section**: Title input, summary textarea (3 rows), horizon dates (read-only date inputs), status/source metadata text. All fields disabled for promoted plans.

**Items section**: SectionCard with "Add Item" button in the action slot. Each item is a bordered card with:
- Title input (saves on blur)
- Description textarea (2 rows, saves on blur)
- Three-column grid: Discipline (Select with "none" sentinel), Estimate (number input, 0-100), Cadence (Select with "none" sentinel)
- Three-column grid: Start Date (date input), Due Date (date input), Milestone (checkbox)
- Deliverable display (if present): muted background card with name and type
- Delete button (outline, top-right)

All fields disabled for promoted plans. Items save on blur via PATCH to `/api/planner/[id]/items/[itemId]`.

### Status badges

- **Draft**: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100`
- **Promoted**: `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100`

### Select sentinels

Discipline and Cadence selects use `"none"` as the sentinel value for "no selection" (not `""`, which Radix rejects). The client maps `"none"` to `null` before sending to the API.

### Deliberately absent (phase 8)

- Board view (kanban-style grouped by status or discipline)
- Grid view as a separate mode (the editor's item list is a table-like layout, but a dedicated Grid view with bulk actions is deferred)
- Cadence-based row generation (materializing dated rows from "generate my month")

## 16. Gantt view (phase 8, 2026-10-27)

### Gantt component (`components/planner/gantt.tsx`)

SVG/CSS grid component with the following structure:

**Layout**:
- Time axis at top (HEADER_HEIGHT = 40px)
- Lanes as rows (LANE_HEIGHT = 60px each)
- Lane label column on left (LABEL_WIDTH = 150px)
- Today marker as vertical dashed line (red, strokeDasharray="4 4")
- Horizontal scroll below md breakpoint

**Props**:
- `items: GanttItem[]` — array of items to render
- `groupBy?: "discipline" | "assignee"` — lane grouping (default: "discipline")
- `zoom?: "day" | "week" | "month"` — time scale (default: "week")
- `onItemMove?: (itemId: number, dayDelta: number) => void` — drag callback
- `onItemClick?: (item: GanttItem) => void` — click callback

**Responsive**: Uses ResizeObserver to track container width. Total width calculated from date range and zoom level. Horizontal scroll when content exceeds container.

**Keyboard navigation**: Arrow keys move selected item (left/right = ±1 day, up/down = ±7 days). Enter/Space selects bar. Focus visible with ring outline.

**Motion**: Respects `prefers-reduced-motion` media query. Disables drag animations and simplifies transitions when reduced motion is preferred.

### Gantt bar component (`components/planner/gantt-bar.tsx`)

Individual bar rendering within the Gantt:

**Regular items**: SVG rect with rounded corners (rx=4). Width calculated from duration and zoom. Position calculated from start date offset.

**Milestones**: Diamond shape (polygon) centered on the date. Size = height * 0.6.

**Color coding**:
- Done/completed: `hsl(var(--success))`
- In-progress: `hsl(var(--warning))`
- Todo/default: `hsl(var(--chart-1))`
- Milestone: `hsl(var(--primary))`

**Drag interaction**:
- Mouse down starts drag (cursor: grab → grabbing)
- Mouse move calculates day delta based on bar width
- Mouse up commits via onItemMove callback
- Visual feedback: opacity 0.7 during drag
- Touch support for mobile devices

**Tooltip**: Shows on hover (foreignObject with popover styling). Displays title, date range, and discipline. Hidden during drag.

**Accessibility**:
- `role="button"` with `aria-label` describing item and dates
- `aria-grabbed` attribute during drag
- `tabIndex={0}` for keyboard focus
- onKeyDown handler for Enter/Space

### Gantt controls (`components/planner/gantt-controls.tsx`)

Control panel above the Gantt:

**Zoom selector**: Select component with day/week/month options. Calendar icon. Width 120px.

**Group-by selector**: Select component with discipline/assignee options. Users icon. Width 150px.

**Help text**: "Use arrow keys to move selected item · Click bar for details" (text-xs, text-muted-foreground).

### Plan editor integration

**View mode toggle**: Button group with List and Gantt options. List icon + "List" label, GanttChart icon + "Gantt" label. Default variant for active mode, ghost for inactive.

**Gantt view section**: SectionCard with "Gantt View" title and GanttChart icon. Renders when `viewMode === "gantt"` and `items.length > 0`.

**Drag-to-move**: `handleItemMove` function calculates new dates from dayDelta, sends PATCH to `/api/planner/[id]/items/[itemId]`, updates local state on success, shows toast.

**Click-to-scroll**: `onItemClick` callback finds item in list view and scrolls into view with smooth behavior.

**URL state**: View mode, zoom, and groupBy persisted to URL query params (view, zoom, groupBy).
- PDF export of Gantt

## 17. AI Assistant (phase 9, 2026-10-27)

### Workspace assistant page (`/dashboard/assistant`)

Full-page chat interface with two-column layout:

**Sidebar (300px on lg+)**: Thread list with "New" button. Each thread shows title (truncated), message count, and delete button on hover. Active thread highlighted with primary background. ScrollArea for long lists.

**Main area**: Chat interface with header (Bot icon + "AI Assistant" title + description), message area (ScrollArea), and input footer.

**Message bubbles**:
- User messages: right-aligned, primary background, max-width 70%
- Assistant messages: left-aligned, muted background, max-width 70%, with Bot avatar
- References display: small text below assistant message showing sources (e.g., "6 log entries, 2 deliverables")

**Loading states**: Typing indicator (three bouncing dots) while waiting for response. Input disabled during loading.

**Empty state**: Centered Bot icon with helpful text and example questions.

### Site assistant chatbot (`components/landing-chatbot.tsx`)

Floating chatbot for public site:

**Button**: Fixed right edge (`right-4`), rounded-full, primary background, MessageSquare icon + "Assistant" label. z-50. It sits **above** the accessibility launcher, which owns the corner: `bottom-[calc(8.25rem+env(safe-area-inset-bottom))]`, `lg:bottom-[calc(5.25rem+…)]`.

**Dialog**: Card with fixed position (`right-4`, `bottom-[calc(12.25rem+…)]`, `lg:bottom-[calc(9.25rem+…)]` — clears the pill it opens from), max-h 500px or `calc(100dvh - 13.25rem)` (10.25rem from lg), width 22rem or calc(100vw-2rem). z-50.

**Header**: Primary background, Avatar with "JV" fallback, "JiraVision Assistant" title, close button (X icon).

**Content**: ScrollArea with message bubbles. Assistant messages left-aligned with primary/10 background. User messages right-aligned with muted background. Max-width 80%.

**FAQ suggestions**: Shown when messages.length <= 2. Three buttons with common questions from page-specific knowledge base.

**Footer**: Input field + Send button. Disabled during loading.

**Loading indicator**: Three bouncing dots in assistant message style.

### API integration

**Workspace assistant**: `POST /api/assistant/workspace` with `{question, threadId?}`. Returns `{answer, references, dataAsOf, threadId}`. Optimistic UI: add user message immediately, remove on error.

**Site assistant**: `POST /api/assistant/site` with `{question, pathname}`. Returns `{answer, source}`. Source is "keyword" (tier 1) or "gemini" (tier 2).

**Error handling**: Toast notifications for failures. Fallback messages for Gemini errors. Rate limit messages for 429 responses.

### Accessibility

- ARIA labels on buttons and inputs
- Keyboard navigation (Enter to send, Escape to close chatbot)
- Focus management (input focuses on dialog open)
- Screen reader friendly message structure

## 18. AI Assistant completion (phase 9b, 2026-10-27)

### Top-bar assistant panel (`components/assistant-panel.tsx`)

A Popover, not a dialog: it sits in the action cluster and must not take the page away from the member.

**Trigger**: ghost icon Button, `h-9 w-9 rounded-full border border-border bg-card hover:bg-muted`, Bot icon at `h-4 w-4`. Deliberately identical in shape to the notifications bell beside it, so the cluster reads as one row of round controls. `aria-label="Open AI assistant"` — the trigger is an icon and nothing else.

**Placement**: desktop only (`{!isMobile && <AssistantPanel />}`), immediately before `<NotificationsBell />`. The mobile bar already carries the menu and the bell; a second popover would not fit.

**Content**: `align="end"`, width `min(24rem, calc(100vw - 2rem))`, `p-0` so the header, scroll area and footer each own their padding and the borders reach the edges.

**Header**: `border-b px-3 py-2`, Bot icon in `text-primary` + "AI Assistant" at `text-sm font-medium`, and a "Full page" link (Maximize2 at `h-3 w-3`, `text-xs text-muted-foreground hover:text-foreground`) to `/dashboard/assistant`. The panel is the short form; the escape hatch to the long form is always visible.

**Empty state**: one line of `text-xs text-muted-foreground` explaining the scope, then three suggestion buttons — `variant="outline" size="sm"`, `h-auto w-full justify-start py-2 text-left text-xs`. Full width and left-aligned so they read as questions, not as controls.

**Messages**: ScrollArea `h-[20rem] px-3 py-2`. Bubbles at `max-w-[85%] rounded-lg p-2 text-xs` — one size down from the full page's `max-w-[70%] p-3 text-sm`, because the panel is 24rem wide and a 70% bubble would wrap every sentence. User right on `bg-primary text-primary-foreground`, assistant left on `bg-muted` with a `h-5 w-5` Bot avatar. References render as a `text-[10px] opacity-70` "Sources:" line under a `border-t border-border/30` rule.

**Loading**: Loader2 `h-3 w-3 animate-spin` + "Thinking…" at `text-xs`, and the submit button swaps its Send icon for the same spinner. No bouncing dots here — the full page has room for them, a 24rem popover does not.

**Footer**: a real `<form>` with `onSubmit`, so Enter sends without a keydown handler. Input `h-8 text-xs`, `maxLength={2000}` (the length the API accepts), submit Button `h-8 w-8`.

**Scrolling**: the effect targets `[data-radix-scroll-area-viewport]`, not the ScrollArea root — the Radix root is `overflow-hidden` and only clips, so scrolling it is a no-op that looks like a stuck conversation.

### "Ask about this period" affordances

Both entry points are links, not buttons: they navigate, and styling a navigation as a control is the kind of lie a design system should not tell.

**Report builder** (`app/dashboard/reports-work/reports-client.tsx`): under the page description, `inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline` with a Bot at `h-3.5 w-3.5`. Label "Ask the assistant about {period label}" — the label names the period, so the member can see the scope before clicking. It sits outside the action cluster on purpose: that cluster already carries ten buttons, and a question is not an operation on the report.

**Work log** (`app/dashboard/worklog/worklog-client.tsx`): in the view toolbar's day row, after "Today", as a ghost `size="sm"` Button with `asChild` around the Link so it matches the neighbouring controls at `h-7 gap-1 px-2 text-xs`. Label "Ask about this day". The day it asks about is `state.day` — the day the URL already owns, so the link and the screen can never disagree.

**The link itself**: `lib/assistant/ask.ts` owns the wording and the encoding. `/dashboard/assistant?q=…` is asked once (a ref guard makes the effect one-shot) and then the param is replaced away, so a refresh does not ask the same question again.
