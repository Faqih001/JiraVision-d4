# JiraVision Features

Inventory of what is actually shipped, verified by locating each feature's files. All paths
relative to repo root. The V2 brief's 15-item feature list (§5b "Feature set") is covered
below with its real implementation status; §3 lists gaps honestly.

## 1. Shipped features

### Homepage interactive demos (19 sections, `app/(marketing)/page.tsx`)

| # | Feature | UI | Logic / data | Also mounted on |
|---|---|---|---|---|
| 1 | Sprint sandbox board: auto-draft with per-ticket rationale, load bars, wellbeing meter, rebalance proposals with Apply/Apply all/Reset | `components/sections/demo-sandbox.tsx` | `lib/sandbox/plan.ts` (pure deterministic), `content/sandbox-demo.ts` | `/products/ai-scrum-master` |
| 2 | Gamification playground: 8 behaviours → branch XP → 3×3 skill tree + team level, guardrail switches visibly change output | `components/sections/demo-gamification.tsx` | `lib/gamification/xp.ts`, `content/gamification-demo.ts` | `/products/gamification` |
| 3 | Workload & equity explorer: recharts bars, 4 metrics, >130%-of-mean watch rules, "Why this number?" data-driven panel, accessible table + aria-live | `components/sections/demo-equity.tsx` | `content/equity-demo.ts` | `/products/ethical-metrics` |
| 4 | Calculators: burnout 5-factor weighted model (bands + top driver) and ROI (savings/cost/net/payback, honest "doesn't pay for itself" branch) | `components/sections/demo-calculators.tsx` | `lib/calculations/burnout.ts`, `lib/calculations/roi.ts` (pure functions) | `/products/team-wellbeing`, `/pricing` (ROI) |
| 5 | Templates carousel: embla, category filter chips, counter | `components/sections/templates-carousel.tsx` | `content/templates.ts` (12) | — |
| 6 | Keyboard-first section: live buttons that dispatch `jv-open-search` / `jv-open-help`; kbd cheat table | `components/sections/keyboard-first.tsx` | events from `components/features/site-search.tsx` | — |
| 7 | Seat-slider pricing teaser: seats 5–100, monthly/annual −20%, per-plan totals | `components/sections/pricing-seats.tsx` | `seatModel` in `content/home.ts` | — |

### Global interaction features

