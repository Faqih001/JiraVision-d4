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
| 20 | Accessibility menu (on-site, no third-party widget) | `lib/accessibility.ts` (state + `data-jv-*` attribute map + pre-paint `bootstrapScript`), `app/accessibility.css` (the visual engine), `components/accessibility/accessibility-widget.tsx` (launcher + panel, mounted in `app/layout.tsx`) | 5 profiles (visual-impairment, seizure, colour-vision, ADHD, learning) + 8 content toggles + text size/line height/text spacing (3 steps each) + 8 colour modes + reading guide/mask + 2 cursors + read-aloud (Web Speech) + tooltips (`data-jv-tip` from `aria-label`/`title`, MutationObserver). Persisted in `jv-accessibility-v1`, restored before first paint, applied site-wide incl. dashboard; footer "Accessibility settings" opens the panel via `jv-open-accessibility`. Two entry points: the launcher in the widget (public site, bottom-left) and `components/accessibility/accessibility-launcher.tsx` (workspace, bottom-right above the assistant pill) — the public one stands down on `/dashboard/*` so only one is ever on screen. Colour modes are one-at-a-time (`EXCLUSIVE_GROUPS`) because they rewrite the palette tokens. Guarded by `tests/unit/accessibility.test.ts` (18 tests: no inert toggle, no orphan attribute, attribute/keys bijection) |
| 21 | Printable one-pager | `app/(marketing)/one-pager/page.tsx`, `content/one-pagers.ts`, `components/features/print-button.tsx` | Single consolidated company one-pager (facts pulled from live content files), print-only CSS; NOT per-product |
| 22 | Legal docs with sticky numbered TOC | `components/sections/legal-doc.tsx`, `content/legal.ts`, pages `/terms /privacy /cookies /legal-notice /accessibility` | Anchors verified (V2-5); print button + cross-doc links |
| 23 | Chatbot (owner decision D1 — kept) | `components/landing-chatbot.tsx`, mounted in root `app/layout.tsx` (site-wide incl. dashboard) | Keyword-matched FAQ responder with fixed stale-closure bugs, aria-labels, Escape-to-close, lucide icon (emoji removed); unverifiable claims softened to point at pricing/contact |
| 24 | Chrome: topbar (dismissible, status chip, docs link), scroll-aware navbar (compact h-20→h-14, hide/reveal, mega-menu FeaturedCards, mobile Sheet drawer), editorial footer (closing CTA + working newsletter, status chip, theme switcher, wordmark flourish, back-to-top, cookie-preferences, accessibility-settings trigger, Translate gadget) | `components/layout/{announcement-bar,navbar,footer,theme-toggle,google-translate}.tsx`, `app/(marketing)/layout.tsx` | The 2026-10-23 `LanguageSelector` (en/sw/fr dictionaries) was deleted on 2026-10-25: it translated a handful of chrome strings only, so every page body stayed in English — replaced by Google Translate in the footer (row 28) |
| 25 | Bottom bar: mobile persistent nav (Home/Pricing/Search/Menu, active dot, safe-area, hide-on-scroll-down) + desktop floating contextual bar (reading-progress %, CTA, dismiss persisted in sessionStorage) | `components/layout/bottom-bar.tsx` | Search tab dispatches `jv-open-search`; Menu opens the navbar drawer |
| 26 | `/faq` data-driven explorer (35 entries, search + category chips + deep links `?q=`/`?category=`), `/changelog` timeline | `app/(marketing)/faq/{page.tsx,faq-explorer.tsx}`, `content/faq.ts`; `app/(marketing)/changelog/page.tsx`, `content/changelog.ts` | FAQ questions indexed into Cmd+K with deep links |
| 27 | Product/solutions/about/careers rebuilt on the page kit | `app/(marketing)/products/*` ×4, `solutions/*` ×4 (17–18 sections), `about/` (16), `careers/` + `components/features/careers-board.tsx` | Content in `content/{products,solutions,about,careers}.ts` |
| 28 | Footer translation (Google Translate) | `components/layout/google-translate.tsx`, styles in `app/globals.css`, disclosure in `content/legal.ts` (`translation-by-google`) | Replaces the deleted `jv-locale` scaffold. Collapsed to a "Translate" button; the `translate_a/element.js` script is requested **only** when a language is chosen (nothing third-party loads on first paint). Uses the widget's own `autoDisplay: false` combo, so the full Google language list ships with it — no hard-coded catalogue. Choice persisted in `jv-translate-lang`; the widget's `googtrans` cookie is cleared and the page reloaded by "Show original". Banner frame + "Original text" tooltip dialog hidden by CSS; Google branding link kept (ToS requirement). Machine translation of marketing claims is labelled non-authoritative in the Cookie Policy |

| 29 | Workspace chrome (top bar, account menu, notifications, assistant, accessibility entry) | `components/dashboard-layout.tsx`, `components/theme-switch.tsx`, `components/notifications-bell.tsx`, `components/accessibility/accessibility-launcher.tsx`, `components/landing-chatbot.tsx`, `components/layout/google-translate.tsx`, `lib/language-flags.ts` | Every top-bar control is bordered (`border-border bg-card`): the dual-icon theme switch, the language picker, the bell, the avatar. The switch slides a knob with keyframes, not transitions — `app/layout.tsx` passes `disableTransitionOnChange`, which freezes transitions for exactly the frames a theme swap takes (see DESIGN_SYSTEM §9). The account menu is one `AccountMenuContent` shared by the top bar and the sidebar footer: Home (leaves for the public site), Settings, Billing, one appearance row whose icon is the mode the click goes to ("Switch to light mode" / "Switch to dark mode"), Log out. The notification panel is a Popover rather than a DropdownMenu because a menu item unmounts the feed the moment it is opened; it keeps the Neon live query with the 30s polling fallback, adds All/Unread filters, day headers, per-row read/unread, a connection chip and skeleton/empty/offline states. The workspace language control is a flag list, not Google's `<select>`: its options read "Spanish - Español (Latin America)" and cannot fit a 36px pill. It is a Popover + Command over the same widget — searchable, one row per language, flag from `lib/language-flags.ts`, native name first, plus an "Original (English)" row — and picking a row writes Google's own select so the translation, the `googtrans` cookie and the language catalogue stay Google's. Google's container is clipped (`.jv-translate-engine`), never `display: none`, because the widget reads and writes it, and both it and the portalled panel are marked `notranslate` so the picker's own labels survive a page translation. Exactly one Google translate container mounts at a time — top bar at ≥768px, sidebar drawer below — because the widget binds to a single element id per document. Guarded by `tests/unit/dashboard-chrome.test.ts` (21 tests: five actions, first one Home, no href to a route that does not exist, borders present, animation-not-transition, one theme icon, no empty-valued Radix option, flag and label parsing) |

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
| Lighthouse 90+ perf pass, a11y audit pass | V2-6d ran as a QA/cleanup pass but no Lighthouse or automated a11y run was ever recorded. A11y was handled by construction instead (single `<main>` per route, `aria-pressed`/`aria-labelledby` on filters, `prefers-reduced-motion` kill-switch, token contrast) rather than measured. A visitor-facing **accessibility menu** shipped 2026-10-25 (row 20) — that is self-service adjustment, not an audit: still unmeasured | Not verified |

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
- **All four previously-orphaned chat endpoints are wired (2026-10-25).** Nothing under `/api/chat*`
  is unreachable now:
  - `[chatId]/mute` — `PATCH` drives the row mute toggle, the conversation header and the members
    rail. Muting is enforced server-side too: `notifyMentions()` in `app/api/chat/api-helpers.ts`
    skips muted participants, so mute actually silences the bell instead of only swapping an icon.
    The unread badge still counts on the row — mute hides noise, not messages — which is why the
    header total excludes muted chats while "Mark all read" does not.
  - `[chatId]/read` — `POST` advances `chat_participants.last_read`, the only thing that clears
    `unreadCount` server-side. Called on chat open, on every poll that delivers somebody else's
    message, and in bulk from the header's "Mark all read". Before this the marker never moved, so
    unread counts could only ever grow.
  - `messages/[messageId]/permanent-delete` — `DELETE`, reachable from a soft-deleted row behind an
    `AlertDialog` confirm. Ownership is enforced server-side (403 unless `senderId === userId`).
  - `chat/notifications` — `GET`/`POST`/`DELETE` back the "@ Me" rail: click an item to jump to its
    chat (or to `metadata.link` for pre-chat rows), bulk mark-read, per-item dismiss. `GET` takes an
    optional `type` filter, which must be applied in SQL rather than in the caller because `limit`
    is evaluated first — a client-side `.filter(type === "mention")` let a busy user's newer
    task/system rows push every mention out of the window.