| # | Feature | Files | Verified behavior |
|---|---|---|---|
| 8 | Cmd/Ctrl+K search palette + help + shortcuts | `components/features/site-search.tsx`, index in `content/search-index.ts` (pages/products/solutions/resources/blog/FAQ/changelog) | Shortcuts (from code): `⌘K`/`Ctrl+K` toggle palette; `?` help dialog; `g h` → `/`, `g p` → `/pricing`, `g c` → `/contact`, `g s` → `/signup`; `Esc` dismiss; suppressed while typing in inputs. Recent searches: localStorage, max 5, via `useSyncExternalStore`. Suggested group on empty query; Actions → keyboard help. Mounted once in `app/(marketing)/layout.tsx` |
| 9 | Pricing page: full calculator island (plan pill + seats + billing toggle driving totals) + ROI cost-vs-time estimator with illustrative-model disclaimer + comparison table + anchor nav + 8-item FAQ | `app/(marketing)/pricing/page.tsx`, `pricing-calculator.tsx`, `content/pricing-page.ts`, `lib/calculations/roi.ts` | |
| 10 | Templates library `/templates`: all 12 templates, search + category chips + sort, per-template Radix Dialog, working Copy checklist (clipboard → execCommand → textarea fallback), Download .md (Blob), request form POSTing to `/api/contact` | `app/(marketing)/templates/{page.tsx,templates-library.tsx,template-request-form.tsx}` | |
| 11 | `/compare` hub + 5 pages (generic-jira, asana, linear, trello, notion): semantic tables, no competitor prices/logos, "verify on their site" note, demos mapped per angle | `app/(marketing)/compare/page.tsx` + 5 subdirs, `content/compare.ts` | |
| 12 | `/migration` planner: source buttons, team-size slider, attachment/parallel-run switches, 28-item checklist + progress bar, .txt download, localStorage persistence (`useSyncExternalStore`) | `app/(marketing)/migration/{page.tsx,migration-planner.tsx,migration-plan.ts}`, `content/migration.ts` | Hour model `(base + perSeat×size) × sourceFactor`, labelled illustrative |
| 13 | `/roadmap`: now/next/later with explicit commitment levels, "never on this roadmap" refusal band, priority process | `app/(marketing)/roadmap/page.tsx`, `content/roadmap.ts` | |
| 14 | `/status`: per-component manifest table, derived `overallStatus` (feeds topbar + footer chip), honest email-delivery "degraded" row, process-not-history incident wording | `app/(marketing)/status/page.tsx`, `content/status.ts`, chips in `components/layout/{footer,announcement-bar}.tsx` | Hand-maintained, no automated checks |
| 15 | Forms stack: contact page 3-tab forms (message/demo/quote with timezone detection), careers Apply dialog + general application | `components/forms/{contact-form-tabs,contact-form,demo-form,quote-form,apply-form,honeypot-field}.tsx`, `app/(marketing)/{contact,careers}` | RHF + zodResolver (`lib/forms/schemas.ts`), hidden honeypot, POST to route handlers |
| 16 | API route handlers: `/api/contact`, `/api/demo`, `/api/quote`, `/api/careers`, `/api/newsletter`, `/api/newsletter/confirm` (GET) | `app/api/*/route.ts`, pipeline in `lib/forms/handler.ts` | Order: honeypot → fake success (no learn-back); per-IP rate limit (`lib/rate-limit.ts`) — **default 3/min** via `formRoute` (brief said 5/min; only `/api/newsletter` uses `max: 5`); zod per-field errors; store via `lib/data/json-store.ts` adapters (`submissions.ts`, `subscribers.ts` in gitignored `data/*.json`); email via `lib/email.ts` (Resend if `JIRAVISION_RESEND_API`, else dev-log) |
| 17 | Newsletter double opt-in | footer capture (`components/layout/footer.tsx`) → pending record + confirm link → `GET /api/newsletter/confirm` → `/newsletter/confirm?status=ok|invalid` page (`app/(marketing)/newsletter/confirm/`) | `lib/data/subscribers.ts` |
| 18 | Cookie consent + analytics gating | `components/features/cookie-consent.tsx`, `lib/consent.ts`, `lib/analytics.ts` | Bar + preferences dialog (necessary locked); footer "Cookie preferences" re-open; Plausible adapter loads only after analytics consent + configured domain; `track()` no-ops pre-consent |
| 19 | Auth pages (restyle only; `useAuth` logic untouched) | `app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`, bare `app/(auth)/layout.tsx`, shared `components/auth/auth-shell.tsx` | Moved out of `(marketing)` into an `(auth)` route group on 2026-10-25 — URLs unchanged (route groups don't affect paths). The group layout renders only a skip link + `<main id="main">`: no Navbar, Footer, BottomBar, SiteSearch or CookieConsent (these pages never call `track()`, so no analytics needs gating). `AuthShell` is a full-viewport two-card split (`min-h-dvh md:h-dvh`, gap between cards, `rounded-lg`, `bg-foreground/55` scrim + `text-background`), image required on all four, and `imageSide` alternates: login/forgot-password image-left, signup/reset-password image-right. Form column scrolls internally (`overflow-y-auto` + `my-auto`, not `justify-center`) so the tall signup form never clips. |
| 20 | i18n scaffold | `lib/i18n/{config.ts,use-locale.ts}`, `content/i18n.ts`, `components/layout/language-selector.tsx` | Locales en/sw/fr actually exist; EN complete, sw/fr cover nav/footer chrome strings only; persisted via `jv-locale` localStorage, unprefixed routes |
| 21 | Printable one-pager | `app/(marketing)/one-pager/page.tsx`, `content/one-pagers.ts`, `components/features/print-button.tsx` | Single consolidated company one-pager (facts pulled from live content files), print-only CSS; NOT per-product |
| 22 | Legal docs with sticky numbered TOC | `components/sections/legal-doc.tsx`, `content/legal.ts`, pages `/terms /privacy /cookies /legal-notice /accessibility` | Anchors verified (V2-5); print button + cross-doc links |
| 23 | Chatbot (owner decision D1 — kept) | `components/landing-chatbot.tsx`, mounted in root `app/layout.tsx` (site-wide incl. dashboard) | Keyword-matched FAQ responder with fixed stale-closure bugs, aria-labels, Escape-to-close, lucide icon (emoji removed); unverifiable claims softened to point at pricing/contact |
| 24 | Chrome: topbar (dismissible, status chip, docs link), scroll-aware navbar (compact h-20→h-14, hide/reveal, mega-menu FeaturedCards, mobile Sheet drawer), editorial footer (closing CTA + working newsletter, status chip, theme + language switchers, wordmark flourish, back-to-top, cookie-preferences) | `components/layout/{announcement-bar,navbar,footer,theme-toggle,language-selector}.tsx`, `app/(marketing)/layout.tsx` | |
| 25 | Bottom bar: mobile persistent nav (Home/Pricing/Search/Menu, active dot, safe-area, hide-on-scroll-down) + desktop floating contextual bar (reading-progress %, CTA, dismiss persisted in sessionStorage) | `components/layout/bottom-bar.tsx` | Search tab dispatches `jv-open-search`; Menu opens the navbar drawer |
| 26 | `/faq` data-driven explorer (35 entries, search + category chips + deep links `?q=`/`?category=`), `/changelog` timeline | `app/(marketing)/faq/{page.tsx,faq-explorer.tsx}`, `content/faq.ts`; `app/(marketing)/changelog/page.tsx`, `content/changelog.ts` | FAQ questions indexed into Cmd+K with deep links |
| 27 | Product/solutions/about/careers rebuilt on the page kit | `app/(marketing)/products/*` ×4, `solutions/*` ×4 (17–18 sections), `about/` (16), `careers/` + `components/features/careers-board.tsx` | Content in `content/{products,solutions,about,careers}.ts` |

## 2. Backgrounds, chrome and content infrastructure (supporting, not "features")

- Background library + `Section`/`Reveal` system — see `DESIGN_SYSTEM.md` §5–8.
- Content layer: 21 typed `content/*.ts` files; JSON-file data store swappable for Supabase
  (`lib/data/json-store.ts`); `data/` gitignored.
- Fonts/metadata root: Fraunces + Inter in `app/layout.tsx`; `v0.dev` generator meta removed.

## 3. Promised in the V2 brief but NOT shipped (verified by absence)

| Brief item | Evidence | Status |
|---|---|---|
| "Find your fit" quiz personalising CTAs | SHIPPED 2026-10-24 (V2-7): `/fit-quiz` + `content/fit-quiz.ts` + `app/(marketing)/fit-quiz/fit-model.ts` (deterministic scoring, two vetoes, product-personalised CTAs) + 15 unit tests + e2e smoke scenario | Done |
| Roadmap/status **voting** | no `vote`-related code found in app/components/lib (only product-copy mention "Voting built into setup" in `content/products.ts:365`) | `/roadmap` and `/status` shipped without voting |
| Scroll-spy + copy-section-link on long-form pages | not present in `legal-doc.tsx` / TOC implementations (sticky numbered TOC with plain anchors only) | Partial: TOC yes, scroll-spy/copy-link no |
| Reading progress | exists only as the desktop bottom-bar float percentage, not per-article | Partial |
| Printable one-pagers **per product** | one consolidated `/one-pager` covering all products | Partial |
| Responsible-AI "transparency center" as a destination | shipped as pieces instead: homepage `ResponsibleAi` section, sandbox per-ticket rationale, equity "Why this number?" panel, `/products/ethical-metrics` refusal list — no standalone center route | Partial / redistributed |
| Playwright smoke tests + unit tests for calculator logic | SHIPPED: `tests/unit/` is 17 files / 212 tests under `npm test` (vitest) — burnout, ROI, XP, migration-plan, plan, fit-quiz, cms-registry, search-index, markdown-lite and the four resource catalogues. `tests/e2e/smoke.spec.ts` + `playwright.config.ts` run under `npm run test:e2e` | Done |
| SEO: sitemap, robots, OG/Twitter, JSON-LD | Shipped except JSON-LD. `app/sitemap.ts` and `app/robots.ts` generate at runtime (no static `public/` copies); the sitemap derives blog and changelog dates from the content modules, and robots disallows `/api/`, `/dashboard` and the four auth routes. 41 of 45 marketing pages export metadata — the exceptions are `login`, `signup`, `forgot-password` and `reset-password`, which are `"use client"` pages and therefore *cannot* export metadata. They inherit the root title in the browser tab, but robots already blocks them, so there is no indexing impact. **No `application/ld+json` exists anywhere in the repo** | Partial: JSON-LD not shipped |
| Lighthouse 90+ perf pass, a11y audit pass | V2-6d ran as a QA/cleanup pass but no Lighthouse or automated a11y run was ever recorded. A11y was handled by construction instead (single `<main>` per route, `aria-pressed`/`aria-labelledby` on filters, `prefers-reduced-motion` kill-switch, token contrast) rather than measured | Not verified |

## 4. Known behavior notes

- Rate limits are per-process memory (`lib/rate-limit.ts`) — fine on one server instance,
  not shared across serverless invocations.
- Forms store to local JSON via the adapter; in production (serverless) writes to
  `data/*.json` will not persist across cold starts until the hosted adapter lands
  (roadmap "Hosted data layer", listed as exploratory).
- Team emails currently do not send: `JIRAVISION_RESEND_API` returns 401 (see
  `PLACEHOLDERS.md`). Submissions still store and report success.
- `GoogleMap` on `/contact` renders only when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set;
  otherwise a fallback card links to Google Maps search (`components/google-map.tsx`).
- Legacy `/resources` fabrications: **documentation, webinars, case-studies and blog are all
  rewritten** (see §5). No `blocks launch` row remains in `PLACEHOLDERS.md` §4 — what is left there
  is owner-supplied material (a real customer reference, webinar recordings, confirmed bylines).
- **Chat has one implementation, not two.** `/dashboard/chat` is a self-contained V3 page that
  talks to `/api/chat*` directly and delivers messages by polling `GET /api/chat/messages?after=`
  every 12s — Neon Realtime covers notifications only, so the page does not claim realtime chat.
  The older `app/context/chat/ChatContext.tsx` + `components/chat/*` stack was never imported by
  anything and its provider hard-coded ~24 actions to `() => {}`, so it was deleted (2026-10-25)
  along with its orphaned clients `lib/api-chat.ts`, `lib/chat-client.ts`, `lib/socket-client.ts`,
  `lib/socket.ts`, `utils/socketUtil.ts` and the broken `server/websocket.ts`. The rest of the
  socket.io layer followed: `server.js`, `lib/websocket-manager.js`, both `socket.io*` deps, the
  `dev:socket`/`start:socket` scripts and `NEXT_PUBLIC_WEBSOCKET_URL`/`NEXT_PUBLIC_SOCKET_URL`.
  A persistent socket server could never run on Vercel anyway (see `REDESIGN_PLAN.md`), so polling
  is the delivery model rather than a fallback.
- Four chat endpoints have no client left and are working-but-unreachable: `[chatId]/mute` (the UI
  mutes through `[chatId]/settings` instead), `[chatId]/read` (the messages GET marks read on a
  full stream), `messages/[messageId]/permanent-delete`, and `chat/notifications` (the UI reads
  `/api/notifications`). Either wire them up or delete them.

## 5. Documentation, webinars, case studies and blog (rewritten 2026-10-23/24/25)

All four were rebuilt around a single rule: **one content module drives both the index and the
detail page**, so a card can never link to an entry that does not exist. Unit tests enforce it.

| Route | Content module | What it renders |
|---|---|---|
| `/resources/documentation` + `/[slug]` | `content/documentation.ts` (29 docs, 6 categories) | Searchable index, category browse, FAQ, developer resources; reader with derived section nav, in-doc search, copy, Content/Examples/Endpoints tabs |
| `/resources/webinars` + `/[slug]` | `content/webinars.ts` (3 sessions) | Session outlines with working search + topic filters; detail page shows the outline, related docs, related product page and the live dashboard route. Renders "No recording published" unless a `videoUrl` is added |
| `/resources/case-studies` + `/[slug]` | `content/case-studies.ts` (3 scenarios) | Illustrative deployment scenarios (fictitious Acme/GlobalTech/StartupX) with a visible banner: situation → ordered setup steps (each linking to the real route + doc) → measures that state where the number is computed. No result figures, no attributed quotes |
| `/resources/blog` + `/[slug]` | `content/blog.ts` (7 posts, 4 categories) | Index with search, category chips and real per-category counts, one featured card, and an explicit "what you will not find here" list; reader with a sticky in-page search + derived table of contents, related docs, product link and the live dashboard route, working copy-link share, and prev/next navigation. No bylines, no result figures, no view/like counters |

Shared behavior across all four:

- `generateStaticParams()` + `export const dynamicParams = false` on each `[slug]` route, so an
  unknown slug is a genuine framework **404**. Without this, `notFound()` inside the `(marketing)`
  group rendered the group boundary under HTTP 200 (dev streaming commits headers first) — curl
  reported 200 and only a real browser showed the truth. The blog also had a *static* directory
  (`blog/ai-scrum-master-guide/page.tsx`) shadowing the `[slug]` value; deleting it lets the dynamic
  route serve that slug.
- `lib/markdown-lite.ts` is the one parser behind both readers (`parseMarkdown`, `sectionsOf`,
  `blockMatches`, `slugifyHeading`, `wordCount`). Extracting it removed ~90 duplicated lines from
  `doc-reader.tsx`, fixed a real bug where a wrapped list item was split into a stray paragraph, and
  let the blog drop `dangerouslySetInnerHTML` — article bodies are typed blocks, never HTML strings.
  The blog's `readingMinutes()` derives from `wordCount()` at 200 wpm rather than being stated by hand.
- `app/sitemap.ts` and `content/search-index.ts` both derive their blog entries from `blogList`, so
  the Cmd/Ctrl+K palette and the sitemap cannot drift from the catalogue. `tests/unit/blog.test.ts`
  fails if they do.
- Server components compose, client islands interact: `doc-index.tsx` / `webinar-index.tsx` /
  `case-study-index.tsx` / `blog-index.tsx` hold the search and filter state; `blog-reader.tsx` holds
  the in-page search and copy-link state. The pages themselves are server components that only supply
  metadata.
- No nested `<main>` — `app/(marketing)/layout.tsx` already provides `<main id="main">`, and the
  duplicate landmark was an a11y defect on these pages. The root `app/not-found.tsx` (which *does* own
  the landmark for non-marketing 404s, and is embedded in every page's flight payload) was the last
  slate/gradient/indigo holdout and is now token-based.
- All colors are design tokens (`bg-card`, `bg-surface`, `border`, `text-clay`, `text-success`).
  The legacy slate/white/amber values ignored dark mode entirely. CTA bands use the homepage
  `bg-primary text-primary-foreground` idiom rather than a gradient (gradients were removed in
  Phase A).
- `components/newsletter-form.tsx` is shared by the footer and the CTA bands; it posts to the
  real `/api/newsletter` (5/min per IP, honeypot `company` field) and resolves against
  `--primary-foreground` on the inverse variant so it stays legible in dark mode.
- Guards: `tests/unit/documentation.test.ts` scans doc prose for `/resources/documentation/<slug>`
  references and fails on a dead one; `webinars.test.ts` and `case-studies.test.ts` assert every
  `relatedDocs` slug resolves, every `route`/`demoRoute`/`relatedProduct` maps to a real directory,
  and that no scenario asserts a result figure or an attributed quote. `blog.test.ts` additionally
  fails on a legacy byline, a percentage, an attributed quote, an engagement counter, raw HTML in a
  post body, or a search-index entry that is not in the catalogue.

## 6. Team workspace settings (V3-6)

- `/dashboard/team/settings` + `GET|PUT /api/team/settings`, `PATCH /api/team/members/[id]/role`.
- **GET is readable by any signed-in member** (the page renders read-only and reports
  `canManage: false`); **PUT and role changes require a super-admin** and return 403 otherwise,
  401 when unauthenticated. Verified by curl on 2026-10-24.
- Writes emit a `system` notification listing exactly what changed (team name, default member
  role, each notification switch), and role changes are journaled — the page shows the last 12.
- Pure logic lives in `lib/team-settings-model.ts` (no `lib/db` import) so vitest can exercise it:
  `tests/unit/team-settings-model.test.ts`, 17 tests.