- **Toasts render.** `components/ui/toaster.tsx` existed but `<Toaster />` was never mounted, so all
  376 `toast()` call sites across 40 files resolved into a store nothing read — every success and
  error message in the dashboard was silently dropped. It is now mounted in `app/layout.tsx`. The
  duplicate store `components/ui/use-toast.ts` (byte-identical apart from formatting, used by three
  ethical-metrics modals) was deleted and its importers repointed at `hooks/use-toast.ts`, the one
  the Toaster consumes.

## 5. Documentation, webinars, case studies and blog (rewritten 2026-10-23/24/25)

All four were rebuilt around a single rule: **one content module drives both the index and the
detail page**, so a card can never link to an entry that does not exist. Unit tests enforce it.

| Route | Content module | What it renders |
|---|---|---|
| `/resources/documentation` + `/[slug]` | `content/documentation.ts` (29 docs, 6 categories) | Searchable index, category browse, FAQ, developer resources; reader with derived section nav, in-doc search, copy, Content/Examples/Endpoints tabs |
| `/resources/webinars` + `/[slug]` | `content/webinars.ts` (3 sessions) | Session outlines with working search + topic filters; detail page shows the outline, related docs, related product page and the live dashboard route. Renders "No recording published" unless a `videoUrl` is added |
| `/resources/case-studies` + `/[slug]` | `content/case-studies.ts` (3 scenarios) | Illustrative deployment scenarios (fictitious Acme/GlobalTech/StartupX) with a visible banner: situation → ordered setup steps (each linking to the real route + doc) → measures that state where the number is computed. No result figures, no attributed quotes |
| `/resources/blog` + `/[slug]` | `content/blog.ts` (6 posts, 4 categories) | Index with search, category chips and real per-category counts, one featured card, and an explicit "what you will not find here" list; reader with a sticky in-page search + derived table of contents, related docs, product link and the live dashboard route, working copy-link share, and prev/next navigation. No bylines, no result figures, no view/like counters |

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


## 7. Worklog capture (phase 1, 2026-10-26)

- The evidence layer for daily/weekly/monthly/yearly reports exists as data, not as a page. Ten
  tables (`task_events`, `work_log_entries`, `deliverables`, `work_reports`, `work_report_recipients`,
  `agent_plans`, `plan_items`, `assistant_threads`, `assistant_messages`, `ai_usage_daily`) and three
  nullable `tasks` columns (`start_date`, `discipline`, `source_plan_id`) are declared in
  `drizzle/schema.ts` and created by `npm run db:worklog` — a raw-SQL additive migration. `drizzle-kit
  push` is deliberately not used: it can remove columns the schema file does not declare, and this
  database is production. `tests/unit/schema-safety.test.ts` enforces that the script stays additive.
- Status changes are recorded from the five routes that write `tasks.status`: `/api/tasks/[id]` PUT,
  `/api/tasks/bulk` update, `/api/dashboard/tasks` PUT, and the test-mode twins `/api/test/tasks/[id]`
  PUT and `/api/test/tasks/bulk` update. The insert happens before the notification branches, so the
  log does not depend on anyone being worth notifying. A capture failure logs
  `[task_events] capture failed` and never fails the user's save — until the migration has been run
  against an environment, that is the line to look for.
- Deliberately not captured, and stated in `lib/worklog/capture.ts` so the omissions are decisions:
  creation is `tasks.created_at`; deletion cascades a task's events away with it, so a `deleted` row
  would delete itself; the kanban drag/reorder routes mutate `kanban_tasks`, not `tasks`, so a board
  drag produces no event.
- Vocabulary has one owner each: `lib/cadence.ts` (`one-off|daily|weekly|monthly|yearly`, the latter
  two new) and `lib/roles.ts` (`WORK_DISCIPLINES` with labels, icons, colours and a report template
  per discipline). `tests/unit/worklog-reports.test.ts` fails if either is re-declared elsewhere.
- There is **no capture-only story any more**: phase 2 (`/dashboard/worklog`, see §8) is the UI that
  reads this back. The log is empty until a task's status actually moves or an entry is logged.

## 8. Worklog UI (phase 2, 2026-10-26)

- `/dashboard/worklog` — the day view that reads back what phase 1 captured, plus the record of work
  that was never a task. Eleven sections on one page, every one visible in every view: totals for the
  range, quick add (one line, optional `15m` / kind / discipline), filters (search, task, kind,
  discipline by group, deliverable state, date presets), the view toolbar, the log itself in five
  renderings (`day`, `week`, `list`, `board`, `heat`), the deliverables board, the status-change
  timeline read from `task_events`, time by task, the discipline split, the kind mix with open
  blockers, and coverage with its gap days.
- Full CRUD on entries and deliverables through dialogs with inline validation; a bulk bar over a
  selection with exactly the five actions the API accepts (`delete`, `set-task`, `re-date`,
  `set-kind`, `convert-deliverable`); CSV export built client-side from the rows you ticked — the control is on the
  bulk bar, so an export is always a deliberate act, and a whole-range file is phase 5's job; every control
  mirrored into the URL, so a view is a link you can send someone; the member's own day resolved through their own
  timezone. `/dashboard` gained a "Today" strip from the same summary endpoint.
- Server routes: `/api/worklog/entries`, `…/entries/[id]`, `…/entries/bulk`, `/api/worklog/deliverables`,
  `…/deliverables/[id]`, `/api/worklog/summary`. All six are session-gated and scope every read and
  write by `user_id` in SQL; writes go through one whitelist per shape (`readEntryCreate`,
  `pickEntryUpdates`, `readBulkRequest`, `readDeliverableCreate`, `pickDeliverableUpdates`) so a
  request body can never carry a column the client is not allowed to set. A foreign key is not
  treated as authorization: a deliverable attached to a row is checked as this member's, not merely
  as existing.
- The work-discipline vocabulary is now 75 disciplines in 10 category groups, and the five ids shipped
  in phase 1 keep their spelling, so existing rows and saved preferences stayed valid — this phase
  added **no migration**.
- **Deliberately absent.** A report is built from a period, not from a ticked selection, so the bulk bar never
  grew a "group into report draft" action — see §9. PDF and XLSX export (phase 5), the team/admin day view
  (phase 4), the Gantt (phase 8). Nothing on the page pretends to do these.
- **Still separate dimensions.** `lib/roles.ts` holds work classifications only. Job titles,
  departments and project roles are not in it and are not collapsed into it; they arrive with the
  phase-15 role packs and the phase-17 onboarding. A discipline preference is a display filter —
  every read is scoped by `user_id` in SQL regardless of what a member has switched on.
- Guards: `tests/unit/worklog-{day,entries,quick-add,fields,view-state,bulk,summary,api,page}.test.ts`
  — nine files, and the suite is 36 files / 711 tests. `worklog-api` and `worklog-page` sweep the
  source of every route and every section, so a later phase that drops a control fails a test instead
  of a code review.

## 9. Period work reports (phase 3, 2026-10-26)

- `/dashboard/reports-work` — one member's account of one period, built from their own work log. Twelve cards:
  the period picker, the draft list, and the ten report sections in the order the *template* chooses, so a
  technician's report opens with deliverables and a developer's with completed actions. Nothing is behind a tab
  and no section is missing: `sectionsFor(template)` drives the list and
  `tests/unit/report-page.test.ts` fails if a template points at a section with no card.
- Five period types — daily, weekly (ISO Mon–Sun), monthly, yearly, custom — resolved to an exact `[start, end)`
  in the member's own timezone by `lib/reports/period.ts`. A yearly report is twelve month buckets, not 365 rows.
- Every number is computed, never typed. `lib/reports/aggregate.ts` reads the author's own entries, deliverables,
  `task_events` transitions, tasks and forward plan items and produces fifteen metrics, six row lists, four split
  buckets and a period series. Completion comes from `task_events` (`to_status` plus `at`), not
  `tasks.updated_at`, so a task edited yesterday does not look finished today.
- §6's drill-down promise is implemented literally: each computed card's badge *is* the button, expansion is
  `?open=<section>` in the URL (so an expanded report is a link you can send), and the row ids behind a count
  print once open — `task:12`, `entry:7`, `event:31`. The chart cards carry the same ids under
  "Which rows make these bars?". A row links to the real work log filtered to the period
  (`?v=list&p=custom&from=&to=`), blockers add `&kind=blocker`, deliverables add `&dlv=1`; a `nextPeriod` row says
  in words that plans get their page in a later phase rather than linking to a 404.
- Save / draft, recompute, delete. `Save draft` writes the title, the template and the prose the member typed —
  never a metric; `Recompute` re-runs the aggregation and replaces the stored snapshot; `Delete` is a
  draft-only, confirmed act. The page always states which figures it is showing — "Figures as saved" for a
  stored snapshot, "Live preview — not saved yet" for a fresh read — because a report that silently disagrees
  with itself is the failure §6 was written to prevent.
- Five templates (`general`, `engineering`, `technical`, `assurance`, `creative`), chosen automatically from the
  discipline the period's work carries and switchable with `?tpl=`. A template picks the section order, the 5-6
  leading KPI tiles and the chart set (time by discipline · kind mix · tasks by status · tasks by priority · the
  period series). No chart exists that its own template does not draw, and `lib/reports/charts.ts` pins which
  measure each bar is — minutes or a count — so a tooltip unit cannot drift from the bar under it.
- Server routes: `/api/reports/work` (list + create), `…/preview`, `…/[id]` (read, patch, delete),
  `…/[id]/recompute`, over one `_shared.ts`. All four are session-gated and put `user_id` in the SQL of every
  read; each read is capped (3000 entries, 1000 events, 1000 tasks, 500 deliverables, 200 plan items) and the
  draft list at 100. Writes go through `readReportCreate` / `pickReportUpdates` / `readContent`, and a forbidden
  key is refused out loud rather than dropped — `status`, `userId`, `metrics`, `revisionOf`, `submittedAt` and
  `recipients` in a body produce a 400 that says which one.
- **No migration.** `work_reports` and `work_report_recipients` were created by phase 1 and are unchanged; this
  phase writes `period_*`, `template`, `title`, `content` and `metrics`, pins `status` to `draft`, and never
  touches the recipients table or the lifecycle columns.
- **Deliberately absent** (phases 4, 5, 9): submit / lock / revise, recipients and the default reporting line,
  `/dashboard/reports-work/inbox`, ack and return, notifications, the "Draft summary from my data" and "Polish
  this section" AI buttons, PDF and XLSX, the admin team view. The page has no disabled placeholder for any of
  them, and `tests/unit/report-page.test.ts` fails if a later edit adds a lifecycle write to these files.
- Guards: `tests/unit/report-{period,aggregate,templates,fields,view-state,api,page,row-sections,charts}.test.ts`
  — nine new files, and the suite is 45 files / 912 tests. `report-api` and `report-page` sweep the source of
  every route and every card, so a phase-4 change that drops a control fails a test instead of a review.
