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
| 18 | Cookie consent + analytics gating | `components/features/cookie-consent.tsx`, `lib/consent.ts`, `lib/analytics.ts` | Bar + preferences dialog (necessary locked); the bar rests on top of the bottom-right stack (`bottom-[calc(13.25rem+env(safe-area-inset-bottom))]`, one geometry at every width) rather than covering the accessibility launcher and assistant pill; footer "Cookie preferences" re-open; Plausible adapter loads only after analytics consent + configured domain; `track()` no-ops pre-consent |
| 19 | Auth pages (restyle only; `useAuth` logic untouched) | `app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`, bare `app/(auth)/layout.tsx`, shared `components/auth/auth-shell.tsx` | Moved out of `(marketing)` into an `(auth)` route group on 2026-10-25 — URLs unchanged (route groups don't affect paths). The group layout renders only a skip link + `<main id="main">`: no Navbar, Footer, BottomBar, SiteSearch or CookieConsent (these pages never call `track()`, so no analytics needs gating). `AuthShell` is a full-viewport two-card split (`min-h-dvh md:h-dvh`, gap between cards, `rounded-lg`, `bg-foreground/55` scrim + `text-background`), image required on all four — each step has its own photo, and none of the four is used anywhere else on the site (login: a teammate at a task board; signup: a colleague at a laptop with a whiteboard behind; forgot-password: a desk with notebook and coffee; reset-password: a clean desk with laptop, tablet and phone) — and `imageSide` alternates: login/forgot-password image-left, signup/reset-password image-right. Form column scrolls internally (`overflow-y-auto` + `my-auto`, not `justify-center`) so the tall signup form never clips. Above the form, one row carries a Home pill back to the marketing site and the `lazy` translator — with no navbar on these routes, that row is the only way out besides the form itself. |
| 20 | Accessibility menu (on-site, no third-party widget) | `lib/accessibility.ts` (state + `data-jv-*` attribute map + pre-paint `bootstrapScript`), `app/accessibility.css` (the visual engine), `components/accessibility/accessibility-widget.tsx` (launcher + panel, mounted in `app/layout.tsx`) | 5 profiles (visual-impairment, seizure, colour-vision, ADHD, learning) + 8 content toggles + text size/line height/text spacing (3 steps each) + 8 colour modes + reading guide/mask + 2 cursors + read-aloud (Web Speech) + tooltips (`data-jv-tip` from `aria-label`/`title`, MutationObserver). Persisted in `jv-accessibility-v1`, restored before first paint, applied site-wide incl. dashboard. Both entry points are the foot of the bottom-right stack (`right-4`, `bottom-[calc(5rem+env(safe-area-inset-bottom))]`), with the assistant pill (`fixed right-4 h-12`, `bottom-[calc(9.25rem+…)]`) above them and the cookie bar above the pill (`13.25rem`) — the same levels at every width. The foot is 80px up rather than 16px because the footer's Back-to-top button is in that corner from `md` and ends 64px above the page bottom. Since 2026-10-28 nothing on the stack reacts to the banner — the bar is what lifts, so no control can end up underneath it by forgetting a state check. Launchers: `accessibility-widget.tsx` (public site) and `components/accessibility/accessibility-launcher.tsx` (workspace); the public one stands down on `/dashboard/*` so only one is ever on screen. The footer's "Accessibility settings" button was removed on 2026-10-28: the floating launcher is the panel's only trigger, and the `/accessibility` legal page stays in the footer's link list. Colour modes are one-at-a-time (`EXCLUSIVE_GROUPS`) because they rewrite the palette tokens. Guarded by `tests/unit/accessibility.test.ts` (20 tests: no inert toggle, no orphan attribute, attribute/keys bijection) and the "accessibility entry point" block in `tests/unit/dashboard-chrome.test.ts` |
| 21 | Printable one-pager | `app/(marketing)/one-pager/page.tsx`, `content/one-pagers.ts`, `components/features/print-button.tsx` | Single consolidated company one-pager (facts pulled from live content files), print-only CSS; NOT per-product |
| 22 | Legal docs with sticky numbered TOC | `components/sections/legal-doc.tsx`, `content/legal.ts`, pages `/terms /privacy /cookies /legal-notice /accessibility` | Anchors verified (V2-5); print button + cross-doc links |
| 23 | Chatbot (owner decision D1 — kept) | `components/landing-chatbot.tsx`, mounted in root `app/layout.tsx` (site-wide incl. dashboard) | Keyword-matched FAQ responder with fixed stale-closure bugs, aria-labels, Escape-to-close, lucide icon (emoji removed); unverifiable claims softened to point at pricing/contact |
| 24 | Chrome: topbar (dismissible, status chip, docs link), scroll-aware navbar (compact h-20→h-14, hide/reveal, mega-menu FeaturedCards, mobile Sheet drawer, language picker), editorial footer (closing CTA + working newsletter, status chip, theme switcher, wordmark flourish with a token-painted gleam sweeping through the outlined letters (`.jv-wordmark`, `app/globals.css`), back-to-top, cookie-preferences; the compliance row is one line from `md` up (a 768px tablet fits all three nowrap labels) and stacks below it, and it carries no legal links — those are the Legal column of the grid, linked once) | `components/layout/{announcement-bar,navbar,footer,theme-toggle,google-translate}.tsx`, `app/(marketing)/layout.tsx` | The 2026-10-23 `LanguageSelector` (en/sw/fr dictionaries) was deleted on 2026-10-25: it translated a handful of chrome strings only, so every page body stayed in English — replaced by Google Translate in the header (row 28). The footer's "Accessibility settings" button went on 2026-10-28 (row 20). The mega-menu starts at `xl`, not `lg` (row 30) — below `xl` the header narrows to brand, language, theme and the hamburger that opens its drawer, which is one accordion: the Navbar owns the open section, so opening "Solutions" closes "Products" |
| 25 | Bottom bar: the floating contextual bar (reading-progress %, CTA, dismiss persisted in sessionStorage), shown from `lg` | `components/layout/bottom-bar.tsx` | The persistent mobile nav (Home/Pricing/Search/Menu, active dot, safe-area, hide-on-scroll-down) was deleted on 2026-10-28: the marketing header and its drawer carry that navigation at every width, so the row was duplicate chrome sitting on top of the page. Its `jv-open-mobile-nav` event, the drawer's listener in `navbar.tsx` and the layout's footer spacer went with it |
| 26 | `/faq` data-driven explorer (35 entries, search + category chips + deep links `?q=`/`?category=`), `/changelog` timeline | `app/(marketing)/faq/{page.tsx,faq-explorer.tsx}`, `content/faq.ts`; `app/(marketing)/changelog/page.tsx`, `content/changelog.ts` | FAQ questions indexed into Cmd+K with deep links |
| 27 | Product/solutions/about/careers rebuilt on the page kit | `app/(marketing)/products/*` ×4, `solutions/*` ×4 (17–18 sections), `about/` (16), `careers/` + `components/features/careers-board.tsx` | Content in `content/{products,solutions,about,careers}.ts` |
| 28 | Translation (Google Translate) — one picker on every surface | `components/layout/google-translate.tsx` (`GoogleTranslateSelect`), `lib/language-flags.ts`, styles in `app/globals.css`, disclosure in `content/legal.ts` (`translation-by-google`) | The footer gadget is gone (2026-10-28): the flag-list picker that was the workspace's is now the app's only translator, mounted by each surface's own header — marketing navbar (one mount, every width), sign-in card, workspace top bar (sidebar drawer below 768px), `/onboarding`, `/admin/cms`, `/admin/career`, `/admin/packs`. Exactly one Google container per page, because the widget binds one element id per document. `translate_a/element.js` is requested as a signed-in page opens and, on a public page (`lazy`), only when the picker is first opened — or when `jv-translate-lang` already holds a choice from an earlier visit, so nothing third-party loads on a first public paint. Uses the widget's own `autoDisplay: false` combo, so the full Google language list ships with it — no hard-coded catalogue. The choice and Google's `googtrans` cookie are domain-wide, so a language picked on a public page is in force in the workspace and the other way round; "Original (English)" clears both and reloads. Banner frame + "Original text" tooltip dialog hidden by CSS. Google's own `<select>` arrives empty and is filled a moment later, so the picker polls for a populated list instead of for the element alone — the old race left the panel with "0 languages" and only the Original row. Google's gadget (with its branding link) stays in the DOM as the clipped `.jv-translate-engine`, and the pill — which shows no logo — adds an `sr-only` "Translation by Google Translate" credit (ToS). Machine translation of marketing claims is labelled non-authoritative in the Cookie Policy |

| 29 | Workspace chrome (top bar, account menu, notifications, assistant, accessibility entry) | `components/dashboard-layout.tsx`, `components/theme-switch.tsx`, `components/notifications-bell.tsx`, `components/accessibility/accessibility-launcher.tsx`, `components/landing-chatbot.tsx`, `components/layout/google-translate.tsx`, `lib/language-flags.ts` | Every top-bar control is bordered (`border-border bg-card`): the dual-icon theme switch, the language picker, the bell, the avatar. The switch slides a knob with keyframes, not transitions — `app/layout.tsx` passes `disableTransitionOnChange`, which freezes transitions for exactly the frames a theme swap takes (see DESIGN_SYSTEM §9). The account menu is one `AccountMenuContent` shared by the top bar and the sidebar footer: Home (leaves for the public site), Settings, Billing, one appearance row whose icon is the mode the click goes to ("Switch to light mode" / "Switch to dark mode"), Log out. The notification panel is a Popover rather than a DropdownMenu because a menu item unmounts the feed the moment it is opened; it keeps the Neon live query with the 30s polling fallback, adds All/Unread filters, day headers, per-row read/unread, a connection chip and skeleton/empty/offline states. The workspace language control is a flag list, not Google's `<select>`: its options read "Spanish - Español (Latin America)" and cannot fit a 36px pill. That same picker is now the app's only translator (row 28) — `GoogleTranslateSelect` is one component mounted by every surface's header, so the workspace, the public site, the sign-in card, `/onboarding` and the three admin headers all drive the same widget. It is a Popover + Command over the same widget — searchable, one row per language, flag from `lib/language-flags.ts`, native name first, plus an "Original (English)" row — and picking a row writes Google's own select so the translation, the `googtrans` cookie and the language catalogue stay Google's. Google's container is clipped (`.jv-translate-engine`), never `display: none`, because the widget reads and writes it, and both it and the portalled panel are marked `notranslate` so the picker's own labels survive a page translation. Exactly one Google translate container mounts per page: the workspace's two slots (top bar at ≥768px, sidebar drawer below) are branches of one `isMobile` test, and every other header has a single mount. Guarded by `tests/unit/dashboard-chrome.test.ts` (33 tests: five actions, first one Home, no href to a route that does not exist, borders present, animation-not-transition, one theme icon, no empty-valued Radix option, flag and label parsing, and translator placement — each public and signed-in file mounts `GoogleTranslateSelect` exactly once, no file still references the deleted footer gadget, the `lazy` gate reads `const active = !lazy || requested || language !== null`, and the combo wait demands `combo.options.length > 1`) — plus the entry-point guards (both accessibility launchers claim the bottom-right corner, the footer carries no accessibility trigger) and the auth-card guard (four pages, four different Unsplash photos, each with an alt) and the wordmark-gleam guard (keeps the outline identity, paints with tokens not hex, and rests parked off the glyphs because the reduced-motion kill-switches shorten the animation instead of rewinding it) |

| 30 | Tablet zone (768–1279) is a first-class breakpoint, not a narrow desktop | `components/layout/{navbar,bottom-bar}.tsx`, `components/dashboard-layout.tsx`, `app/(marketing)/layout.tsx`, `components/{landing-chatbot,features/cookie-consent,accessibility/accessibility-launcher,accessibility/accessibility-widget}.tsx`, `app/admin/cms/page.tsx`, `app/dashboard/{retros,team,automation,reports,email,kanban,calendar,activity,sprints,analytics,ethical-metrics}/page.tsx`, `components/{blog-index,blog-reader,doc-index,webinar-index}.tsx`, `app/(marketing)/careers/page.tsx`, `components/sections/page-kit.tsx`, `tests/unit/tablet-layout.test.ts` | Three decisions, each measured rather than eyeballed. **Hover chrome waits for a desk:** the mega-menu row needs ~1120px (brand 140 + three triggers and two links 433 + the right cluster 548) and it is a hover surface, so `NavigationMenu` and the search/language/theme/auth/CTA cluster are `hidden xl:flex` and a phone or tablet — portrait and landscape — gets the hamburger's drawer instead. Unlike the workspace, the public header needs no width store: the translator stays mounted once at every width (Google binds one container id per document) and the drawer carries links only, so the split is plain CSS. **Nothing is pinned to the bottom edge:** the 4-icon site-shortcuts tab bar was deleted on 2026-10-28 (row 25), with the layout's footer spacer, so the accessibility launcher, the assistant pill, the open panel and the cookie bar keep one geometry (`5rem` → `9.25rem` → `13.25rem`) at every width instead of a taller step below `xl`. **The drawer is one accordion:** `openGroup` lives on the Navbar, `MobileGroup` is controlled, and `closeDrawer()` resets it, so two sections can never open at once and stretch the list past the fold. **The workspace spends tablet on the page:** the nav stays a slide-over to `lg`, and the top bar's md budget is arithmetic — 36+16+200 search on the left, 36 icon switch + 120 truncated language pill + 36 assistant + 36 bell + 44 avatar on the right, 32 of padding = 588px of the 768 (628 focused). The `w-16` theme pill, the 7rem language label and the first name are `lg` pay-offs; `md:grid-cols-5` and `lg:grid-cols-5` are banned outright on card strips — `lg` in the workspace only leaves 742px, and the two `lg` grids left on disk are a 3+2 layout region and a full-width marketing sandbox — so KPI strips ramp 2 → `md:3` → `xl:5` — skeletons included, or the page jumps when it fills — and five `sizes` attributes that tested `max-width: 768px`/`1024px` now use `−1px`, because Tailwind steps are `min-width` and the old form served a phone-sized source to a tablet already showing columns. Guarded by `tests/unit/tablet-layout.test.ts` (14 tests, which read the widths off the class strings and add them, so the row fails the moment it stops fitting) |

| 31 | Member-scoped reads: a new account opens the sidebar on empty states | `app/api/goals/{route,queries}.ts`, `app/api/retros/route.ts`, `app/api/automation/{route,_shared}.ts`, `app/api/reports/{route,_shared}.ts`, `app/api/calendar/events/route.ts`, `app/dashboard/{goals,retros,sprints,calendar}/page.tsx`, `tests/unit/dashboard-read-scoping.test.ts` | A brand-new sign-in used to land on other people's work. There is no workspace/team membership table — `team_settings` is a singleton config row and no user carries a team id — so row ownership (`owner_id`, `created_by`, `author_id`, `organizer_id` + the `attendees` jsonb) is the only honest discriminator, and the five reads that had **no user predicate at all** got one. Four pages take the app's existing `?scope=mine` contract with **mine as the default** and a segmented `role="group"` control (My goals/Whole team, My retros/Whole team, My sprints/Workspace) as the deliberate opt-in; `goalVisibility` is reused by the check-in feed because both queries join `goals` under the same `g` alias, and the retro category-mix donut now joins `retros` so the analytics measure exactly the retros the caller was allowed to see. Two pages are **strictly owner-scoped with no toggle** — automation rules/runs and report schedules/runs are keyed by the `user_id` written on insert, with the run history reached through `JOIN … WHERE <parent>.user_id`. The calendar's pre-existing toggle was decorative (the route ignored it); it now emits `scope=mine`, and `scope=all` keeps the workspace view, so no other caller changed. Detail routes stay open by id on purpose — a teammate must be able to log a check-in on someone's goal or vote on a retro note. Deliberately left workspace-wide because the page *is* the aggregate: `/api/team/members`, team wellbeing, ethical metrics, the gamification leaderboard (which already returns a correct server-side `me`), analytics and AI insights. One of those aggregates needed a different fix: `/api/dashboard/overview`'s `workload` array is the member directory — the assignee picker, the calendar invite list and the scrum master all read it — so narrowing it would break assignment entirely; instead the tasks page's *My workload vs team* card refuses to rank a member against a team while they carry nothing, showing "No work assigned to you yet" in place of the team-max bar and the top-5 list. Remaining owner decision: the live database still holds the 11 seeded `@example.com` demo accounts and their rows, so a correctly scoped *team* page still shows demo data |

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
| Playwright smoke tests + unit tests for calculator logic | SHIPPED and far past the brief: `tests/unit/` + `tests/integration/` are 203 files / 3,216 tests under `npm test` (vitest), covering the calculators (burnout, ROI, XP, migration-plan, plan, fit-quiz), cms-registry, search-index, markdown-lite, the four resource catalogues, and every dashboard wave since — including the cron schedule, runner, scheduler and dispatcher guards (§59). `tests/e2e/smoke.spec.ts` + `playwright.config.ts` run under `npm run test:e2e` | Done |
| SEO: sitemap, robots, OG/Twitter, JSON-LD | Shipped except JSON-LD. `app/sitemap.ts` and `app/robots.ts` generate at runtime (no static `public/` copies); the sitemap derives blog and changelog dates from the content modules, and robots disallows `/api/`, `/dashboard` and the four auth routes. 41 of 45 marketing pages export metadata — the exceptions are `login`, `signup`, `forgot-password` and `reset-password`, which are `"use client"` pages and therefore *cannot* export metadata. They inherit the root title in the browser tab, but robots already blocks them, so there is no indexing impact. **No `application/ld+json` exists anywhere in the repo** | Partial: JSON-LD not shipped |
| Lighthouse 90+ perf pass, a11y audit pass | V2-6d ran as a QA/cleanup pass but no Lighthouse or automated a11y run was ever recorded. A11y was handled by construction instead (single `<main>` per route, `aria-pressed`/`aria-labelledby` on filters, `prefers-reduced-motion` kill-switch, token contrast) rather than measured. A visitor-facing **accessibility menu** shipped 2026-10-25 (row 20) — that is self-service adjustment, not an audit: still unmeasured | Not verified |

## 4. Known behavior notes

- Rate limits are per-process memory (`lib/rate-limit.ts`) — fine on one server instance,
  not shared across serverless invocations.
- Forms store to local JSON via the adapter; in production (serverless) writes to
  `data/*.json` will not persist across cold starts until the hosted adapter lands
  (roadmap "Hosted data layer", listed as exploratory).
- Mail delivery is **configured but unproven**, and the old "invalid key" note was wrong. A read-only
  `GET /domains` with the local `JIRAVISION_RESEND_API` answers 200 (valid key); its only domain,
  `guriflex.co.ke`, is in status `failed`, and `JIRAVISION_EMAIL_FROM` is unset so the sender falls back to
  `JiraVision <onboarding@resend.dev>`. Form submissions still store and report success. Since 2026-11-11
  the hourly schedule (§59) also delivers `email_digest` rows through the same sender, and marks a row
  `failed` when the provider rejects it — so a rejected send is visible in the queue instead of silent.
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
  departments and project roles are still not in it and are not collapsed into it; they arrived with the
  phase-15 role packs and the phase-17 onboarding as their own fields. A discipline preference is a
  display filter — every read is scoped by `user_id` in SQL regardless of what a member has switched on.
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

## 10. Submission, inbox, admin view (phase 4, 2026-10-27)

- **Report lifecycle.** `draft → submitted → acknowledged | returned`. Submission locks the report; corrections are a new `revision_of` version, so a supervisor can never be reading one copy while the author edits another. `returned` carries the recipient's note and pushes the author back to draft. Both actions notify the other side through the existing `createNotification`/`notifyMany` path — a report is a notification *type* (`"report"`) with a link, not a new pipeline.
- **Recipients.** Chosen from `/api/team/members` at submit time, validated by `lib/reports/recipients.ts` (1–10 ids, no duplicates, sorted). A saved default reporting line in `preferences.settings.defaultReportRecipients` (read/written by `lib/reports/default-recipients.ts`) means "who gets my weekly" is not re-picked every Friday. The settings API at `/api/settings` already merges into `preferences.settings`, so no dedicated endpoint was needed.
- **Inbox.** `/dashboard/reports-work/inbox` shows newest submissions, unread count, ack and return with a note, and a per-report recipient state list — which is what makes "did my manager read it" answerable rather than vibes. Admins see all submitted reports; regular members see only reports where they are a recipient.
- **Visibility enforcement.** A log entry, deliverable or report is readable only by its author, that report's listed recipients, and admin/superadmin — enforced in the query, not the UI. `lib/reports/visibility.ts` provides the pure predicate `canReadReport(actor, report, recipientIds)`; the SQL WHERE clause uses it in each route's shared reader.
- **Admin team day view.** `GET /api/reports/admin/day?date=YYYY-MM-DD` returns who logged what on a given date, gaps, and submitted reports — scoped by the same `isSuperAdmin` policy already in `lib/roles.ts:33`. A member's log is private to them and their report recipients; it is not a surveillance feed by default, and that boundary is enforced in the query, not the UI.
- **Server routes added:**
  - `POST /api/reports/work/[id]/submit` — file a draft, write recipients, notify
  - `POST /api/reports/work/[id]/revise` — start a correction of a filed report
  - `GET /api/reports/inbox` — submitted reports for recipients/admin
  - `POST /api/reports/inbox/[id]/ack` — acknowledge a report
  - `POST /api/reports/inbox/[id]/return` — return a report with a note
  - `GET /api/reports/admin/day` — admin team day view
- **Builder UI updates.** Status badge in header (draft/submitted/acknowledged/returned), submit button with recipient picker dialog, revise button for filed reports, return note display, title/save/delete disabled for non-drafts.
- **No migration.** All tables and columns exist since phase 1; this phase writes the lifecycle columns (`status`, `submitted_at`, `acknowledged_at`, `returned_note`, `revision_of`) and the recipients table.
- **Deliberately absent** (phases 5, 9): whole-range CSV export, AI prose, PDF/XLSX. The page has no disabled placeholder for any of them.
- Guards: `tests/unit/report-{recipients,default-recipients,visibility,submit-route,revise-route,inbox-route,ack-return-route,inbox-page,admin-day-route,builder-lifecycle}.test.ts` — ten new files, and the suite is 55 files / 972 tests.

## 11. Exports (phase 5, 2026-10-27)

- **PDF export.** `lib/export/pdf.ts` — three layouts: `report` (cover block with author, period, status, revision; KPI strip; completed tasks and deliverables as tables; page numbers and footer), `log` (day-by-day table of entries and deliverables for an arbitrary range), and `plan` (title, horizon, lane-grouped table). Generated client-side with `jspdf` + `jspdf-autotable`; no server runtime, works on a bad connection because the data is already on screen. Filename convention: `jiravision-<scope>-<stamp>.pdf`.
- **XLSX export.** `lib/export/xlsx.ts` — multi-sheet workbooks with `exceljs`. Report layout: `Report`, `Completed`, `Deliverables`, `By discipline`, `By status`, and `Monthly series` (yearly only). Log layout: `Entries` and `Deliverables`. Real date/number formats (`yyyy-mm-dd`, `#,##0`), frozen header row, autofilter on data sheets. Filename convention: `jiravision-<scope>-<stamp>.xlsx`.
- **Extended CSV/JSON datasets.** `app/api/reports/_shared.ts` gains four new datasets: `worklog` (groupBys: kind, discipline, day), `deliverables` (groupBys: status, type, discipline), `plans` (groupBy: status), and `work_reports` (groupBys: status, template, periodType). The existing `/api/reports/export` route now serves these alongside tasks, sprints, team, and wellbeing.
- **Report builder export buttons.** `app/dashboard/reports-work/reports-client.tsx` — "PDF" and "Excel" buttons next to the existing Reload and Copy link controls. Both are client-side, no server round-trip. The export reflects the exact submitted report: what is seen is what is filed.
- **Worklog export buttons.** `app/dashboard/worklog/worklog-client.tsx` — "PDF" and "Excel" buttons in the bulk action bar alongside the existing "Export CSV". All three formats reflect the current selection: the file is exactly the rows on screen.
- **No new server dependencies.** `jspdf`, `jspdf-autotable`, and `exceljs` are client-side libraries; the server runtime is unchanged.
- **Deliberately absent** (phases 8, 9): Gantt image in PDF (the Gantt does not exist yet), AI prose generation (phase 9), server-side PDF rendering (the spec says client-side).
- Guards: `tests/unit/export-{pdf,xlsx,datasets}.test.ts` — three new files, and the suite is 58 files / 998 tests.

## 12. AI provider (phase 6, 2026-10-27)

- **Gemini provider.** `lib/ai/gemini.ts` — plain `fetch` against `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `x-goog-api-key`. No `@google/genai` SDK; the surface needed is one POST, and bare `fetch` stubs cleanly in tests. Two entry points: `geminiText(req)` for free-form text, `geminiJson<T>(req, parse)` for structured output with `responseSchema` and zod parsing.
- **Model discovery.** `GOOGLE_GEMINI_API_KEY` required; `GEMINI_MODEL` optional. Unset `GEMINI_MODEL` → one `GET /v1beta/models` per cold start, first text-capable generation model cached. Google renames models; a constant is an outage.
- **Error handling.** `GeminiError.kind`: `auth | quota | blocked | timeout | transport | badjson`. Each maps to a stated UI state in `/api/ai/generate`; no stack and no raw Google body reaches the client. `AbortController` timeouts: 20s chat, 120s extraction, 45s report prose.
- **Structured output.** `responseSchema` sets `responseMimeType: "application/json"`; the payload is zod-parsed anyway because schema-constrained models still emit invalid JSON on truncation. `badjson` is one corrective retry, then honest failure.
- **Deleted with this phase:** the mock branches in `/api/ai/generate`, all of `lib/ai-models.ts`, the `components/ai-model-selector.tsx` UI. Replaced by a real provider, not apologised for.
- **Environment config.** `.env.example` gains `GOOGLE_GEMINI_API_KEY` (with where-to-get docs) and `GEMINI_MODEL` (optional, with note about auto-discovery).
- **Deliberately absent** (phases 7, 9): actual AI features (planner extraction, report prose, workspace assistant). The provider is the foundation; the features that consume it come next.
- Guards: `tests/unit/gemini.test.ts` — one new file (phase 6 task 6).

## 13. Planner (phase 7, 2026-10-27)

- **Plan extraction schema.** `lib/planner/extract.ts` — zod schema for Gemini structured output: `title`, `summary`, `horizon` (start/end dates), `items[]` with `title`, `description`, `acceptanceCriteria[]`, `discipline`, `estimatePoints`, `startDate`, `dueDate`, `dependsOnItemIndex[]`, `milestone`, `cadence`, `deliverable` (name/type). `planJsonSchema()` converts zod to JSON Schema for Gemini's `responseSchema`.
- **Extraction API route.** `POST /api/planner/extract` — accepts text or inline PDF (≤15MB base64), calls `geminiJson` with the plan schema, writes `agent_plans` + `plan_items` with `status='draft'`, returns the plan id. Source text is stored so a plan is re-runnable without re-paying the model.
- **Plan list and detail routes.** `GET /api/planner` lists the user's plans (draft and promoted). `GET /api/planner/[id]` reads one plan with all items. `PATCH /api/planner/[id]` updates plan metadata (title, summary). `DELETE /api/planner/[id]` discards a draft plan (CASCADE removes items).
- **Plan item CRUD routes.** `POST /api/planner/[id]/items` adds a new item. `PATCH /api/planner/[id]/items/[itemId]` updates one item (whitelisted fields). `DELETE /api/planner/[id]/items/[itemId]` removes an item. All routes verify plan ownership and reject edits to promoted plans.
- **Promote transaction.** `POST /api/planner/[id]/promote` — one database transaction: inserts into `tasks` for each item, stamps `tasks.source_plan_id`, resolves `dependsOnItemIndex` onto new task ids (stored in `tags` as `{ _dependsOn: [...] }`), creates `deliverables` rows where specified, writes `task_events` birth rows (`fromStatus: "none"`, `toStatus: "todo"`, `source: "promote"`), flips plan status to `promoted` with `promotedAt` timestamp.
- **Planner page shell.** `app/dashboard/planner/page.tsx` — server component with Suspense boundary and skeleton fallback. `app/dashboard/planner/planner-client.tsx` — client component with drop zone for PDF/text input, extract button (calls `/api/planner/extract`), plans list with status badges (draft/promoted), view/delete actions. PDF encoded as base64 client-side.
- **Plan editor UI.** `app/dashboard/planner/[id]/page.tsx` — server shell. `app/dashboard/planner/[id]/plan-editor-client.tsx` — inline editing for plan metadata (title, summary) and all item fields (title, description, discipline, estimate, dates, milestone, cadence, deliverable). Add/delete item buttons. Promote and Discard actions. Items save on blur. Editing disabled for promoted plans.
- **No migration.** All tables (`agent_plans`, `plan_items`, `deliverables`, `tasks`, `task_events`) exist since phase 1; this phase writes the planner lifecycle columns and the promote transaction.
- **Deliberately absent** (phase 8): Gantt view, drag-to-move on Gantt, cadence-based row generation, PDF export of Gantt. The planner delivers Grid (table in editor), List (cards in editor), and Board views are deferred.
- Guards: `tests/unit/planner-{extract,promote,page}.test.ts` — three new files (69 tests), and the suite is 62 files / 1086 tests.

## 14. Gantt view (phase 8, 2026-10-27)

- **Gantt data model.** `lib/planner/gantt-data.ts` — pure functions to transform plan_items or tasks into Gantt lanes. Groups by discipline or assignee. Calculates date ranges with padding. Handles zoom levels (day/week/month). Resolves dependencies from indices to IDs. Generates time axis labels. Calculates bar positions and moved dates after drag.
- **Gantt component.** `components/planner/gantt.tsx` — SVG/CSS grid component. Renders lanes as rows, time axis at top, today marker as vertical line. Responsive with horizontal scroll below md breakpoint. Handles keyboard navigation (arrow keys to move selected item). Respects prefers-reduced-motion. ARIA labels for accessibility.
- **Gantt bar component.** `components/planner/gantt-bar.tsx` — individual bar rendering. SVG rects for regular items, diamond shapes for milestones. Color-coded by status (done=green, in-progress=yellow, todo=blue). Drag-to-move with mouse/touch. Visual feedback during drag (opacity change). Tooltip on hover showing item details. Keyboard accessible (Enter/Space to select).
- **Gantt controls.** `components/planner/gantt-controls.tsx` — zoom selector (day/week/month) and group-by selector (discipline/assignee). Uses Select components from shadcn/ui.
- **Plan editor integration.** `app/dashboard/planner/[id]/plan-editor-client.tsx` — view mode toggle (List/Gantt). Gantt view renders when mode is "gantt" and items exist. Drag-to-move commits new dates via PATCH to `/api/planner/[id]/items/[itemId]`. Click on bar scrolls to item in list view. URL query params for view mode, zoom, and groupBy.
- **Drag-to-move interaction.** Mouse down starts drag, mouse move calculates day delta based on bar width, mouse up commits. Touch support for mobile. Keyboard support: arrow keys move selected item by 1 day (left/right) or 7 days (up/down). Writes task_events row on commit for promoted tasks.
- **Accessibility.** Visible keyboard focus on bars and controls. ARIA labels for bars, lanes, today marker. Screen reader announcements for move operations. prefers-reduced-motion disables drag animations and simplifies transitions.
- **Deliberately absent**: PDF export of Gantt (the PDF export module uses a table layout, not the Gantt image), real-time collaboration (no WebSocket sync for drag operations), critical path calculation (dependency arrows show relationships but no CPM algorithm).
- Guards: `tests/unit/gantt-{data,component}.test.ts` — two new files (53 tests), and the suite is 64 files / 1139 tests.


## 15. AI Assistant (phase 9, 2026-10-27)

- **Workspace assistant context.** `lib/assistant/context.ts` — assembles context from 5 core tables (tasks, task_events, work_log_entries, deliverables, work_reports), scoped by user_id, last 30 days, limit 50 rows per table. Returns structured context pack with dataAsOf timestamp. `formatContextForPrompt()` converts context to text for Gemini.
- **Workspace assistant API.** `lib/assistant/workspace.ts` — calls Gemini with context + question, returns `{answer, references, dataAsOf}`. `POST /api/assistant/workspace` — authenticated, creates/continues thread, persists messages to `assistant_threads` + `assistant_messages`. `GET /api/assistant/workspace/threads` — lists user's threads with message counts. `GET /api/assistant/workspace/threads/[id]` — returns thread details and all messages. `DELETE /api/assistant/workspace/threads/[id]` — deletes thread (messages cascade).
- **Workspace assistant UI.** `/dashboard/assistant` — full-page chat interface with thread list sidebar. Message bubbles with references display. Loading states with typing indicator. New thread button. Delete thread action. Optimistic UI updates.
- **Site knowledge mapping.** `lib/assistant/site-knowledge.ts` — explicit route map (18 paths: /, /pricing, /about, /products, /solutions, /faq, /legal, /blog, /careers, /changelog, /roadmap, /status, /migration, /compare, /templates, /webinars, /case-studies, /docs). Pattern matching for dynamic routes (/blog/*, /products/*, etc.). `extractFacts()` pulls hero, plans, faqs, features, testimonials, stats from content modules.
- **Site assistant API.** `lib/assistant/site.ts` — tier 1: keyword matching (33 keywords: pricing, cost, trial, free, features, support, secure, security, integration, migrate, migration, demo, contact, api, mobile, offline, data, privacy, gdpr, soc, enterprise, team, user, seat, billing, payment, invoice, cancel, refund, discount, nonprofit, education, student). Tier 2: Gemini with pathname-based knowledge. `POST /api/assistant/site` — anonymous, rate-limited (8/hour, 24/day per IP), global daily cap 200 via `ai_usage_daily`. Falls back to scripted answer on Gemini error.
- **Site assistant UI.** `components/landing-chatbot.tsx` — updated to use real `/api/assistant/site` endpoint. Keeps existing UI (floating button, dialog, message bubbles, FAQ suggestions). Wires to API with loading states.
- **No migration.** Tables `assistant_threads`, `assistant_messages`, `ai_usage_daily` exist since phase 1; this phase writes the assistant logic and UI.
- **Deliberately absent**: streaming responses (the current implementation waits for the full response; SSE would be new infrastructure), multi-turn context window (each question gets a fresh 30-day context). The top-bar popover and the "ask about this period" entry points were deferred here and shipped in phase 9b (§16).
- Guards: `tests/unit/assistant-{context,site-knowledge,site}.test.ts` — three new files (57 tests), and the suite is 67 files / 1200 tests.

## 16. AI Assistant completion (phase 9b, 2026-10-27)

The four things phase 9 left on the table, plus the one fabricated surface that was still standing.

- **Legal disclosure.** `content/legal.ts` — a new `ai-assistant-answers` section in `legalNoticeDoc`, placed after `disclaimer` and before `external-links`. Two paragraphs: what the model is allowed to read (published site text only, nothing private), and that a machine answer about price or terms is a convenience rather than a guarantee — where the assistant and a published page disagree, the page wins. `lib/assistant/site.ts` carries the same rule into the system prompt, so the model is told what the visitor is told.
- **AI Scrum Master on the real provider.** `app/api/dashboard/ai-recommendation/route.ts` — the five canned recommendation strings and the `Math.random()` pick are deleted. When the client sends a rule-engine recommendation it is still stored verbatim (the manual path stays primary); when it sends nothing, the route reads the sprint's own rows (capacity, completed points, committed points, task count, status breakdown) and asks Gemini for one recommendation from those numbers. The prompt states "Use ONLY the numbers given above. Never invent a metric, a name or a date." A provider failure is reported honestly: `GeminiError` → 503 with a message that names the rule engine as the way forward, any other failure (sprint missing, no tasks, empty answer) → 422. No number is invented in any branch.
- **Top-bar assistant panel.** `components/assistant-panel.tsx` — a Popover chat mounted in the dashboard top bar ahead of the bell, desktop-only, backed by the same `POST /api/assistant/workspace` endpoint as the full page. Three suggestion buttons when empty, `max-h` 20rem scroll area that follows the Radix viewport (not the clipping root), a "Full page" link to `/dashboard/assistant`, one thread kept across turns, and a failure rendered as an assistant bubble rather than swallowed. Input capped at 2000 characters, the length the API accepts.
- **"Ask about this period".** `lib/assistant/ask.ts` — `assistantLink(question)` builds `/dashboard/assistant?q=…`, and `periodQuestion(label, start, end)` / `dayQuestion(day)` write the question so the assistant is told which span is meant. `/dashboard/assistant` reads `?q=` once (a ref guard makes the effect one-shot), asks it, and drops the param so a refresh does not ask again. Two entry points: the report builder header ("Ask the assistant about {period label}", scoped to the period the builder is showing) and the work log's view toolbar ("Ask about this day", scoped to the day the URL already owns).
- **No migration, no new dependency.** Both surfaces reuse the phase 9 endpoints and the existing shadcn Popover/ScrollArea primitives.
- **Deliberately absent**: a popover on the mobile top bar (no room for a second popover beside the menu), pre-scoped questions from the planner or the Gantt (their spans are plan horizons, not work-log periods, so the question would ask for data the assistant is not given).
- Guards: `tests/unit/{assistant-ask,assistant-panel,ai-recommendation-route,legal-ai-disclosure}.test.ts` — four new files (39 tests), and the suite is 71 files / 1239 tests.


## 17. Career ladder — schema and math (phase 12, 2026-10-27)

The backend half of the career ladder; phase 13 (§18) builds `/dashboard/career` and `/admin/career` on these reads.

- **Five tables.** `drizzle/schema.ts` gains `career_levels` (the published rung: discipline, level, title, summary, expectations, `signals` targets, `checklist`, bands), `career_placement` (current state, `(user_id, discipline)` primary key), `career_signoffs` (one row per member, rung and item, `ticked_by` required), `career_requests` (`draft → submitted → approved | returned`, frozen `evidence`), and `growth_reviews` (append-only). History is read from approved requests, so there is no second ledger.
- **No band any member can edit.** `band_min`, `band_max` and `band_currency` exist only on `career_levels`, and the seeded rows leave all three null. The read API reports `published: false` until the owner enters real numbers; no range is inferred from job titles or the web.
- **Signal registry.** `lib/career/signals.ts` — the nine keys from design §11 with a label and an in-words hint each, a zero-filled `EMPTY_SIGNALS`, `normaliseSignals()` (missing → 0, negatives/NaN dropped) and `normaliseTargets()` for the stored jsonb. The 90-day window is `CAREER_WINDOW_DAYS`.
- **Readiness arithmetic.** `lib/career/readiness.ts` — `computeReadiness()` returns `{ percent, capped, capReason, signalPercent, checklistPercent, gaps, met }`. `percent = round(0.7 × signal coverage + 0.3 × checklist coverage)`; a target of 0 counts as met; a missing signal reads 0; an empty checklist is complete rather than blocking. A member who has not signed off the rung they currently hold is clamped to 59 (`capped: true` with the count of open items). Gaps list signal shortfalls in registry order first, then unticked checklist items.
- **Twenty seeded rungs.** `lib/career/ladder-seed.ts` — five disciplines (developer, technician, designer, auditor, coordinator) × four rungs. Titles, summaries, expectations, per-rung targets and three checklist items each (two shared, one discipline-specific) live in git. Targets are non-decreasing by rung and every checklist item has a hint; item keys are prefixed with discipline and rung so they are unique across the whole ladder.
- **Counts are derived, never typed.** `lib/career/counts.ts` runs the nine windowed queries, all scoped by member id: distinct logged days, entries, review/deliverable entries, distinct completed tasks (a reopened task counts once), their story points, delivered deliverables, submitted-or-acknowledged reports, distinct disciplines on tasks touched in the window, and distinct promoted tasks (`task_events.source = 'promote'` by that actor). A missing row set is 0.
- **Reads.** `GET /api/career/levels` — active rungs, session required. `GET /api/career/me?discipline=` — placements and, for the selected discipline, current rung, next rung with targets and checklist, actual signals, the computed readiness and the band (published or not). Every query is scoped by `session.id`; an unknown `?discipline=` is a 400; there is no body and no `percent` input.
- **Migration.** `scripts/create-career-tables.mjs` (`npm run db:career`) — `CREATE TABLE IF NOT EXISTS` for the five tables plus their unique indexes, then an idempotent 20-row seed (`ON CONFLICT (discipline, level) DO NOTHING`) so a later admin edit survives a re-run; it verifies the tables through `information_schema`, the row count and that no band is published. `scripts/rollback-career-tables.mjs` drops only these five and refuses without `CAREER_ROLLBACK=yes`.
- **Deliberately absent at the end of this phase**: the pages and every write — phase 13 added those. The four Growth AI actions are phase 14. No route in this phase writes.
- Guards: `tests/unit/career-{signals,readiness,ladder-seed,schema,routes}.test.ts` — five files (63 tests) at the end of this phase.

## 18. Career UI and review (phase 13, 2026-10-27)

The member side and the admin side of the same ladder. The browser never does readiness arithmetic: every percentage, band and count is read from the server, and a request freezes the evidence it was judged on.

- **Member page.** `/dashboard/career` resolves the member's placements and shows the held rung, the next rung, the readiness meter with per-signal drill-downs, both checklists with sign-off state, the request state and the approved history. `/dashboard/career/[discipline]` renders the same workspace for one discipline; an unknown discipline is rejected by `isLadderDiscipline`, not passed through. No placement renders an empty state rather than a fabricated rung. The sidebar gains a `Career` entry.
- **Drill-downs read rows, not summaries.** `GET /api/career/me/evidence?signal=` returns the counted rows behind one signal, its `total` from the same counter the meter uses, the window and a `truncated` flag. It is scoped by the session id; there is no `userId` query parameter. The panel says "Nothing counted in this window" when the list is empty.
- **Request flow.** `POST /api/career/requests` takes only a discipline. The route refuses a member with no placement, a top-of-ladder member (409), and a second open request for the same discipline (409). It builds the next rung, signals, readiness, both checklists, both sign-off sets, targets and per-signal row refs, then stores them in `career_requests.evidence` before returning. The reviewer therefore reads an artefact that cannot move under them, and the member page shows "the evidence was frozen" rather than recomputing it.
- **The cap is server-side.** `computeReadiness` already clamps a member who has not fully signed off the rung they hold to 59; the member page renders the returned `percent` and `capReason` and never multiplies `0.7`/`0.3` itself (a guard test bans both inside the career client files).
- **Sign-off rule.** `GET/POST /api/career/signoffs` are super-admin only. A member cannot tick their own checklist: the route writes the admin's id to `ticked_by`, and the item must exist on the rung. A second sign-off replaces the first, so the state is always the latest decision; each rung's payload carries its `levelId` so the editor signs without guessing. The member sees "Ticked by X on date", "Declined by …", or "Awaiting sign-off".
- **Review queue.** `GET /api/career/requests` returns the member's own requests, and for a super-admin every request (limit 100), newest first. `POST …/[id]/approve` moves the request and the placement in one transaction, and only if the placement still reads the `fromLevel` the request was submitted from and `toLevel = fromLevel + 1` — otherwise 409, so an admin who is looking at a stale queue cannot move someone twice. The effective date is computed in the member's timezone. `POST …/[id]/return` requires a non-empty note (2000 characters max) and does not move the placement; the member reads the note and can submit a fresh request.
- **Ladder editor.** `PATCH /api/career/levels/[id]` edits a rung's title, summary, expectations, signal targets, checklist, band and `isActive`. It never touches a placement, a sign-off or any member row, so changing what a rung asks for cannot silently move anybody up it. Unknown signal keys are an error rather than silently dropped; duplicate or missing checklist keys are an error; numeric targets must be whole and non-negative.
- **Band rule.** `lib/career/bands.ts` accepts a band only when both ends and a three-letter currency are supplied, with `min ≤ max` and whole non-negative values. Anything less is rejected, and blank inputs clear the band. The UI prints "Band not published" until real numbers exist; no currency, range or level is inferred.
- **Placements.** `POST /api/career/placements` is super-admin only and upserts on `(userId, discipline)`. The rung must be 1–4 and must exist in the ladder. A placement change sends no notification — the spec names submit, approve and return.
- **Notifications.** A new `career` notification type (bell icon: `Award`). Submit fans out to super-admins except the actor and links to `/admin/career`; approve and return notify the member and link to `/dashboard/career`. A failed notification does not roll back the decision.
- **Ethical-metrics integration.** `seniorityTierOf(jobTitle, role, careerLevel)` now prefers a real placement: L1→1, L2→2, L3/L4→3. `/api/ethical-metrics` reads `career_placement`, takes a member's highest rung when they are placed in more than one discipline, and reports `senioritySource: "placement" | "job_title"` per member. The priority matrix prints "· ladder" or "· job title" on the row, and the chart note and honesty notes say the ladder wins when a placement exists and job title + role is only the fallback — so the row itself says which source decided the band.
- **Deliberately absent**: the Growth AI panel (phase 14 owns learning paths, benchmarks, periodic reviews and gap tasks), ladder-edit versioning (the wording is reviewed in git), automatic migration of sign-offs when an admin renames a checklist key (the old key is simply unused), withdrawing a submitted request, bulk placement or bulk sign-off, a CSV export of the ladder, a member directory on the career page, and any pay record — none exists and none is added.
- Guards: `tests/unit/career-{bands,review,seniority,review-routes,pages,ethical-metrics-career}.test.ts` — six new files, plus updates to `career-routes.test.ts` and `schema-safety.test.ts`. Suite: 83 files / 1406 tests.

## 19. Growth AI (phase 14, 2026-10-27)

Four AI actions on the member career page. The one place this project searches the web: a learning item or benchmark source renders only when the response's own Google Search grounding metadata contains its URL.

- **One route, member-only.** `GET /api/career/growth` returns the member's last 20 `growth_reviews` rows and `aiAvailable`; `POST /api/career/growth` takes `{ action, discipline }`, where action is `learning | benchmark | review | task_suggestions` and the discipline must pass `isLadderDiscipline`. Both are scoped by the session id — no `userId` query parameter and no admin fan-out. An unset `GOOGLE_GEMINI_API_KEY` returns 503 naming the variable; the panel disables its buttons and says the rest of the page works without it.
- **Grounding in the provider, not the prompt.** `lib/ai/gemini.ts` gains an opt-in `googleSearch` flag (`tools: [{ google_search: {} }]`) and `readGrounding()`, which normalises `groundingMetadata` into http(s) sources (hash and trailing slash stripped, duplicates dropped) alongside the search queries. Both `geminiText` and `geminiJson` return `grounding`, so a caller that did not ask for search simply gets null.
- **Every link is verified.** The learning prompt receives only the member's counted signals, targets and gaps; each returned item's URL is matched against the grounding sources, and unmatched items are dropped. If nothing survives, the route returns 502 and saves nothing. The panel prints how many unverified links were removed.
- **The benchmark is a suggestion, never a band.** The model must name the market its sources actually price and return at least two URLs, all verified the same way; fewer than two verified sources is a 502. The result is stored in `growth_reviews`, and the panel labels it "Suggestion only" — only an admin's `PATCH /api/career/levels/[id]` publishes a range, and no route in this phase writes `career_levels`.
- **The review is written from the member's own counts.** `geminiText` produces a 250–400 word plain-text review from the same numbers the meter read. The prompt forbids inventing projects, praise or metrics and forbids promising a promotion or salary. The narrative is stored with per-signal refs (actual and target per key) so the member can check it.
- **Gap tasks become a draft plan.** Task suggestions (3–6 items, 1–13 points each) are validated by zod, then `createGapPlan()` writes — in one transaction — an `agent_plans` row with `status: "draft"`, `created_by` set to the member and `source_kind: "career"`, its `plan_items`, and the `task_suggestions` snapshot. The existing `/api/planner/[id]/promote` route stays the only way a plan becomes tasks; nothing here inserts into `tasks`.
- **Append-only snapshots.** Every action inserts one `growth_reviews` row with `payload`, `narrative`, `source_refs`, `as_of`, `model` and `ai_marked: true`. Nothing updates or deletes one: a later run adds a newer row, and the panel shows the latest per action from the saved list.
- **Provider failures are states, not filler.** `GeminiError` maps to 503 (auth), 429 (quota), 422 (blocked), 504 (timeout) and 502 (transport or bad JSON). A malformed answer is a 502 with nothing saved.
- **Deliberately absent**: a published band written by AI, AI task creation that bypasses promote, admin access to a member's growth snapshots, per-member caching or quotas (provider quota errors surface as 429), a grounding fallback without sources, and editable or deletable snapshots.
- Guards: `tests/unit/gemini.test.ts` (extended), `tests/unit/career-growth.test.ts`, `tests/unit/career-growth-route.test.ts` and `tests/unit/career-pages.test.ts` (extended). Suite: 85 files / 1434 tests.

## 20. Role packs and registers (phase 15, 2026-10-27)

What a role is the keeper of, and whether those things are still current. Every value is typed by a person: this phase adds no AI surface, and the section exists so the technician's handover can be printed and handed back without asking anything to guess.

- **Two additive tables.** `role_packs` (the pack as data: key, title, disciplines, register kinds, dashboard sections, report template, ladder discipline, onboarding questions, method, `isActive`) and `register_items` (pack key, kind, title, `fields` jsonb, status, owner, custody, `last_verified_at`, `verify_interval_days`, self-referencing `parent_id`, `source`). There is deliberately no `stale` column and no credential column.
- **The migration ran, additively.** `scripts/create-registers-tables.mjs` (`npm run db:registers`) uses `CREATE TABLE IF NOT EXISTS` only and seeds the two packs from `lib/packs/seed.ts` with `ON CONFLICT (pack_key) DO NOTHING`, so a re-run is a no-op and an admin edit survives it. It ran against production Neon on 2026-10-27 with the owner's per-action approval and verified both tables through `information_schema`, 2 `role_packs` rows and 0 `register_items` rows. `scripts/rollback-registers-tables.mjs` refuses unless `REGISTERS_ROLLBACK=yes`.
- **Two seeded packs, every role reachable.** `it-technician` claims six disciplines (technician, IT operations, DevOps, networking, security, database) with the four kinds from the owner's handover — infrastructure, accounts and systems, equipment, outstanding work — and the six-step method (Identify, Reproduce, Diagnose, Fix, Test, Document). `general` claims every other `WORK_DISCIPLINES` member, and a unit test proves the split covers the vocabulary exactly once. `resolvePack` falls back to `general` for an unknown role, so no one is ever without a pack.
- **Packs are authored, not coded.** `PATCH /api/packs` and `POST /api/packs` are super-admin only, while any signed-in member reads active packs (`?all=1` returns inactive ones to an admin). `readPackInput` validates the key shape, that every discipline is in `lib/roles.ts`, that each kind has a unique lowercase key and label, that sections and method are non-empty, and that no onboarding question asks for a credential value — it is refused with the question quoted and the alternative ("ask where it is kept and who can authorise it") spelled out. A duplicate key is a 409. `/admin/packs` is the editor: discipline grid, kind editor, section checkboxes, method and onboarding textareas, and a publish switch. A new pack is a row, not a deploy.
- **No credential ever enters a register.** `lib/registers/fields.ts` scans field keys recursively (camelCase, snake_case, nested objects) for password/secret/token/otp/mfa/private key/api key/credential shapes and rejects the row; the error names the dotted path and never echoes the value or any sibling value. The form shows `CREDENTIAL_HINT` and the placeholder tells the owner to record where the credential is kept and who can authorise it instead.
- **Staleness is computed, never stored.** `stalenessOf` compares UTC calendar days: `elapsed > interval` is stale, a null verified date or interval is `unknown` (never fresh), and a future verification date is fresh so clock skew cannot accuse anyone. An interval of 0 means "verify daily": today is current, tomorrow is not. `cadenceForInterval` maps the interval to a plan cadence, and `nextCheckDay` pulls an overdue check back to today.
- **Custody decides who reads.** `custody=member` rows are visible only to the owner and an admin; `team` and `org` rows are visible to every authenticated member. The filter is in the SQL of `lib/registers/read.ts`, not in the browser, and every write re-checks `canWriteRegister` per row (owner or admin). Reassigning an owner or changing custody/parent is admin-only. There is no delete: a row is retired or disposed of, and the history stays.
- **Lifecycle needs a reason where it matters.** `in_service` moves to `awaiting_repair`, `awaiting_disposal` or `retired`; `awaiting_repair` returns to service freely but needs a reason to go to disposal; `awaiting_disposal` ends in `disposed` or returns to service with a reason; `disposed` is terminal; `retired` returns to service with a reason. There is no reason column, so the reason is written as a `work_log_entries` note in the same transaction — the audit trail is the log the rest of the app already reads.
- **Verifying is logged.** `POST /api/registers/[id]/verify` writes a `work_log_entries` row (`kind: "review"`, the session's local day, the pack's ladder discipline, `source: "manual"`) and bumps `last_verified_at` in one transaction. A disposed row is a 409. Bulk verify (up to 50 ids) does the same per writable row and reports the rows it skipped and why, rather than failing the batch.
- **Stale rows become a draft plan, never tasks.** `GET /api/registers/stale` returns the visible stale rows; `POST` creates — or returns today's existing — a draft `agent_plans` row (`source_kind: "registers"`, `source_name: "stale:<day>"`) with one `plan_items` row per stale register, a cadence from the interval and a due date from `nextCheckDay`. The existing promote route remains the only path from a plan item to a task; nothing here inserts into `tasks`.
- **The workspace.** `/dashboard/registers` is a Suspense shell whose client reads `/api/registers` — packs arrive with the rows, so the page cannot invent a kind. It carries pack tabs, the §4 filter grammar in the URL (`v`, `q`, `kind`, `status`, `custody`, `owner`, `mine`, `stale`, plus `pack`), three views (list, grid, by-kind board), select-all and a bulk bar (verify, admin reassign, CSV export), create and edit dialogs with dynamic field pairs, lifecycle buttons that surface the reason field when the move needs one, and a stale banner whose "Schedule checks" button creates the draft plan and links to it. An interval of "never verified" reads as "Never verified", not as current. `Registers` sits in the sidebar, and the dashboard's Today strip links the stale count to `?stale=1`; a failed stale read renders nothing rather than a zero.
- **Deliberately absent**: a credential value in any field, a stored stale flag, attachments or file uploads, register-to-register links beyond the pack-scoped parent, AI-written register rows (phase 18), deleting a row, and any route that writes `tasks` directly.
- Guards: `tests/unit/register-schema.test.ts`, `packs.test.ts`, `register-fields.test.ts`, `register-staleness.test.ts`, `register-rules.test.ts`, `register-routes.test.ts` and `register-pages.test.ts` — seven files, 118 tests. Suite: 92 files / 1559 tests.

## 21. Playbooks (phase 16, 2026-10-27)

A standard operating procedure as a row: the method it follows, the steps inside each phase, the
precautions that make it safe, and a run that leaves the day's log able to prove which version was
followed. Manual authoring is the whole surface of this phase — no model writes a step here yet.

- **One additive table and the deferred key.** `playbooks` (pack key, discipline, title, summary, `scope_kind`, `method`, `steps` jsonb, precautions, recommendations, tags, status, `version`, author, `source`, `ai_marked`, `last_verified_at`, `verify_interval_days`) and `work_log_entries.playbook_id`, declared as `references(() => playbooks.id, { onDelete: "set null" })`. `scripts/create-playbooks-tables.mjs` (`npm run db:playbooks`) is additive-only and adds the FK only when `pg_constraint` does not already have it; `scripts/rollback-playbooks-tables.mjs` refuses unless `PLAYBOOKS_ROLLBACK=yes`. It ran against production Neon on 2026-10-27 with the owner's approval and verified the table (20 columns, 3 indexes), the FK as `ON DELETE SET NULL`, 0 playbook rows and `work_log_entries` unchanged — applied over Neon's HTTPS driver because the script's TCP path timed out from this machine. No run state, progress or step index is stored on the playbook — the log is the record.
- **The six-step method is data.** `SIX_STEP_METHOD` is Identify → Reproduce → Diagnose → Fix → Test → Document, and a pack's own `method` wins when it has one. A step's stored keys are the spec's verbatim (`order`, `phase`, `action`, `checks`, `expected`, `precautions`, `warnings`, `ppe`, `tools_parts`, `time_estimate`, `stop_condition`, `escalation`, `evidence_to_record`), and the five array fields are always present — empty, never `undefined`. `readStep` refuses a step with no action and a phase that is not in the playbook's method.
- **Editing is a form, not prose.** `/dashboard/playbooks/[id]` edits title, summary, discipline, the method phases (one per line), tags, the re-verify interval and the steps — a flat ordered list where each card picks its phase from a Select and carries the detail fields for expected result, stop condition, escalation, time estimate and evidence, with add, move up/down (`moveStep`), clone (`cloneStep`) and remove (`removeStep`). A step left in a phase the method no longer lists is named above the list, and the save refuses it. `PATCH` merges the request over the stored row and re-validates the whole thing through `readPlaybookInput`, so a request cannot drop a step array or smuggle in a column.
- **Publishing is its own route.** `POST /api/playbooks/[id]/publish` asks `publishProblem` first and answers 409 with its reason: already published, archived, a `source='gemini'` row still `ai_marked`, no steps, or a step with an empty action. `PATCH` may only set `draft` or `archived`; a content edit on a published row bumps `version`, and a content edit on a gemini row clears `ai_marked` — the human review is the edit. Drafts and archived rows are readable and writable by their author (and an admin); published rows are readable by every signed-in member.
- **Run mode logs one row per phase.** `/dashboard/playbooks/[id]/run` renders each phase's steps with a notes box; `POST /api/playbooks/[id]/run` refuses anything not published (409) and writes one `work_log_entries` row per **method phase** — `kind: "action"`, the step actions as the body, `playbook_id` and `playbook_version` on every row, the session's local day unless a valid past `workedOn` is given. It writes no `tasks` and no `task_id`.
- **Search is the palette.** The list carries the §4 filter grammar in the URL (`q`, `status`, `pack`, `discipline`) and a ⌘K palette whose values include every step action, so a procedure is findable by what it tells you to do. The top-bar search is wired to the same list.
- **The fourth printed layout.** `exportPlaybookPdf` prints a cover (version, status, pack, author, last-verified line, method), precautions and recommendations, then one page per phase with every step's fields and a Performed by / Signature / Date block. While `ai_marked` is true the cover says the sheet is a model draft and the precautions heading reads "(model-drafted)", because a safety step is the last place a plausible-sounding invention belongs. This phase adds no route that fills a playbook from a model; when one arrives it inherits the gate.
- **Deliberately absent**: storing a run, progress or completion state on the playbook; a step marked "done" outside the work log; reordering across phases in one gesture (steps move within the flat order); editing `pack_key` after creation; deleting a playbook (archive instead); and any write to `tasks`.
- Guards: `tests/unit/playbook-schema.test.ts`, `playbook-method.test.ts`, `playbook-fields.test.ts`, `playbook-routes.test.ts` and `playbook-pages.test.ts` — five files, 76 tests — plus the phase-16 block in `worklog-reports.test.ts` and the model-draft case in `export-pdf.test.ts`. Suite: 97 files / 1647 tests.

## 22. Onboarding (phase 17, 2026-10-27)

A new member's first ten minutes: eight adaptive steps that each save when they pass, a resume that
survives a closed tab, and a gate that only sends an account that still owes setup — never one that was
already working. The phase adds one table, five routes and no `users` column; a later wave adds a second,
`user_onboarding`, which is the gate's memory.

- **The migration ran, additively.** `scripts/create-invitations-table.mjs` (`npm run db:invitations`)
  uses `CREATE TABLE IF NOT EXISTS` only and seeds nothing, so a re-run is a no-op. It ran against
  production Neon on 2026-10-27 with the owner's per-action approval and verified one table (9 columns),
  the `workspace_invitations_email_idx` index, the `token_hash` unique constraint and both `users`
  foreign keys as `ON DELETE SET NULL`, with 0 invitation rows and no `users` column added.
  `scripts/rollback-invitations-table.mjs` refuses unless `INVITATIONS_ROLLBACK=yes`.

- **Eight steps, taken adaptively.** Welcome, Profile, Workspace, Industry, Role and disciplines, Project
  management, First project, Review and finish (`ONBOARDING_STEPS` in `lib/onboarding/state.ts`). A
  personal workspace is not asked for an organization, a department or a job title; every step but Welcome
  and Review has *Skip*, and skipping is a valid answer that leaves the default in place. The rail marks
  the current step with `aria-current="step"`, the step heading takes focus on each move and progress is
  announced with `aria-live="polite"`.
- **The answers are one namespaced object; the gate has its own row.** `preferences.settings.onboarding`
  holds `{ status, step, completedAt, version, data }` and is written through the existing `/api/settings`
  `jsonb_set` merge, so no `users` column carries setup state. `/api/settings` permits exactly one
  namespaced object — `onboarding` — and hands it to `readOnboardingPatch`, which refuses unknown fields,
  credential-shaped paths, a reset back to `not_started`, a downgrade from `completed` (unless the gate row
  says the member is restarting), an unknown status and a discipline outside `WORK_DISCIPLINES`; it stamps
  `completedAt` only on completion. Profile fields go through the existing `/api/user/profile` PATCH. A step
  persists when it validates, which is what makes a refresh, a closed tab and a logout-then-signin all lossless.
- **The gate's memory is `user_onboarding`, one row per account.** `scripts/create-user-onboarding-table.mjs`
  (`npm run db:user-onboarding`) is additive-only — `CREATE TABLE IF NOT EXISTS`, one FK to `users` as
  `ON DELETE CASCADE`, one status index, no seed rows — and `scripts/rollback-user-onboarding-table.mjs`
  refuses unless `USER_ONBOARDING_ROLLBACK=yes`. Columns: `user_id` (PK), `status`
  (`not_started | in_progress | completed | skipped`), `step`, `version`, `source`
  (`gate | wizard | signup | backfill`), `started_at`, `completed_at`, `skipped_at`, timestamps. A saved step
  writes the row through `syncOnboardingRow`; `PATCH /api/onboarding` accepts exactly two actions — `skip`
  (*Set up later*) marks the row `skipped`, `restart` returns it to `in_progress` at step 0 and clears the
  settled timestamps. The row wins over the stored preference, which is what lets Restart work on a
  completed member who still has `completed` in preferences.
- **Existing members are grandfathered, never reset.** With no row, `decideOnboardingGate` falls back to
  `effectiveStatus`, which treats an account created before `2026-10-27`, or one that already has a task or
  work-log row, as completed on first read, and a stored status beats that fallback.
  `scripts/backfill-user-onboarding.mjs` (`npm run db:user-onboarding:backfill`) previews a per-user plan
  and writes nothing without `--apply`; `--apply` inserts with `ON CONFLICT (user_id) DO NOTHING`, so a
  re-run cannot overwrite a row the gate already made. Nothing on the onboarding path clears a saved
  preference — the write is a merge, and a `completed` member who reopens the wizard can change answers
  without losing them.
- **The gate sends only the accounts that still owe setup.** `/dashboard/layout.tsx` reads the gate after an
  `active` session read and redirects to `/onboarding` only when the decision says `pending` (status
  `not_started` or `in_progress`, not grandfathered); the first such redirect creates the row
  (`source: "gate"`) so the account has a memory from then on. A *failed* gate read never redirects — the
  same rule as a failed session read: a database that did not answer never decides where somebody goes.
  `/onboarding` itself reads the server session (anonymous → `/login`); apart from signup's
  `router.push("/onboarding")` there is no other push, `skipped` and `completed` both settle the account,
  and `/dashboard` never redirects — an `in_progress` member sees a dashed *Resume setup — step N of 8*
  banner. There is no wall and no loop.
- **Invitations are tokens, not typed emails.** `workspace_invitations` stores a SHA-256 hash of a
  32-byte base64url token, the invited email, the granted role (`user` or `admin`), the inviter and an
  expiry seven days out. `POST /api/team/invitations` is super-admin only and returns the plaintext link
  once (`/onboarding?invite=…`); acceptance at `POST /api/onboarding/invitation` resolves the token
  server-side, refuses an expired or already-used row, and claims it with
  `UPDATE … WHERE accepted_at IS NULL`, so a token works once and only for the address it named. Nothing
  logs the token, and no header carries it.
- **No membership by typing a name.** Until the token resolves, the join branch offers *request access*
  instead: `POST /api/onboarding/request-access` is rate-limited to three notes a day, notifies the
  workspace admins and changes no membership. Only an admin's team settings can rename the workspace, and
  the wizard only offers the field when `canRenameTeam` says so.
- **The first project is a draft plan, never tasks.** Step 7's sample writes a draft `agent_plans` row
  (`source_name: "sample"`, three sample items) and dedupes on `(created_by, source_name, title)`, so
  retrying the step returns today's plan instead of a second one. Importing a scope document goes through
  the phase-7 `/api/planner/extract` route and stores the returned `planId`. Promote remains the only path
  from a plan item to a task; onboarding never inserts into `tasks`.
- **The sample is discipline-specific, drawn from the role pack's JSON seed.** `lib/onboarding/sample-seed-reader.ts`
  reads `public/files/disciplines/<discipline>.json` server-side (guarded by `typeof window !== "undefined"` so
  the `readFileSync` call never reaches the browser bundle) and extracts register rows, playbook drafts, recurring
  task templates and KPIs. `sampleForDiscipline` in `lib/onboarding/sample-project.ts` tries the seed first, falls
  back to the generic three-item pack sample when the JSON is absent or the call runs client-side. `/api/onboarding/sample`
  is a GET-only route (no auth gate — static seed data, not personal info) that takes `?discipline=X`, validates with
  `normaliseDiscipline`, and returns `{ success: true, data: DisciplineSeedPreview | null }`. The wizard's step 7
  preview fetches the route when `projectMode === "sample"` and the discipline changes, then renders register rows as
  cards in a two-column grid with kind badges, playbook drafts with frequency and step-count badges, recurring tasks
  as a list with frequency badges, and KPIs as badge chips. A `needsConfirmation` flag on the seed surfaces an amber
  panel listing the items that require the member's sign-off before they become live. The plan items written to
  `agent_plans` are derived from the seed (up to 3 register items, 2 playbook items, 3 task items, 1 KPI item), so
  the draft plan the member sees in the preview is the plan they get.
- **The dashboard reads the pack.** `/dashboard` fetches `/api/onboarding` as a failure-tolerant fifth
  read — a 401 or a slow DB can only drop a banner, never block the page. When a pack is resolved, a strip
  lists its sections (filtered to the five the dashboard actually has) in the pack's order; when the
  status is `in_progress`, the resume banner appears above the KPI cards.
- **Re-editable, deferrable, restartable, and finished in two writes.** `/dashboard/settings` carries a
  *Setup wizard* card that states the status (including the grandfathered variant), names the row and its
  `origin`, links back to `/onboarding` and offers *Restart setup* whenever the account is not already
  `in_progress`. The wizard's *Set up later* is a persisted `skipped`, not a no-op. *Finish* saves the
  account name first when the profile step was skipped past (so the required-name rule is not a trap), then
  saves `status: "completed"`; a failed save leaves the status untouched and shows the reason.
- **Deliberately absent**: a `phone` or onboarding column on `users`; an organization or membership table
  beyond the invitation; a team name editable by a non-admin; an auto-created project or task; password
  collection anywhere in the wizard; and any client-side flag deciding completion — the stored row does.
- Guards: `tests/unit/onboarding-state.test.ts`, `settings-patch.test.ts`,
  `onboarding-invitation.test.ts`, `onboarding-schema.test.ts`, `onboarding-routes.test.ts`,
  `onboarding-checks.test.ts` (the owner's seventeen checks, each naming its scenario) and
  `onboarding-gate.test.ts` (the gate rules, skip/restart, the layout wiring, the page's no-redirect rule
  and the three scripts) — seven files, 97 tests — plus four onboarding guards in `worklog-reports.test.ts`,
  `tests/unit/onboarding-sample-project.test.ts` (the seed-based sample: all 75 disciplines get a usable bounded
  sample, discipline-specific content, method drawn from the authored pack, null-discipline fallback) and
  `tests/integration/onboarding-sample-seed.test.ts` (20 source-guards: the route is GET-only with a discipline
  query param and no Gemini key, the reader guards against browser execution and extracts registers/playbooks/tasks/KPIs,
  the sample module tries the seed first and falls back to the pack, the wizard fetches from the API and renders all
  four preview sections plus the needs-confirmation panel).
  Suite: 156 files / 2596 tests.


## 23. Agent entry (phase 18, 2026-10-27)

- **One page, two jobs.** `/dashboard/agent` keeps `?tab=handover` (default; the visible tab reads
  **Import**) and `?tab=recommendations` in the URL, so a link opens the same list.
- **Import is preview → edit → commit.** `POST /api/agent/handover` reads a pasted brief or one PDF
  against a chosen role pack and returns normalised register rows, playbook drafts and a refusal list.
  The cards on the preview mirror the destination pages (kind label, custody, "In service"/"Draft"
  status, pack title, model-draft badge, step count, tags), and each row is editable, removable or
  addable before commit. `lib/agent/handover-edit.ts` mirrors the commit validators client-side
  (title, kind ∈ pack kinds, no credential-shaped field, method-keyed steps with an action, a
  discipline that is null or a known work discipline) so the common rejections can't be silently
  submitted. It writes nothing, stores neither the text nor the PDF, and never logs them.
- **The second door is the same validator.** `POST /api/agent/handover/commit` re-runs
  `stripCredentialValues`, `readRegisterFields`, `isRegisterCustody` and `readPlaybookInput` on everything
  the browser sends back, dedupes registers by `(packKey, kind, title)` and playbooks by `(packKey, title)`,
  and reports each skipped row by title and reason — never by the value it refused.
- **Provenance is decided by the server.** Committed registers are `source: "gemini"`; committed playbooks
  are `status: "draft"`, `version: 1`, `authorId` = the session, `source: "gemini"`, `aiMarked: true`. The
  publish gate from phase 16 is unchanged, so a model draft still needs a human edit before anyone can rely
  on it. The editor's PATCH may set `aiMarked` to true and never clears it; clearing stays a human content
  edit on a model draft.
- **Precautions come from the unsaved draft.** `POST /api/agent/precautions` takes the editor's current
  title, method and steps and returns 3–6 `{text, why}`. A suggestion is dropped if it is over 200
  characters, duplicates a line a person wrote, or asks for a credential value; if none survives, the answer
  is a 502 rather than a guess. Accepting one appends it to the draft and marks the row, so the printed
  sheet's "Precautions (model-drafted)" heading is true.
- **Rules first, AI second.** `lib/recommend/next.ts` holds six rules — `stale_register`, `overdue_renewal`,
  `deliverable_stuck` (3 days in review), `career_gap`, `report_missing` (a period with work and no report),
  `missing_log` — each with `{id, kind, why, action, href, confidence, refs}`, capped at 8 and ordered by
  confidence. `POST /api/agent/recommendations` re-reads the member's rows server-side and returns them with
  no key at all.
- **The AI twin cannot invent.** `{ai: true}` adds at most three suggestions; each must name a row whose id
  exists in the member's own facts, link to a known internal page, and write no number that is not already
  in the facts. An answer that loses every suggestion is a 502 with nothing rendered. Nothing is persisted —
  every item is a proposal whose button opens the real form.
- **Machine advice is labelled everywhere it appears.** The page badges AI rows, the editor badges each
  suggestion, and both say the line stays marked on the printed sheet.
- **Deliberately absent.** No handover is stored as a document, no suggestion writes a `tasks` row
  (promotion is still the only path), and no register value is ever treated as a credential store.
- Guards: `agent-handover` (10), `agent-precautions` (9), `recommend-next` (13), `agent-routes` (16),
  `agent-page` (10) — five files, 58 tests, plus two existing guards taught the new gate and the new
  `aiMarked` rule. Suite: 108 files / 1791 tests.

## 24. Sessions, deep links and a signed-in header (2026-10-28)

A login is a row, not a pair of self-asserted cookies; a deep link survives the sign-in it interrupts;
and the public header greets a member with their own face instead of an invitation to join. One new
table, nine new guard files, no change to how the pages themselves are written.

- **The cookie is opaque and the database decides.** `jv_session` carries 32 random bytes as base64url;
  only `sha256(token)` is stored, in `auth_sessions` (`user_id` FK cascade, `expires_at`, `last_seen_at`,
  `revoked_at`). A session ends after 24 idle hours, slides forward when it is used (renewed under 20h),
  and is capped at 30 days from its first sign-in; `last_seen_at` is written at most once a minute so a
  poll cannot turn into a write per request. Signing out sets `revoked_at` — the row is the record.
  `scripts/create-auth-sessions-table.mjs` (`npm run db:auth-sessions`) is additive-only and
  `scripts/rollback-auth-sessions-table.mjs` refuses unless `AUTH_SESSIONS_ROLLBACK=yes`.
- **Four outcomes, never collapsed into two.** `anonymous`, `invalid` (`not_found | expired | revoked`),
  `unreachable` and `active` are distinct end to end. A missing, unknown or revoked token is a sign-out;
  a database that did not answer is a retry — `/api/auth/session` answers 503 with `Retry-After`, and the
  dashboard layout falls through instead of redirecting. That distinction is the "fake 401" fix: a waking
  Neon compute can no longer look like an attacker.
- **The old cookies are cleared, never honoured.** `session_id` and `user_id` are deleted on the next
  login or logout and never read; no route or action accepts a user id from the browser.
- **A deep link survives sign-in.** `proxy.ts` sends an anonymous visitor to
  `/login?next=<path + query>` and records the same value in an `x-jv-path` request header for the server
  layouts, which redirect only after reading the row. The login page runs `?next=` through
  `safeNextPath` — single-slash-rooted, no backslash, no control characters, no path that would bounce
  back into auth — and falls back to `/dashboard`. `/onboarding?invite=…` travels the same way, so an
  invited visitor returns to the exact link.
- **Every auth endpoint is rate limited.** Fixed-window counters keyed by `auth:<scope>:ip:<ip>` and
  `auth:<scope>:email:<email>` answer 429 with `Retry-After`; a successful login refunds its attempts so
  a busy shared IP does not lock the next person out.
- **A reset link is a digest too.** `lib/auth/reset-token.ts` mints 32 random bytes and
  `password_reset_tokens.token` stores only `sha256(token)`, so a dump of that table is not a set of
  working links; the lookup and the delete hash the incoming value the same way. A stalled database on
  this path now throws `DatabaseUnreachableError` instead of answering null, so `/api/auth/verify-token`
  and `/api/auth/reset-password` reply 503 and the page says "try again" rather than "invalid or expired
  token" to somebody whose link is perfectly good.
- **The header shows the member.** The marketing navbar reads `useAuth()` and renders three states: the
  avatar menu (name, email, Dashboard, Settings, Log out) for a known user; the Log in / Get started pair
  for a finished read that found nobody; and an avatar-sized placeholder while the first read is still in
  flight, so nobody is called signed out before the cookie is read. Initials fall back from the name to
  the email's first letter. The drawer repeats the same three states with the account block above
  Dashboard and Log out.
- **Deliberately absent**: a JWT or refresh token; a second cookie; a written `last_seen_at` on every
  request; a reverse bounce off `/login` (a signed-in visitor may see the form; nothing there is unsafe);
  a client-side opinion about who is signed in; and any redirect decided on `unreachable`.
- Guards: `session-token`, `session-expiry`, `session-state`, `session-store`, `session-schema`,
  `session-read`, `session-guards`, `next-path`, `rate-limit`, `reset-token` — ten files, 131
  tests. Suite: 121 files / 1981 tests.

## 25. Operations engine config persisted (2026-10-30)

The deterministic operations engine (log entities, query-time KPIs, a monthly report and a
review playbook per pack) already had its schema, CRUD routes and KPI math, but nothing had
ever written a pack's `ops_config`, so every surface read a null config and stayed dark. This
step persists that config from code for every discipline, not just IT.

- **One registry is the single source.** `lib/packs/ops/registry.ts` maps each seeded pack key to
  its `OpsConfig`. `it-technician` carries its hand-authored workbook config unchanged
  (`lib/packs/ops/it-technician.ts`: 7 log entities, 15 KPIs, 8 recommendation rules). The other
  eleven are derived by `opsConfigFromPack` (`lib/packs/ops/from-pack.ts`) from data the pack
  already declares — one log entity per register kind (using the pack's own kind label), a
  query-time "logged this month" and "still open" count per kind, a monthly report over those
  counts, and a review playbook whose phases are the pack's actual `method`.
- **Derive, never invent.** A derived config carries no `recommendRules` and no
  `automationTemplates`, because those assert domain risk logic (backup SLAs, licence expiry) the
  engine only has a source for on the IT pack. Nothing is fabricated to make the other disciplines
  look richer than they are. `opsConfigFromPack` returns null for a pack with no register kinds
  rather than emit an entity-less config that cannot validate.
- **Persistence is additive and opt-in.** `scripts/seed-ops-config.mjs` (`npm run db:ops:seed`)
  reads the registry, validates every config with `safeValidateOpsConfig`, and only ever runs
  `UPDATE role_packs SET ops_config = … WHERE pack_key = …` — never an insert, delete, truncate or
  drop. It is a dry run by default and applies nothing until `-- --write` is passed; it stops if the
  `ops_config` column is absent and prints only a masked host, never the connection string.
  `scripts/create-registers-tables.mjs` (`npm run db:registers`) now backfills the same value onto a
  fresh pack row only when `ops_config IS NULL`, so a re-run and an admin edit both survive.
- **Every discipline lights up.** Because the registry keys are exactly the twelve seeded packs and
  `resolvePack` serves a member the config of the pack claiming their discipline, all 75
  `WORK_DISCIPLINES` now resolve a config. A unit test proves every registry entry validates, every
  registry key is a seeded pack, every seeded pack resolves a non-null config, and a derived pack
  exposes its register-kind labels and no invented rules.
- **Not yet run against production.** The seed is wired and tested; applying it to live Neon is a
  separate, owner-approved action.

## 26. Operations surfaces reachable without dead links (2026-10-30)

Persisting the config (step 25) flips `hasOpsConfig` true for every discipline, which makes the
"My Operations" nav group and the overview page render for the first time. Before that group ever
appeared, several of its links pointed at routes that do not exist yet. This step clears them so no
reachable link 404s, while leaving the not-yet-built pages for their own steps.

- **Recommendation links land somewhere real.** `lib/ops/recommend.ts` previously mapped every log
  entity to `/dashboard/operations` (never built) with a dead fallback. It now sends register
  recommendations to `/dashboard/registers` and every other entity to `/dashboard/ops`, the overview
  that actually renders KPIs, recommendations and today's checklist. The dedicated per-entity logs
  page remains a later build and can reclaim those hrefs when it ships.
- **Overview actions are clickable.** Each recommendation's `action` on `/dashboard/ops` is now a real
  link to its `href`, not inert coloured text.
- **Unbuilt pages stay unlinked.** The sidebar group and the overview top bar no longer advertise
  `/dashboard/ops/logs` (step 25's logs page) or `/dashboard/ops/kpis` (the KPI detail page); they
  keep "Operations overview" and "Import document", which exist. The static ops-pack authoring corpus
  under `public/files/jiravision-ops-seeds/` still names those future surfaces by design and is
  untouched.
- **Guards hold the line.** The ops overview integration test now asserts the recommendation hrefs
  omit `/dashboard/operations`, the sidebar and top bar omit the two unbuilt routes, and the overview
  renders `rec.href` as a link.

## 27. Activity logs page, driven by the pack config (2026-10-30)

The overview surfaces read the config, but the member had nowhere to actually record activity. This
step adds `/dashboard/ops/logs` — the write surface the operations engine was built around — and
reconnects the links that step 26 had pulled.

- **The form is the schema.** `/api/ops/pack` now returns the pack's validated `logs` definition
  (entity key → label + each field's name, type, required flag and enum values). The page renders one
  tab per log entity and generates the entry form from the selected entity's declared fields — a text
  area for `text`, a dropdown for `enum`, a date/datetime picker for `date`/`datetime`, a number box
  for `number`, a single-line box for `string`. No field name or type is hardcoded per discipline, so
  the IT Technician workbook and every derived pack both drive the same screen.
- **Full CRUD against the existing routes.** Add posts to `/api/ops/entries`; edit PATCHes
  `/api/ops/entries/[id]`; delete removes it. The server (`validateFields`) is still the authority, so
  the client only ever sends the fields the pack declared and a required field left blank is rejected
  with the server's message in a toast rather than written.
- **Entity deep-links work.** `recommend.ts` now points log-entity recommendations at
  `/dashboard/ops/logs?entity=<key>` (registers stay at `/dashboard/registers`), and the page reads
  `?entity=` to open the matching tab and keeps the URL in sync. The sidebar "Activity logs" item and
  the overview top-bar button are back, now landing on a real page.
- **Guards.** A new integration test proves the pack route serves `logs`, the client builds its form
  from each field type, wires POST/PATCH/DELETE, and degrades to a "no operations configured" state;
  the overview test confirms the logs link returned while the KPI detail page (a later step) stays
  unlinked.

## 28. KPI detail page, one month at a time (2026-10-30)

The overview shows a compact KPI strip, but a member had nowhere to study a single month's metrics or
see which targets they missed. This step adds `/dashboard/ops/kpis` and reconnects the "KPIs" link
step 26 had pulled.

- **Numbers stay computed, never invented.** The page fetches `/api/ops/kpis?pack=…&month=…`, which
  runs `computeMonthlyKpis` over the member's own `ops_log_entries` and `register_items`. Every value,
  target and met/below flag comes from the pack's `kpis` config applied to real rows; the client holds
  no arithmetic of its own and never estimates a missing month.
- **Month navigation.** Left/right controls shift one calendar month; the active month is mirrored to
  `?month=` so a KPI view is shareable and survives a refresh. A non-`YYYY-MM` value falls back to the
  current month. Ratio KPIs render as percentages; the rest carry their declared unit.
- **Target-vs-actual read.** Each card pairs the value with its target and a status glyph — on target,
  below target, or no target set — and a summary bar counts how many KPIs met, how many fell short,
  and how many entries and register rows the month drew from.
- **Guards.** A new integration test proves the page delegates computation to the API (it does not
  import `computeKpis` itself), navigates months and syncs the URL, renders the met indicator and
  `tabular-nums` values, states that numbers are "computed from rows you logged", and degrades to a
  "no operations configured" state. The overview test now expects the KPIs link back in the sidebar
  and top bar.

## 29. Report previews, seeded from the pack's templates (2026-10-30)

The operations engine lets a member log activity and read KPIs, but the pack's declared report
templates had nowhere to be seen before the member went to write a report blind. This step adds
`/dashboard/ops/reports` — a read-only preview of those templates that hands off to the existing work-report builder.

- **Templates come from the config.** `/api/ops/pack` now also returns the pack's `reportTemplates`
  (id, label, period, ordered `{ kpiId, label }` sections). Every one of the twelve seeded packs
  declares at least one — IT hand-authored, the other eleven derived per register kind — so the page
  is live for any discipline without a single hardcoded report.
- **The preview is computed, never estimated.** For the selected month the page reuses
  `/api/ops/kpis` and joins each section's `kpiId` to the resulting value, target and met flag; a
  section with no matching KPI shows "no data for <month>". The client holds no arithmetic of its own.
- **Read-only by construction.** The page issues no POST/PATCH/DELETE; it only reads. Its one action is
  an "Open in report builder" link that deep-links to `/dashboard/reports-work` prefilled with the
  template's period (`v=build&p=<type>&d=<month>`, or a custom span for a quarterly template, since
  the builder has no quarter unit). The member finishes and submits the real report through the normal
  flow — this page seeds it, it does not write it.
- **Month-navigable and reachable.** The preview shifts one month at a time and mirrors the month to
  `?month=`; a "Report previews" item (FileBarChart2) joins the "My Operations" sidebar group and the
  overview top bar now links to it alongside logs and KPIs.
- **Guards.** A new integration test proves the pack route serves `reportTemplates`, the page renders
  each template's sections joined to computed KPIs (no `computeKpis` import, no estimation), is read-only,
  hands off to the builder with the period, and degrades to "no operations configured" / "no report
  templates" states; the overview test now expects the reports link in the sidebar and top bar.

## 30. Document import preview is faithful and editable (2026-10-30)

`/dashboard/ops/import` could extract a document into four surfaces — log entries, register items,
playbooks, tasks — but the preview was a truncated read-only table, so what the member saw was not
what the commit wrote. This step makes the preview the actual draft: schema-faithful, editable inline,
and validated by the same rules the server uses.

- **The pack schema drives every field.** In the preview phase the page fetches `/api/ops/pack` and
  renders each extracted log entry against its entity's declared fields — the same per-type widgets the
  activity-log page uses (string / text / number / date / datetime / enum). A key the model invented that
  the pack never declared is shown as "not in your pack" instead of being silently dropped, and required
  fields are marked and checked before commit.
- **Preview and commit are the same object.** All four editors mutate one `extraction` state and
  `handleCommit` POSTs exactly that object, so there is no second copy that could drift. The page still
  issues no PATCH — editing a draft before it exists needs no write endpoint.
- **Register fields now cross the credential boundary.** The commit path pushes every register item's
  fields through `readRegisterFields`, the server's own rule: a password- or token-shaped key is refused,
  the row is counted as skipped, and the reason is reported. The page surfaces the same refusal inline via
  `readRegisterFieldsFor`, so the member learns before submitting rather than after.
- **Task rows keep their own state.** `ExtractedTask` gained `status` and `priority`, normalised through
  `safeTaskStatus` / `safeTaskPriority` on both the extract and commit sides, so a handover document that
  says "in progress / urgent" no longer arrives as `todo` / `medium`.
- **The prompt speaks the member's discipline.** Extraction no longer claims an IT context or a hardcoded
  `server/computer/printer` list; the route passes the pack's own `registerKinds` and the member's
  discipline into the system prompt, so a nurse's document is read as nursing.
- **No record adder.** The preview only curates what was extracted — include/exclude per row. Fresh
  records belong on the activity-log and register pages, which already own the full form.
- **Guards.** `tests/unit/ops-import-preview.test.ts` covers the pure helper surface (declared-field
  projection, dropped-key detection, per-field mutators, step reorder, task vocab clamping); the extract
  unit test's fixture now carries status and priority; and a new
  `ops import D5: faithful + editable preview` block in `tests/integration/ops-import.test.ts` proves the
  page drives from `/api/ops/pack` and reuses the server validators, mutates a single `extraction` object,
  surfaces register refusals inline, that commit gates registers through `readRegisterFields` and clamps
  task status/priority, that the prompt is discipline-named with no IT residue, and that the page issues
  no PATCH.

## 31. The two document doors say which one you want (2026-10-30)

A member holding a file had two import routes in the sidebar — "Import document" under My Operations and
the agent's "Import" tab — and nothing in either page explained the difference. Each now names the other.

- **Ops import points outward.** Under its existing privacy disclosure, `/dashboard/ops/import` states that
  this door fills your own operations and links (Bot icon) to the agent handover import, which writes the
  register and playbook library for whichever pack you choose.
- **The agent points back.** On its handover tab, `/dashboard/agent` states that this door reads one
  handover into the register and the playbook library and links (FileText icon) to Import document for
  activity logs, records and tasks in your own operations.
- **Links only.** No behavior changed, no route added, no new write: both pages keep their own extract →
  preview → commit flow. The handoff text is static and sits outside the extraction result, so it shows
  whether or not the pack has an ops config.
- **Guards.** A new `ops import D6` block in `tests/integration/ops-import.test.ts` asserts each page links
  to the other with the right anchor text and that neither page issues PATCH/DELETE.

## 32. The runbooks your pack declares, previewed where you work (2026-10-30)

Every pack's `opsConfig` carries `playbookSeeds` — the daily/weekly/monthly runbooks that discipline is
meant to work, with a method and the steps inside each phase. Nothing read them: the field was written into
`role_packs.ops_config` and never surfaced, while the playbook runner itself (`/dashboard/playbooks/[id]/run`)
had shipped and working some time earlier. This PR closes the actual gap — a read path from the ops
surfaces to those declarations — and invents nothing.

- **The pack route serves the seeds.** `GET /api/ops/pack` now returns `playbookSeeds` alongside `logs` and
  `reportTemplates` (`ctx?.config.playbookSeeds ?? null`, and `null` in the no-discipline branch), so the
  operations pages read one endpoint for everything the pack declares.
- **`/dashboard/ops/playbooks` — read-only previews.** One card per seed: its frequency, phase and step
  counts as badges, the method as an ordered list of badges, then every phase as a numbered block with each
  step listed under it. A phase that declares no steps says so instead of being hidden.
- **Honest about what a seed is.** The page states plainly that these are declarations from the role pack,
  not saved SOPs, and that nothing here is written to the library. Seeds carry plain step strings; the rich
  `PlaybookStep` fields (checks, precautions, PPE, stop conditions, evidence) belong to a playbook someone
  has written, so this page does not fabricate them.
- **A working handoff.** Each card links to `/dashboard/playbooks?q=<seed label>`; the library honors `?q=`,
  so "Open in playbook library" lands on a filtered list rather than a dead route. The header also links to
  the unfiltered library, and the footer to the overview, activity logs and report previews.
- **Navigation.** "Playbook previews" joins the My Operations sidebar group between Report previews and
  Import document (still gated on `hasOpsConfig`), and the operations overview top bar gains a Playbooks
  button next to Reports.
- **Graceful states.** Loading shows a skeleton; a failed pack fetch shows a destructive alert with Try
  again; no ops config renders "No operations configured" with a link back; a pack that declares no seeds
  renders "No playbook seeds" instead of an empty grid.
- **Guards.** `tests/integration/ops-playbooks.test.ts` asserts the pack route serves `playbookSeeds`, that
  the page renders method phases and their steps, uses position-derived React keys rather than step text,
  deep-links with `?q=` from the seed label, carries the "not saved SOPs" disclosure, issues no
  POST/PATCH/DELETE, and degrades on both empty states; and that the sidebar and overview link to it with
  `BookOpenCheck` actually imported. `tests/integration/ops-overview.test.ts` now expects the playbooks
  route in the sidebar link set and the overview top bar.

## 33. The rules themselves, shown to the people they govern (2026-10-30)

Asked whether a document upload could produce the full IT-workbook mapping (entities, KPI targets,
escalation rules, checklists, report sections) for all 75 disciplines, the honest answer was no — and the
reason was unprovable from the UI. Six operations surfaces read `opsConfig`, and not one of them showed
it. A member could see four entity tabs and conclude anything; nothing told them those four entities all
have the same `date / item / status / note` fields, that their KPIs have no targets, and that the rules
sections were empty because no workbook had been authored for their discipline. You could measure the
effects of the config but never read the config.

- **`GET /api/ops/config` — the whole thing, and only yours.** Returns `{ packKey, discipline, config }`
  with the full validated `OpsConfig`: every log entity and field, every KPI definition, report templates,
  playbook seeds, automation templates, recommendation rules and the AI policy. The discipline comes from
  the caller's session — there is no `?pack=` or `?discipline=` to read another pack's rules with, and the
  route takes no body.
- **`/dashboard/ops/config` — read-only, in the order the engine consumes it.** A count strip first (entities,
  fields, KPIs with `n with a target`, seeds, report templates, automation templates, rules), then every
  entity card listing its fields with type, `required`, and the closed enum list or default inline, then the
  KPI table with source, aggregation, unit and target.
- **A missing target is shown as missing.** Derived packs count things but assert no threshold, so each KPI
  renders either its target badge or an explicit `no target set` outline badge. The KPI card header counts
  them ("<n> of <total> with a target") rather than implying the pack has set goals it has not.
- **Empty sections explain themselves.** Where seeds, report templates, automation templates or rules are
  absent, the card states the derived-baseline rule: the engine declares only what a pack can prove from its
  own register kinds and method, and rules and targets appear once authored for the discipline — "not
  invented by the importer". The gap is information, not a hole to hide.
- **Verbatim, not paraphrased.** Playbook seeds render each phase with its steps joined inline and the raw
  `frequency`/`id` shown; report templates show every section's `kpiId` next to its label; automation
  templates show `trigger.entity + condition (params)` and `action.type (params)`; rules show priority,
  observation, risk and action. Each links onward to the page that *uses* it (playbook previews, report
  previews), so the config and its effects stay connected.
- **The raw JSON is one click away.** A collapsed "Raw config JSON" disclosure prints
  `JSON.stringify(config, null, 2)` so the rules can be checked, diffed and quoted rather than trusted.
- **Navigation and layout.** "Pack config" joins the My Operations sidebar group after Import document, and
  the operations overview gains a Config button — which made its top bar seven controls wide, so that bar
  and its header row now wrap instead of overflowing.
- **No writes, no new tables.** One `GET`, nothing else; the page renders the config the seed script already
  persists in `role_packs.ops_config`.
- **Guards.** `tests/integration/ops-config.test.ts` asserts the route resolves from `defaultDisciplineOf(session)`
  and rejects parameter- or body-driven pack selection, returns the whole `ctx.config` rather than the
  `/api/ops/pack` slices, says plainly when a discipline has no pack; that the page renders all seven
  sections, field types/required/enum values, `no target set`, the derived-baseline explanation, the raw
  JSON, position-derived keys for seed phases and template sections, and issues no POST/PATCH/DELETE; plus
  the Suspense shell and the sidebar/overview links with `Settings2` actually imported.

## 34. Approve-and-apply UI on the pack config page (2026-10-31)

The read-only config page showed the rules but offered no way to change them. An admin who wanted to add a
log entity, set a KPI target, or author a recommendation rule had to edit the seed script and re-run the
migration. The propose-and-apply flow closes that gap: an admin uploads a document or pastes text, Gemini
extracts a proposal, the admin reviews each item with a diff, selects what to accept, and applies it — all
through the UI, with the config persisted to `role_packs.ops_config` and immediately visible on the read page.

- **`POST /api/ops/config/propose` — document in, diff out.** Accepts `{ document: { name, text } }` or a
  base64-encoded PDF, calls `geminiJson<T>()` with the ops-config proposal prompt, and returns the extracted
  items classified as `new`, `conflict`, or `duplicate` against the current config. Admin-only: the route
  checks `session.role === "admin" || session.role === "super_admin"` before calling Gemini, protecting the
  free-tier quota (20 requests/day) from non-admin traffic. The proposal is normalized (`normaliseProposal`)
  to refuse credential values and flag AI-policy changes as privacy stances the admin must explicitly accept.
- **`POST /api/ops/config/apply` — selected items in, merged config persisted.** Takes `{ selectedRefs: string[] }`
  where each ref is `section:id` (e.g., `logs:asset_audits`, `kpis:assets_open`). Re-normalizes the proposal
  (so a tampered browser payload cannot bypass the privacy gate), merges only the selected items into a copy
  of the current config, validates the result against the `OpsConfig` Zod schema, and writes it to
  `role_packs.ops_config`. Returns `{ applied, counts, rejected, config, previous }` so the UI can show what
  changed and offer an undo path. Admin-only, with the same role check as propose.
- **`POST /api/ops/config/reset` — back to the code-authored baseline.** Takes `{ confirm: true }` and restores
  the config from `lib/packs/ops/registry.ts` (the same source the seed script uses), overwriting whatever the
  admin had applied. Two-step confirmation in the UI: the admin clicks "Reset to code-authored config", then
  "Confirm reset" — the first click sets `confirmReset = true` and swaps the button, the second click fires
  the route. Admin-only.
- **The propose panel (`config-propose.tsx`) — upload, review, apply.** A `SectionCard` mounted below the
  read-only config view when `data.admin && data.packKey && data.discipline` are all present. Three phases:
  `upload` (file input or paste textarea, with a disclosure that the text is sent to Google and not stored),
  `reading` (spinner while Gemini extracts), `review` (checkboxes for each proposed item, grouped by section,
  with status badges: `new` = green, `conflict` = amber, `duplicate` = gray). The apply button is disabled
  until at least one item is selected and the acknowledgement checkbox ("I have read the items I selected and
  understand this changes the rules everyone on {discipline} logs against") is checked. During the `applying`
  phase, the button shows a spinner instead of the shield icon.
- **Safe defaults: only `new` items checked.** `defaultSelection(items)` returns only the refs with
  `status === "new"`, so conflicts and duplicates require explicit opt-in. The selection summary reads
  "add 3 new definitions, replace 1, leaving 2 unselected" — the admin sees exactly what will change before
  clicking Apply.
- **The diff is shown, not hidden.** Each proposed item renders its section label, ID, status badge, and the
  formatted difference between the current config value and the proposed value (`formatSide` renders field
  definitions as `type [values], required` rather than collapsing to "3 keys"). The admin can inspect every
  change before accepting it.
- **Re-normalization is the security gate.** The apply route does not trust the browser's proposal payload —
  it re-runs `normaliseProposal` on whatever the client sends, so if the admin opened devtools and edited the
  proposal to include a credential value or an AI-policy change, the route refuses it and returns the reason
  in `rejected`. The AI policy is a privacy stance, not a config field to be edited through a document.
- **The disclosure is always visible.** Below the upload area and the review list, the panel states: "The
  pasted text or PDF is sent to Google for processing and is not stored. Credential values are refused; record
  where each one is kept instead. AI output is a draft — the rules below are not in force until you apply
  them." No fine print, no hidden terms.
- **Guards.** `tests/integration/ops-config-apply.test.ts` (17 tests) asserts the three routes reject
  unauthenticated requests, reject non-admin roles, re-normalize proposals to refuse credentials and AI-policy
  changes, write only to the caller's pack, and log the audit trail. `tests/unit/ops-config-review.test.ts`
  (12 tests) asserts `defaultSelection` checks only `new` items, `toggleRef` adds and removes refs,
  `selectAllInSection` toggles the whole section, and `selectionSummary` formats the counts correctly.
  `tests/integration/ops-config-propose-ui.test.ts` (13 tests) asserts the panel is a client component, calls
  all three routes, shows the disclosure, requires acknowledgement, and renders the apply button during the
  `applying` phase so the spinner is visible.

## 35. Undo and rollback for config changes (2026-10-31)

The apply route returns the previous config, but the UI had no way to use it. An admin who applied a proposal
and immediately realized it was wrong had only the reset-to-code-authored door, which throws away every change
the pack had accumulated — not just the last one. The undo door reverts the last apply without discarding
earlier work, and the reset door stays available as a full rollback to the seed script baseline.

- **`POST /api/ops/config/revert` — previous config in, replaced config out.** Takes `{ previous }` where
  `previous` is the config before the last apply. Re-validates it against the `OpsConfig` Zod schema before
  writing, so a tampered or stale payload cannot corrupt the pack's rules. Returns `{ config, replaced }` where
  `config` is the restored config and `replaced` is what was in place before the revert — so the admin can
  undo the undo if needed. Admin-only, scoped to the caller's discipline (no `packKey` parameter).
- **Two undo doors, not one.** After a successful apply, the UI shows two buttons: "Undo last apply" (calls
  revert with the previous config) and "Reset to code-authored config" (calls reset with `{ confirm: true }`).
  The first reverts the last change; the second throws away every applied change and restores the seed script
  baseline. Both require the admin to click through a confirmation step.
- **The previous config is stored in the UI, not re-fetched.** The apply response includes `previous`, which
  the panel stores in `previousConfig` state. The revert route receives it back in the request body — no
  server-side history table, no session-scoped stash, no race between two admins applying at once.
- **Re-validation is the security gate.** The revert route does not trust the browser's previous config — it
  re-runs `safeValidateOpsConfig(previous)` before writing, so if the admin opened devtools and edited the
  previous config to include an invalid field or a malformed entity, the route refuses it with a 400.
- **The audit trail names the revert.** The route logs `opsConfig revert: user=<id> pack=<key>` without
  including the config content, so the audit trail shows who reverted what without filling the logs with JSON.
- **Guards.** `tests/integration/ops-config-revert.test.ts` (11 tests) asserts the route is POST-only, requires
  a signed-in admin session, requires the previous config in the body, re-validates it against the schema,
  scopes the revert to the caller's discipline, writes to `role_packs.ops_config`, returns the replaced config,
  logs the audit trail, uses `force-dynamic`, and never reads `GOOGLE_GEMINI_API_KEY`.
  `tests/integration/ops-config-propose-ui.test.ts` (5 additional tests) asserts the panel calls the revert
  route with the previous config, stores it from the apply response, shows the undo button after a successful
  apply, keeps the reset-to-code-authored button as a separate door, and clears the previous config when the
  undo fires.

## 36. Audit trail for config changes (2026-10-31)

The apply, revert, and reset routes logged to console, but there was no way to view the history in the UI. An
admin could see that a change had been made (the config was different), but not who made it, when, or what
operation they performed. The audit trail persists one row per operation to `ops_config_audit` and renders the
last 50 events on the config page.

- **`ops_config_audit` table.** Stores `pack_key`, `discipline`, `user_id`, `operation` (apply/revert/reset),
  `summary` (JSONB with counts of applied/replaced/new items), and `created_at`. Indexed on `pack_key` and
  `created_at` for fast lookups. The migration script (`scripts/create-ops-config-audit-table.mjs`) creates the
  table additive-only; the rollback script drops it.
- **The write routes log audit events.** The apply route writes `{ operation: "apply", summary: { applied, replaced, new } }`;
  the revert and reset routes write `{ operation: "revert"|"reset", summary: {} }`. The audit insert happens
  after the config write succeeds, so a failed apply does not leave an orphan audit row.
- **`GET /api/ops/config/audit` — the last 50 events, newest first.** Returns `{ events }` where each event has
  `{ id, operation, summary, createdAt, userId }`. The route does not return the full config snapshots — those
  are large and the audit trail is for "who changed what and when", not "what exactly was in the config at that
  moment". Admin-only, scoped to the caller's discipline (no `packKey` parameter).
- **The audit UI (`config-audit.tsx`) — a change history card.** Mounted below the propose panel on the config
  page, visible to admins only. Each event shows an operation badge (applied/reverted/reset), the user ID, the
  summary (formatted as "3 items, 1 replaced, 2 new"), and a relative timestamp ("5 minutes ago", "2 days ago").
  Empty state: "No changes have been made to this pack's config yet."
- **The summary is enough to understand scope, not content.** An apply event with `{ applied: 5, replaced: 2, new: 3 }`
  tells the admin "five items were accepted, two of them replaced existing definitions, three were new" — enough
  to understand the magnitude of the change without dumping the whole config. The full before/after is available
  via the undo door (revert returns the replaced config).
- **Guards.** `tests/integration/ops-config-audit.test.ts` (12 tests) asserts the audit route is GET-only,
  requires a signed-in admin session, scopes the read to the caller's discipline, reads from `ops_config_audit`,
  returns the last 50 events newest first, returns only the audit fields (not full config snapshots), uses
  `force-dynamic`, and never reads `GOOGLE_GEMINI_API_KEY`; plus 3 tests asserting the apply/revert/reset routes
  write audit events with the correct operation. `tests/integration/ops-config-propose-ui.test.ts` (4 additional
  tests) asserts the audit UI is a client component, fetches the audit route, shows the operation/summary/timestamp,
  renders an empty state, and is mounted in the config client for admins only.

## 37. Export config as JSON (2026-10-31)

The raw JSON disclosure on the config page lets an admin inspect the rules, but there was no way to download
them. An admin who wanted to back up the config before making changes, share it with someone for review, or diff
it manually with another version had to copy-paste from the disclosure. The export button downloads the current
config as a timestamped JSON file.

- **Export JSON button in the header.** Next to the Reload button, the "Export JSON" button downloads the current
  config as `{packKey}-config-{timestamp}.json` (e.g., `it_technician-config-2026-10-31T14-22-35.json`). The
  timestamp is ISO 8601 with colons and periods replaced by hyphens so the filename is safe on all filesystems.
- **Client-side download, no server route.** The export function creates a `Blob` from `JSON.stringify(config, null, 2)`,
  generates an object URL, creates a temporary `<a>` element with the `download` attribute, clicks it, and revokes
  the URL. No data leaves the browser — the config is already in memory from the `/api/ops/config` GET call.
- **The Download icon from lucide-react.** The button uses the `Download` icon (not `FileDown` or `Save`) to match
  the convention used elsewhere in the dashboard (worklog export, report builder export).
- **Visible to all signed-in members, not just admins.** The export button is in the header, outside the
  `data.admin &&` guard that wraps the propose panel and audit trail. Any member who can read the config can
  export it — the config is read-only for non-admins anyway, so there is no write to gate.
- **Guards.** `tests/integration/ops-config.test.ts` (1 additional test) asserts the client component contains
  the `exportConfig` function, the `Download` icon, the "Export JSON" label, the `application/json` MIME type,
  the `.json` extension, and the `toISOString()` timestamp generation.

## 38. Compare current config with code-authored baseline (2026-10-31)

The config page shows the live rules and lets an admin propose changes from a document, apply them, undo them,
and export the result — but there was no way to see *what had been customized* compared to the baseline the seed
script declares. An admin considering a reset needed to know whether the current config was close to the code-authored
default or had drifted significantly. The comparison view computes the diff server-side and shows it collapsed by
default, expanding on demand.

- **The compare route (`/api/ops/config/compare`).** GET-only. Returns `{ current, baseline, diff }` where `current`
  is the live config from `role_packs.ops_config`, `baseline` is what `opsConfigForPackKey` declares (the same
  config the seed script and the reset route use), and `diff` is a server-side summary computed by `diffConfig`
  (`lib/ops/config/diff.ts`). Admin-only, scoped to the caller's discipline — there is no `packKey` parameter, so
  an admin cannot read another discipline's config by supplying a body field.
- **Graceful fallbacks.** If no code-authored baseline exists for the pack, the route returns `{ current, baseline: null, diff: null, message }`. If the baseline no longer validates against the current schema (e.g., the schema was tightened after the baseline was authored), the same shape is returned with a different message. The client renders the message as an informational note instead of an error.
- **The comparison UI (`config-compare.tsx`).** A `SectionCard` collapsed by default with a "Show comparison" button.
  Clicking it fetches the compare route and expands the card. The expanded view shows a count of customizations
  ("Pack `it_technician` has 3 customizations compared to the code-authored baseline"), then groups items by
  section (logs, kpis, etc.) with a capitalized heading and a list of items. Each item has a status badge
  (`added` / `modified` / `removed`) and shows the label and key. A Refresh button in the card header re-fetches
  the diff. Empty state: "No customizations — this pack matches the code-authored baseline exactly."
- **Mounted for admins only.** The config client wraps `<ConfigCompare>` in `data.admin && data.packKey &&`, so
  non-admin members never see the comparison card. The packKey is passed as a prop so the UI can display it in
  the summary line without re-fetching the config.
- **Guards.** `tests/integration/ops-config-compare.test.ts` (10 tests) asserts the compare route is GET-only,
  requires a signed-in admin session, scopes the read to the caller's discipline (no body-supplied packKey),
  returns both current and baseline, computes the diff server-side using `diffConfig`, handles the no-baseline
  and invalid-baseline cases, uses `force-dynamic`, and never reads `GOOGLE_GEMINI_API_KEY`; plus 5 tests
  asserting the comparison UI is a client component, fetches the compare route, shows status badges for each
  diff item, renders an empty state when there are no customizations, and is mounted in the config client for
  admins only.

## 39. Organization membership: teammates see each other, strangers see no one (2026-11-03)

Before this, "team" meant the whole user table: a second sign-up from a different company would see the first
company's member directory, assignee picker and workload aggregates. Membership is now the visibility boundary,
following the Slack-workspace / Notion-membership model — one organization per company, joined only through an
accepted invitation, and nothing crosses organizations.

- **Schema.** `organizations` (`id`, `name` ≤ 120, `owner_id → users`, `created_at`) and
  `users.organization_id` (nullable, `ON DELETE SET NULL`). The forward reference needs an explicit
  `(): AnyPgColumn =>` return type because users ↔ organizations is circular (drizzle/schema.ts).
  Migration is additive-only via `scripts/create-organizations-table.mjs` (`--dry-run` / `--apply`; rollback
  guarded by `ORGANIZATIONS_ROLLBACK=yes`) — **not yet applied to live Neon**, that needs an owner checkpoint.
- **The module (`lib/organizations.ts`).** `validateOrgName` is the single name rule shared by API and form.
  `visibleIdsFor(orgId, viewerId, memberIds)` is the pure boundary: null org → `[viewerId]` only; an org with a
  roster → the roster; a stale org id with an empty roster still returns the viewer, so their own data can never
  hide from them. `loadVisibleMemberIds(userId)` is the one-roundtrip loader every scoped read uses.
  `createOrganization` refuses a second membership.
- **What it scopes.** `/api/team/members` filters on the organization roster, and the two dashboard aggregates
  (workload/mood/leaderboard in `lib/dashboard-data.ts`) now read `loadVisibleMemberIds` instead of every user.
  A member with no organization sees empty team surfaces with two doors: invite someone or create an organization.
- **Tests.** `tests/unit/organizations.test.ts` (5 tests: name trim/empty/non-string/120-char boundary; the
  three `visibleIdsFor` cases).

## 40. shadcn calendar range picker: working days, weekend opt-in, opens below (2026-11-03)

Native `<input type="date">` gave no range selection, no team-aware weekends, and a browser-chrome dropdown that
opens wherever the engine likes. The replacement is the app's own shadcn Popover + Calendar pair, matching the
existing design tokens and always opening below the trigger.

- **Components (`components/ui/date-range-picker.tsx`).** `DateRangePicker` — `mode="range"`, `numberOfMonths=2`,
  selected range highlighted, working-day count under the calendar. Weekends are muted (`text-muted-foreground/40`)
  and non-selectable via the react-day-picker v8 matcher `{ dayOfWeek: [0, 6] }` styled through
  `modifiersClassNames` (v8 rejects custom keys in `classNames`). "I am needed this weekend" flips the matcher off
  without closing the popover. `DateField` is the single-date sibling for form fields, with `min`/`max` matchers
  merged alongside the weekend rule. Both use `PopoverContent side="bottom" align="start"`.
- **Pure math (`lib/working-days.ts`).** `toIsoDate` / `fromIsoDate` (strict `YYYY-MM-DD`, rejects rollovers like
  2026-02-30), `isWeekend`, `workingDaysBetween` (inclusive Mon–Fri, swaps reversed ranges, null on invalid),
  `formatDay`. ISO strings are the wire format everywhere, so existing URL state and API filters are unchanged.
- **Wired.** Worklog custom range, reports-work custom period (commit-on-complete: a half-picked range never
  ships to the URL; clearing falls back to the anchor day), sprint filter + sprint create dialog, task dialog due
  date, dashboard quick-draft, add-task modal, calendar event date. Native date inputs left deliberately: the
  anchor field on reports and filter fields on pages not in scope.
- **Tests.** `tests/unit/working-days.test.ts` (11 tests: round-trips, malformed rejects, Mon–Fri = 5,
  weekend-skip, weekend-only = 0, reversed range, null endpoints, two weeks = 10, `formatDay` copy).

## 41. IT Technician task list imported as the owner's canonical tasks (2026-11-03)

The owner's 41-task IT Technician import list replaces the 22 older tasks on
fakiiahmad001@gmail.com (account 1) on production Neon, with a full JSON backup taken first.

- **Data (`scripts/data/it-technician-tasks.json`).** All 41 tasks transcribed verbatim from the
  document: `seq`, `section` (1–7), title, description, priority, storyPoints, tags, cadence.
  Cadence distribution is daily 7, weekly 10, monthly 7, one-off 17; one `urgent` task
  (incident escalation). The document's four quarterly reviews are `one-off` because the task
  system's cadence vocabulary is one-off/daily/weekly/monthly/yearly — the "repeat this review
  quarterly" instruction stays in their descriptions.
- **Script (`scripts/import-it-technician-tasks.mjs`).** `--dry-run` reads and forecasts only.
  `--apply` writes `backups/it-tasks-backup-<stamp>.json` (tasks, task_instances, task_events,
  work_log_entries for that account), re-reads it and aborts if the row counts disagree, then
  runs delete-and-insert inside one `sql.begin` transaction. It refuses to double-import when any
  of the 41 titles already exist. `--restore <file>` re-inserts with the original ids, resets the
  sequences and rewires the worklog task links the delete's `ON DELETE SET NULL` dropped.
- **Recurrence parity.** Instance horizons mirror `lib/tasks/recurrence.ts` (`one-off` 0, daily 30,
  weekly 12, monthly 12, yearly 4) with the same UTC step math as `lib/cadence.ts`, so imported
  tasks materialize 414 instances exactly the way app-created ones do.
- **Untouched.** `work_log_entries` rows survive (26 kept, task links reset to NULL), sprints,
  deliverables, registers and every other account.
- **Post-apply state.** 41 tasks / 414 instances / 0 events, all `sprint_id IS NULL` (Backlog),
  all `status = 'todo'`, all `discipline = 'it_operations'`, 123 story points, no duplicate
  (task, date) pairs.
- **Tests.** `tests/unit/it-technician-import.test.ts` (11 guards): the transcription's counts and
  vocabulary, the backup-before-delete ordering and single-transaction delete+insert, the horizon
  counts read from `lib/tasks/recurrence.ts`, the Backlog contract, and the restore branch's column
  lists checked against `drizzle/schema.ts`.

## 42. IT Technician Q4-2026 goal list imported into the OKR workspace (2026-11-03)

The owner's 12-goal IT Technician import list is now the content of
https://jiravision.vercel.app/dashboard/goals for fakiiahmad001@gmail.com (account 1) on
production Neon. The `goals` table was empty before this, so the import is insert-only.

- **Data (`scripts/data/it-technician-goals.json`).** All 12 goals transcribed verbatim: title,
  description, `status: "not_started"`, `quarter: "2026-Q4"`, metric type, baseline, target,
  `current: 0`, `startDate: "2026-11-03"`, `dueDate: "2026-12-31"`, no parent. Ten goals are
  `percent` with `target: 100` and `baseline: null`; goals 3 and 9 are `number` with
  `baseline: 0` and targets 1 and 2 (reports/tests per quarter).
- **Mapping rulings.** "Q4 2026" normalizes to the app's own label format (`currentQuarter()`
  yields `2026-Q4`). "Baseline/Current: To be established" becomes `baseline = NULL` for percent
  goals — `computeProgress` reads a percent goal as its `current` value, so an invented baseline
  would silently change the math — and `current = 0` everywhere, so every goal starts at 0%.
  Goal 8's target prose ("100% scheduled network monitoring checks completed") is a measurement
  formula, not a number, so it lives in the description and the metric stays `percent → 100`.
- **Script (`scripts/import-it-technician-goals.mjs`).** `--dry-run` reports the account, current
  goal/checkin counts, and the per-goal forecast. `--apply` refuses when any of the 12 titles
  already exist on that account (delete them in the app first) and inserts all 12 inside one
  `sql.begin` transaction through postgres-js tagged templates. It never deletes, updates or
  truncates goals, and there is no `--restore` mode — nothing pre-existing is overwritten, so a
  backup would have nothing to restore. `created_by` is the owner, matching `owner_id`.
- **Post-apply state.** 12 goals (ids 6–17), all `not_started`, all top-level, 0 check-ins. The
  status badge on the page may already suggest "On track": `suggestStatus` compares 0% progress
  against elapsed time, and only a sliver of the 03 Nov – 31 Dec window has passed.
- **Tests.** `tests/unit/it-technician-goals-import.test.ts` (13 guards): 12 goals in document
  order with unique titles, statuses and metric types validated against the vocabularies exported
  by `app/api/goals/shared.ts`, the percent/number split (10 + 2) and their baselines/targets,
  `computeProgress` returning 0% for every imported goal, the quarter label and date pair, goal
  8's measurement wording, and the script's rails — insert-only SQL, the double-import guard, one
  transaction, the exact 13-column insert list, and no `sql.unsafe`/`tx.unsafe`.

## 43. IT Technician Q4 sprint plan and retrospectives imported (2026-11-03)

The owner's four-sprint plan and four retrospectives are live on production Neon, and the 41
imported IT tasks are allocated across those windows so the sprint board's default "Mine" scope
lists them — that scope shows only sprints the member holds tasks in (app/api/sprints/route.ts).

- **Data (`scripts/data/it-technician-sprints.json`).** The 4 sprints and 4 retros verbatim from
  the document, plus the task→sprint allocation as data rather than code. Capacity is deliberately
  absent: the script derives it from the mapping, so a typed number can never disagree with the
  tasks that actually land in a sprint.
- **Allocation.** Sprint 1 (13 tasks, 32 pts): §1's daily monitoring plus the ticket review, the
  urgent incident escalation and the ad-hoc user-issue fixes. Sprint 2 (12, 29): the weekly and
  monthly backup, maintenance, asset and licence reviews. Sprint 3 (9, 35): §6's four quarterly
  reviews plus restoration testing, on/offboarding, security-access and documentation habits.
  Sprint 4 (7, 27): recurring incidents, reporting, infrastructure docs, inventory reconciliation
  and the final handover. 41 tasks, 123 points, every task in exactly one sprint.
- **Windows.** 3 Nov – 17 Nov (active), 18 Nov – 2 Dec, 3 Dec – 16 Dec, 17 Dec – 31 Dec (planned) —
  contiguous, no gap or overlap, and they cover exactly the Q4 window the 12 goals are dated on.
  Each retro is dated on its sprint's last day and opens as `draft`.
- **Legacy sprints.** "Sprint 12 — Realtime Foundations" (`active`, ended 30 Oct) and "Sprint 13 —
  Dashboard Depth" (`planning`) are marked `completed`, so exactly one sprint is active. The close
  list is read at runtime and only ever includes sprints that hold zero tasks, and their
  `updated_at` is left alone because the page derives "ended on time" from it.
- **Script (`scripts/import-it-technician-sprints.mjs`).** `--dry-run` prints the allocation, the
  derived capacities, the clash list and the exact legacy rows it would close. `--apply` refuses if
  a planned task is missing, if any planned task already sits in a sprint, or if a sprint name or
  retro title exists (`GET /api/sprints` also dedupes by name, so a duplicate would disappear),
  writes `backups/it-sprints-backup-<stamp>.json` with every prior value it is about to overwrite
  plus the ids it creates, then does all writes in one transaction. `--restore <file>` replays the
  previous `sprint_id` values, reopens the legacy rows and deletes only the recorded created ids.
- **Post-apply state.** Sprints #5–#8 (one active), retros #1–#4, 41 tasks allocated 13/12/9/7
  with each sprint's points matching its capacity, 23 older zero-point tasks still in Backlog, and
  the 414 task instances and 26 worklog entries untouched. Task linking stamps `updated_at` because
  the route's own unlink does (app/api/sprints/[id]/route.ts:374).
- **Tests.** `tests/unit/it-technician-sprints-import.test.ts` (15 guards): the four windows tile
  3 Nov – 31 Dec with no gap or overlap, exactly one active sprint, statuses read from the route's
  own `SPRINT_STATUSES` and the retro CHECK list parsed from `scripts/create-retro-tables.mjs`,
  unique sprint names, every retro dated on its sprint's end day, the allocation covering seqs
  1–41 exactly once, derived capacities 32/29/35/27 totalling 123, theme placement spot checks, and
  the script's rails (backup before write, one transaction, title-scoped owner updates, no
  hardcoded sprint ids, zero-task predicate on the legacy close, no DELETE outside `--restore`).

## 44. The work log picks your discipline and marks the day (2026-11-03)

Two asks from one dialog: the Work discipline field should arrive already chosen — "I chose IT
Technician at onboard" — and logging a task should be enough to put that day's row on the task
grid. Both are code now, and neither needed a production write.

- **The default rule (`lib/worklog/discipline-default.ts`, pure).** Last logged discipline → the
  discipline mapped from the member's job title → the onboarding preference. The middle rung is
  what fixes the real account: onboarding wrote *all 75* disciplines into
  `preferences.settings.workDisciplines` before the mapper existed, so "fall back to onboarding"
  resolved to `executive` for an IT Technician. A saved list is trusted as a default only when it
  holds exactly one entry, so a job title is ranked above it; `lib/job-titles.ts` is the same map
  onboarding uses.
- **One reader (`lib/worklog/member-discipline.ts`).** The last-logged discipline is the newest
  non-null `work_log_entries.discipline` for this member, read with
  `workedOn desc, id desc … limit 1`. A failed read logs and degrades to the job title instead of
  showing an empty picker.
- **Delivered to the page.** `GET /api/worklog/entries` returns `defaultDiscipline`; the client
  holds it in state and seeds both dialogs with it (entry draft and deliverable draft), and
  `DisciplinePicker` derives its group from the pre-filled value, so the field opens on
  "Software, IT & digital → Technical Support" rather than "All groups".
- **Filled on the server as well.** `readEntryCreate(input, defaultDiscipline)` answers a body
  that never sent the `discipline` key — the quick-add line and any script posting a bare row. A
  key sent as `null` or `""` still means "leave it unclassified", so a member's explicit choice
  can never be overwritten by a default.
- **The day is materialised (`lib/worklog/instance-capture.ts`).** Logging marks that task+day
  instance `done` with `completedAt`/`completedBy` via `onConflictDoUpdate` on the
  `idx_task_instances_task_date` key; un-logging reverts it to `todo` only when no log row covers
  the pair any more. It never writes `notes` or `checklist_responses`, never reverts a status
  other than `done` (so a deliberate `skipped` survives), never deletes an instance, and never
  materialises a day for a `one-off` task, which has no grid.
- **Wired wherever the log changes.** POST creates; PUT releases the day it leaves then marks the
  day it arrives; DELETE releases; bulk delete / set-task / re-date read the selection's pairs
  before the write, then release and mark. Every one runs inside the transaction that writes the
  log row, so the grid and the log are never observable disagreeing. The register and playbook
  writers need no wiring: those rows carry no `taskId`, and a log with no task materialises
  nothing.
- **Tests.** `tests/unit/worklog-member-discipline.test.ts` (14) and
  `tests/unit/worklog-instance-capture.test.ts` (12) cover the three-rung ordering (including the
  all-75 list resolving to nothing), the ownership and recency predicates of the member read, the
  upsert key, the non-clobbering column list, the skip/one-off exclusions, and that no capture
  call reaches for the pool instead of its caller's `tx`.

## 45. Every discipline write speaks the registry's language (2026-11-03)

The second half of "check any other places not to have generalised": once the work log stops
guessing, nothing else gets to either. Three private vocabularies were still living beside the
75-entry registry, each with its own idea of what a discipline is.

- **The planner's retired nine (`lib/roles.ts`).** `plan_items.discipline` predates the registry
  and could hold `civil`, `structural` or `other` — strings no other screen reads, which promote
  then copied into `tasks.discipline`. `LEGACY_DISCIPLINE_NAMES` maps each retired name onto the
  id that covers the same work (`structural`/`geotechnical` → `civil_engineering`, `planning` →
  `program`, `management` → `manager`) and sends `other` to `null`: a row nobody classified does
  not become a discipline nobody chose. `readLegacyDiscipline` is one seam — exact registry id
  first, then the retired name, then `null`, never a guess. It now backs the item insert, the
  item patch (where an explicit value also clears), the extractor's answer, promote for both
  tasks and deliverables, and the handover's playbook-step tasks.
- **The editor shows the registry.** `/dashboard/planner/[id]` offered those nine names; it now
  offers all 75 in ten `SelectGroup`s, with "Unclassified" first, and the extraction prompt names
  `WORK_DISCIPLINES` so the model can only answer with an id the app already knows.
- **One default rule for created tasks (`readDisciplineField`).** `/api/tasks` POST used to store
  whatever the body sent, and `/dashboard/tasks` has no discipline control at all — so every task
  made there was unclassified. It now sends the assignee's own member default (last logged → job
  title → onboarding) when the task is self-assigned and `null` for a colleague's, because
  stamping the creator's discipline on someone else's work is the same generalisation in a
  different shirt. `DEFAULT_DISCIPLINE = "coordinator"` — the constant every silent path fell back
  to — is gone, and no write path imports it any more.
- **Rulings.** Planner promote does not invent a discipline for an unclassified item (a plan
  spans disciplines). Handover outstanding-register rows stay `null` for the same reason: the
  pack owns the register, not the discipline. Playbook steps inherit their playbook's.
- **Tests.** `tests/unit/planner-discipline.test.ts` (13) checks the translation table itself
  (exactly nine keys, only `other` without a successor, no live id shadowed) and source-guards the
  writers: the raw `body.discipline.slice` copy is gone, promote cannot write
  `discipline: item.discipline`, the editor cannot restore its local list, the prompt cannot
  recite the retired nine, the handover stamps its playbook's discipline, and no task or entry
  create path references `DEFAULT_DISCIPLINE`.

## 46. One list decides when a task is finished (2026-11-03)

`tasks.status` is a free `varchar(50)` with no whitelist, so a finished row arrives wearing
whatever word the writer used: the board sends `done`, the seeds and the IT Technician import send
`completed`, and a migration can send `closed`. The reports bucket already accepted all three; the
career meter matched the literal `"done"` in two places. The owner's account is the cost of that
drift — the imported tasks say `completed`, so `tasks_completed_90` and `points_completed_90` were
structurally zero no matter how much work was logged.

- **One home for the vocabulary (`lib/tasks/statuses.ts`, pure).** `COMPLETED_TASK_STATUSES = ["done",
  "completed", "closed"]` and `isCompletedTaskStatus(value)`, which trims and lowercases first because
  the column is free text. The module header names its consumers — the report bucket and both career
  readers — so anything that has to agree about completion reads the same list and cannot disagree.
- **Reports keeps its behaviour, loses its constant.** `COMPLETED_STATUSES` in
  `lib/reports/aggregate.ts` is deleted; `statusBucket` now calls `isCompletedTaskStatus`, so the
  mapping onto the bucket name `completed` is unchanged and the list simply moved.
- **Career counts stop hardcoding.** `lib/career/counts.ts` wraps the completion `EXISTS` in
  `inArray(taskEvents.toStatus, COMPLETED_TASK_STATUSES)`. `lib/career/evidence.ts` does the same for
  its Drizzle branch, and for the raw SQL drill-down subquery it expands the list with `sql.join`, so
  the literal `e.to_status in ('done')` is gone too.
- **What this does not do.** Completion is event-sourced, and production `task_events` is empty for
  these rows — the create, kanban, bulk-delete, agent-handover and import paths write no events. So
  the two career signals stay at zero until that capture exists. Nothing here invents history: no
  backfilled dates, and no synthetic events for the older `completed` tasks.
- **Tests.** `tests/unit/task-statuses.test.ts` (5) pins the list's contents, checks the helper
  tolerates case and padding and rejects `todo`/`in_progress`/`review`/`blocked`/empty/null, then
  source-guards the three consumers: each must import `@/lib/tasks/statuses`, and neither career file
  may still contain a `toStatus, "done"` or `to_status = 'done'` literal.
  `tests/unit/career-routes.test.ts` is re-pointed at the new `inArray` shape, and the report tests needed no
  change: nothing outside `lib/tasks/statuses.ts` references the old constant any more.

## 47. The owner is placed on the ladder (2026-11-03)

Two rows on production, one script, no invented history. `/dashboard/career` showed "No placement yet" for
`fakiiahmad001@gmail.com` because nothing had ever written `career_placement`, and `/admin/career` 403-ed
because that account's `users.role` was `user` — `organizations.owner_id = 1` says who owns the org, and
nothing in the app reads it for authority.

- **`scripts/place-ladder-owner.mjs`** writes exactly two things: `users.role` → `superadmin` for the owner
  account, and one `career_placement` row (technician, rung 1, `placed_by` the same member). It targets the
  account by email, refuses to run without an explicit `--dry-run`/`--apply`/`--restore`, and confirms the
  active rung exists before writing. Dry run first, then apply: `1 user update(s), 1 placement insert(s)`.
- **Backup before write.** `--apply` writes `backups/ladder-owner-<stamp>.json` (the account's prior role,
  the placement state before it, and the intent) and only then touches the database. Roll back with
  `node scripts/place-ladder-owner.mjs --restore backups/ladder-owner-<stamp>.json`; `backups/` is gitignored,
  so the file holding the owner's email stays local.
- **Rung 1, because the evidence says so.** The ladder itself was already seeded (48 active rungs), and day one
  is an admin placing staff at their real level. In the last 90 days this account has 26 log entries across 26
  distinct days; the task-derived signals are still zero because no status events were ever captured for the
  imported tasks. Junior Technician is the honest rung for that record, and the `note` on the placement row
  states exactly which evidence counted and which did not.
- **Read back after writing:** `role=superadmin placement=1 title=Junior Technician`. A second `--dry-run`
  confirms it from the other direction — `0 user update(s), 0 placement insert(s)`.
- **Tests.** `tests/unit/ladder-owner-placement.test.ts` (9) guards the script's rails without touching the
  database: the conflict target matches the `career_placement` primary key, the backup is written before the
  first `update`, every `delete` stays inside `--restore` and only removes a placement the script inserted, the
  flags are mandatory, `task_events`/`work_log_entries`/`deliverables` appear nowhere in the code (comments
  stripped), and the URL the script prints goes through its own masking pattern — which the test applies to a
  fake credential to prove it still holds.

## 48. A task that arrives finished records its own birth (2026-11-03)

Completion is event-sourced: `tasks` has no finished-on column, so the career counts, the evidence reader and
the reports all ask `task_events`. Capture watched every *move* — and a row inserted already finished never
moves. That is the gap behind the zeros, and it is why the fix is a birth row at the write instant rather
than a date borrowed from `created_at` or `updated_at`.

- **The rule.** `bornFinishedChanges()` in `lib/worklog/task-events.ts` turns created rows into events, but
  only the finished ones: `from_status = BIRTH_FROM_STATUS` (`"none"`, the sentinel the planner promote route
  already wrote), `to_status` = the word the row arrived with, `at` = the instant of the write. An unfinished
  arrival writes nothing, because creation genuinely is `tasks.created_at`. `statusChanges()` keeps refusing
  a creation, so the two rules stay one job each.
- **The writer.** `captureTaskBirths()` in `lib/worklog/capture.ts` sits beside `captureStatusChanges()` and
  shares its insert-or-log path — same `[task_events] capture failed` line, now with a `kind` of `birth` or
  `transition`, and the same rule that a capture failure never fails the user's save.
- **Wired into every path that can land a finished row**: `POST /api/tasks`, `POST /api/test/tasks`,
  `POST /api/dashboard/tasks`, `POST /api/dashboard/kanban/tasks` (a card created in the Done column) and the
  document-import commit in `lib/ops/import/commit.ts`, which now reads its insert back with `.returning()` so
  the birth row describes the status actually stored rather than the one the extractor guessed.
- **Deliberately not wired.** The seeds, `lib/onboarding/write.ts` sample rows and the one-off
  `scripts/import-it-technician-*.mjs` migrations write no events. The sample titles are invented ("MCS Server
  offline", "Wi-Fi down on 2nd floor"), so a birth row for one would put fiction on a real person's ladder —
  and the migration scripts already record their own rows in a transaction with an explicit status.
- **What still reads zero, honestly.** Production holds 8 finished rows for the owner account: 4 the member
  moved today (each with its event, from `route`) and 4 born as `completed` from the onboarding sample seed.
  Those 4 stay uncounted — they are not the owner's work — and the pre-existing rows from before this change
  get no backfilled dates. From here on, a task created finished is counted on the day it was created.
- **Tests.** 9 new behavioural cases in `tests/unit/worklog-capture.test.ts` (18 total) and a new block in
  `tests/unit/worklog-reports.test.ts` guarding that all five create paths call `captureTaskBirths`, that the
  birth sentinel never leaks into the transition rule, that the rule asks the shared completed list rather than
  one literal, and that no seed or sample file writes into `task_events` at all.

## 49. A recurring task keeps a horizon instead of running out (2026-11-04)

The recurrence system pre-materialises a grid of `task_instances` rows when a template is created — 30 days for
daily, 12 for weekly — and nothing extended it. There was no cron in `vercel.json` (one hourly schedule
arrived on 2026-11-11, §59, and it does not touch `task_instances` — the horizon is still maintained on read).
So the day after the owner closed today's instance, the panel showed the tail of next month (the list sorted
descending and cut ten rows), today was nowhere to complete, and a template nobody opened for a month handed
out dates in the past.

- **The window, not the grid.** `planInstanceWindow(instances, todayIso)` in `lib/tasks/instance-window.ts` is a
  pure selector returning `{ today, upcoming, missedDates, missedCount }`: rows from today forward, ascending,
  capped at `HORIZON_OCCURRENCES` (7), and every earlier row that is neither done nor skipped collapsed into a
  "Missed N days" line. Missed days get no Complete button — nobody can close last Tuesday, and offering one
  would invite a fabricated record.
- **The horizon is anchored on the member's local day.** `horizonDates(cadence, latestIso, todayIso, n)` steps
  once past the grid's last date, walks forward to today, and never returns a date before it.
  `ensureInstanceHorizon()` counts the rows it already holds from today onward and only writes the shortfall, so
  topping up a 30-row daily grid writes nothing. `generateNextInstance()` now means "the earliest open row from
  today forward, creating rows if the grid ran out" instead of chaining off the stale tail.
- **No new scheduler, no schema change.** The top-up happens where the grid is already being read and written:
  `GET /api/task-instances?taskId=` (for the assignee only — a viewer must not write into someone else's
  schedule) and the instance PATCH. Days nobody worked stay absent, which is exactly what the missed line says.
- **A cadence set later gets a grid.** `materialiseGridOnCadenceChange()` fires on a `one-off → recurring` PATCH
  only; an already-recurring template's rows, and any work recorded on them, are left alone. All four task write
  doors call it, and `pickTaskUpdates` now moves `is_template` with `cadence` — the calendar filters on that
  flag, so a stale one hid the schedule.
- **A template cannot be marked Done.** `recurringStatusError(current, patch)` returns
  "recurring tasks stay open — complete today's instance instead" and every writer answers 409. It reads
  `patch.cadence` too, because a body that sets status and cadence together is the same contradiction in one
  request. The boards hide the finished words on recurring cards rather than letting a drag fail.
- **Quarterly existed everywhere except the vocabulary.** The planner's enum and `lib/seed/tasks.ts` both emit
  `quarterly`; `CADENCES` did not carry it, so `computeInstanceDates` returned no grid. It now steps three
  months at a time, 8 occurrences.
- **The days count as career evidence.** A tenth signal, `instance_days_completed_90` ("Recurring days
  completed"), counts distinct closed instance dates for tasks assigned to the member. `tasks_completed_90`
  counts distinct *tasks*, so thirty closed days of one checklist credited 1 — and instance writes never reach
  `task_events`, which is the other reason this is a count rather than an event. Its ladder target is 0 on every
  rung: a zero target reads as "no bar set", so publishing the signal cannot move anyone's readiness number
  until the owner sets real rungs. `lib/career/evidence.ts` evidences it one row per closed day, so the number
  on the meter stays openable.
- **Tests.** `tests/unit/task-instance-window.test.ts` (9), `horizonDates` cases in
  `tests/unit/task-recurrence.test.ts`, 10 cases in `tests/unit/task-updates.test.ts` for the recurring-status
  rule and the `is_template` derivation, and `tests/unit/recurrence-gap-guards.test.ts` (36) holding the wiring:
  all four writers refuse with 409 and materialise the grid, the horizon writer never uses the old step-from-tail
  function, the read route checks the assignee, the panel uses the selector and never maps missed dates into rows,
  and every registered signal is both counted and evidenced.

## 50. Every surface reads recurrence the same way (2026-11-04)

The F1–F6 wave fixed the recurrence engine and left its neighbours alone. An audit of every page and route
that reads `tasks`, `task_instances` or `plan_items` found seven classes of gap, all of them the same mistake
in different files: a surface written before the model existed, still reading the old shape. On the owner's
account, that meant schedules drawing calendar markers they were never dated for, a workload bar counting a
checklist that is unfinished by design, a promoted plan item arriving as a one-off with no grid, and — on
2 of 63 task rows — work the report bucket (§46) could see and the chart datasets, sprint tiles and KPI
counters could not, because those read the literal `'done'` and the imported rows say `completed`.

- **The calendar scopes and stops inventing.** Both recurrence branches of `/api/calendar/events` now filter
  on the visible members, and the template branch is gone: `due` returns one-offs whose `dueDate` falls in the
  window, `cadence` returns `task_instances` rows, `both` returns the union. The two predicates are complements
  on `is_template`, so a task cannot appear twice — the double count is impossible by construction, not
  deduped after the fact.
- **The grid you look at is the grid you get.** `horizonOccurrencesForWindow(cadence, start, end)` converts the
  requested window into an occurrence count (42 days of a daily schedule is 43 rows, not the 7 the panel
  keeps), and the calendar read tops up each schedule it is about to draw through the writer that already
  existed. Bounded by 90 occurrences per task and 25 tasks per request, and the coverage early-return means the
  steady-state path issues one `count()` and no inserts. A read that writes never fails the read.
- **One cadence vocabulary.** `lib/cadence.ts` is the only place the words live: `SCHEDULE_CADENCES` for the
  recurring subset, `cadenceOrNone(value)` for reading a column that a seed or an import may have left `null`,
  and `isCadence` for validation. The planner's item schema, the plan-item PATCH and the plan editor all
  consume it, so `quarterly` and `yearly` cannot be valid in one door and silently dropped in another.
- **Promote carries the cadence.** `promoteTaskValues(item, sessionUserId)` is a pure mapping — cadence,
  `is_template` derived from it, the assignee — and the grid is materialised *after* the transaction commits,
  not inside it. Before, a plan item titled "weekly drive check" became a one-off task with no occurrences and
  no way to notice.
- **Schedules are counted out of workload.** The report dataset, both team-directory aggregates and the five
  dashboard reads add `is_template = false`: a recurring template is open forever by design, so leaving it in
  inflated every department bar by the number of checklists the owner imported.
- **The day's occurrences, on the dashboard.** `getDashboardOverview` takes the member's timezone and anchors on
  `localDay(new Date(), session.timezone)`, and the Today strip now lists the occurrences due today — up to 8,
  priority-ordered, each with a checkbox that closes that instance and a "Missed N days" line, in the same
  wording the recurrence panel uses.
- **The finish doors are guarded everywhere.** A recurring row no longer offers Done on the dashboard, the tasks
  page's two quick-complete doors, or the AI Scrum Master's card, so the server's 409 stays the backstop instead
  of the member's first notice. The status dropdown filters the finished words out for a schedule.
- **One list decides when a task is finished, on both sides of the wire.** `lib/tasks/statuses-sql.ts` renders
  `COMPLETED_TASK_STATUSES` as SQL — `completedStatusSql(column)` and `openStatusSql(column)` for drizzle reads,
  `completedStatusListSql()` for the raw statements that already aliased the table — and the twelve client pages
  read the JS helper for the same list. The sweep covers 12 server files and 12 pages, including the five
  surfaces nobody had audited (the team directory, automation's candidate query, and both ethical-metrics
  reads). Sprint aggregates deliberately keep counting templates: placing a recurring task in a sprint is the
  owner's choice, and hiding it would mask the mistake.
- **Measured, not assumed.** `scripts/measure-task-statuses.mjs` is a read-only census of the words production
  actually holds, run before the merge: 33 → 35 finished rows, so the tiles that move are named in advance.
- **Tests.** `tests/unit/task-recurrence.test.ts` (the `horizonOccurrencesForWindow` cases), `cadence.test.ts`
  (`cadenceOrNone` round-trips), `planner-promote-values.test.ts`, `statuses-sql.test.ts` (the fragments bind
  every word in the list, so a fourth word arrives automatically) and
  `tests/unit/recurrence-cross-surface-guards.test.ts` — one guard file per wave, holding the calendar scoping,
  the deleted template branch, the cadence vocabulary, the grid-after-transaction order, the template predicate
  on every count surface, the status-menu doors, and a per-file assertion that no swept file still compares a
  `tasks.status` to `"done"`.

## 51. The kanban draws the day, and the office closes at the weekend (2026-11-04)

§50 made every surface read recurrence the same way. Two things the owner then saw on the board were left
over: a daily schedule sat in one column forever because a template's own status never changes, and the grids
already written held Saturday and Sunday rows for work nobody does.

> "task with daily should appear on to do everyday and can be marked done once so everyday should show on
> kanban to do only and since we aint coming to job on weekend can be left need to find work around for that"

- **A production reconcile, with the numbers measured first.** `is_template = (cadence <> 'one-off')` is
  derived, but the 2026-11-03 IT-technician import had written 24 rows carrying a cadence with
  `is_template = false` — schedules the engine never grew a grid for, so nothing anywhere could finish them.
  `scripts/reconcile-recurring-tasks.mjs` restores the derivation and settles the weekend rows. Applied under a
  per-action owner approval with the backup written *before* the transaction
  (`backups/reconcile-recurring-2026-11-04T18-07-31`); after-counts **0** violating rows · **32** schedules ·
  **0** schedules at a finished word · **0** weekend rows left as `todo`. Eight of the 32 overlap the seeded
  templates in subject matter with zero exact title collisions; pruning them is a separate decision, not a
  reconcile.
- **No grid is written for a weekend.** `workingDayOnOrAfter()` in `lib/tasks/recurrence.ts` rolls a Saturday or
  Sunday forward to the Monday, and every door that emits an occurrence date routes through it —
  `computeInstanceDates` (a schedule created on a Saturday starts on the Monday), `nextInstanceDate` and
  `horizonDates`. Nothing is dropped and nothing is pulled earlier; `daily` simply steps Friday → Monday.
  `computeNextRun` is deliberately untouched, because it also drives `report_schedules.next_run_at` and rolling
  it would shift live schedules that predate the rule.
- **The rolled day becomes the next anchor, and that drifts — accepted and recorded.** A grid stores only the
  day it wrote, so the original date is not recoverable: a weekly anchor settles on the Monday it moved to and
  a monthly date can shift a day. This is the same one-way behaviour `computeNextRun` already has for a 31st
  (Jan 31 → Mar 3); holding the true anchor needs a column the schema does not have. Four alternatives were
  worked through and rejected — see §I2 of the cross-surface spec.
- **The board draws the day's occurrence, not the schedule.** `GET /api/tasks` attaches
  `dayInstance: { id, status } | null` to every row; `null` means "not due on the day being drawn", which
  is a real answer for a weekly read on the wrong day. `lib/tasks/day-occurrence.ts` tops a grid up when
  that day's row is missing, under the same three bounds the calendar read uses — only schedules this
  member may write for, at most 25 per request, at most `HORIZON_OCCURRENCES` rows each, serial and
  swallowed on failure. A failed top-up still returns the rows the first read found, and the member list
  is only loaded when the page holds a schedule. (Written as `todayInstance` against today; §56 widened
  the same read to any requested day and renamed the field, because the top-up must stay anchored on the
  member's real today while the drawn day moves.)
- **One drawn status, everywhere on the page.** `boardStatus(t)` is the column a card draws in, or `null` when
  it draws none, and the columns, the swimlanes, My cards, the overdue flag, "open here" and "done total" all
  read through it — so a template's forever-`in_progress` status never leaks onto a card, and a `skipped` day
  is nobody's outstanding work. The To do column names what it is holding back ("N schedules not due on this
  day") so a hidden card does not read as a lost one.
- **Moving a card moves the day.** `moveTask` PATCHes `/api/task-instances/:id` when the card has an
  occurrence — the route that already enforces assignee ownership and stamps `completed_at` — and offers only
  the three states an occurrence row can hold, because `task_instances` has no `review` and no `blocked`. A drag
  into either is refused with a reload rather than a silent no-op, and a template still gets §49's refusal on
  the finished words. That is what makes a daily land back in To do tomorrow: the row that moved is dated
  today, the schedule itself never changes, and tomorrow's row is already in the grid.
- **Tests.** `tests/unit/task-recurrence.test.ts` (36 — the rolled dates, a stale grid walking up to today
  without inventing the missed days, and "never returns a weekend date, whatever the cadence") and
  `tests/unit/board-today-occurrence.test.ts` (14 guards — the drawn-status wiring, the instance door and its
  refusals, the reader's three bounds, the weekend rule on all three date doors, `lib/cadence.ts` staying free
  of it, and the reconcile script settling only untouched rows from a backup taken first).

## 52. A timestamp column takes a Date, and a failed write says why (2026-11-04)

Marking a daily occurrence Done on the kanban answered **"Move failed — Failed to update instance"**. The write
never reached the database, and it had not reached it since the instance API was born in `d1fe76c` (2026-11-02):
§51's claim that the move "stamps `completed_at`" was true of the intent and false of the effect.

- **The defect.** `task_instances.completed_at` is a Drizzle `timestamp` in the default *date* mode, whose
  `mapToDriverValue` is `value.toISOString()`. The route handed it `new Date().toISOString()` — already a string —
  so the builder threw `TypeError: value.toISOString is not a function`. Only the `done` transition sets
  `completed_at`, which is why moving a card to In progress worked and Done never did.
- **Why tsc missed it.** The patch bag was declared `Record<string, unknown>`, which is assignable to a
  `Partial<Pick<…>>` of all-optional properties and erases every column type on the way in. The bag is now typed
  off the writer (`Parameters<typeof updateTaskInstance>[1]`), so the same mistake stops compiling.
- **Why nobody could diagnose it.** `updateTaskInstance` wrapped the write in a `catch` that logged and returned
  `null`, and the route turned `null` into a bare 500 naming nothing. It has exactly one caller, whose own catch
  already reports `error.message` — so the swallow bought no robustness and cost two days. A failed write now
  propagates; `null` means only "no row matched".
- **The same bug, found by the sweep.** `app/api/task-reports/[id]/route.ts` stamped `updated_at` with
  `new Date().toISOString()` into the same untyped bag, so *every* edit to a generated task report — saving
  sections or promoting draft to final — 500'd. Fixed the same way, with the bag typed
  `Partial<typeof taskReports.$inferInsert>`. Every other untyped patch bag in `app/api` and `lib` was checked
  against the columns it writes; the rest set Dates, or write `date` columns, which are string mode and correctly
  take `toISOString().slice(0, 10)`.
- **Tests.** `tests/unit/timestamp-column-writes.test.ts` (9 — both columns build from a Date and throw on an
  ISO string, both routes stamp a Date off a typed bag, a repo-wide sweep of `app/api` and `lib` finds no patch
  bag stringifying into an `*At`/`*Time` field, and the writer has no `catch`). Gates: `tsc --noEmit` clean,
  176 files / 2916 tests, lint at the documented 82-problem / 4-error baseline.

## 53. The board can create a schedule, and a create cannot lie about its status (2026-11-05)

The board's "+ New card" modal had no Cadence field, so a daily stand-up or a monthly check had to be created on
the tasks page first. Adding it surfaced a rule the two dialogs disagreed about.

- **What the report was, and what it wasn't.** "A card made on the kanban always shows as To do on the tasks page"
  does not reproduce for a one-off: `tasks.status` is written straight from the request and read straight back, and
  production confirms it — #134 `done`, #135 `done`, #136 `blocked`, all created that day, and not one `todo` row in
  the table. Two real mechanisms produce the symptom instead, and both are about schedules:
  the header button opens the modal with `status = "todo"` no matter which column you are looking at, and for a
  cadence the board draws `dayInstance.status`, never the template's — while `generateInitialInstances` births
  every occurrence as `todo`. A schedule therefore *never* shows the status it was created with, on the board.
- **The defect that would have shipped.** `recurringStatusError` (lib/task-updates.ts:182) refuses a finished status
  on a template, and PUT `/api/tasks/[id]` enforced it with a 409 — POST `/api/tasks` did not. The moment the board
  could pick a cadence, a "Daily + Done" create would have stored a template the board draws in To do and the tasks
  page draws in Done: one card, two columns. POST now runs the same rule and answers the same 409, so both create
  doors refuse what both edit doors refuse.
- **One vocabulary for what a form may offer.** Both dialogs were filtering the finished words out inline, twice, in
  slightly different words. `creatableStatusesFor(cadence, vocabulary)` and `statusAfterCadenceChange(cadence,
  current, vocabulary)` in [lib/tasks/statuses.ts](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/lib/tasks/statuses.ts)
  are now the only place that decides. The vocabulary is a parameter, not an import, so the rule stays free of the
  client component that owns the five board words. A cadence change that would strand the pick — Daily while Done is
  selected — moves the selection to the first state a template can hold, instead of letting the member meet the 409
  after pressing save.
- **The modal.** Cadence and the checklist editor are mirrored from the tasks dialog in full, and the Status field
  now says what it is: the pick that decides where the card lands, not the column you happened to press the button
  in. Selecting a schedule drops the finished words from Status; selecting Done drops them back.
- **Left alone on purpose.** Past open occurrences stay read-only — "a day is owed, not redone here, the work log
  records it" is a standing ruling, and logging yesterday's work happens in the work log, not by ticking a stale
  occurrence.
- **Tests.** `tests/unit/task-create-status.test.ts` (12 source guards — POST reads the rule rather than restating
  it, neither page filters inline any more, both create dialogs source their Status list from the shared helper, and
  the board draft carries cadence and checklist from open through payload). Gates: `tsc --noEmit` clean,
  177 files / 2935 tests, lint at the documented 82-problem / 4-error baseline.

## 54. A dropdown says what it holds, and the filter bar holds one row (2026-11-05)

The tasks page got a sort control and "Recently updated" landed on a second row on desktop. The new
control was not the cause: the row was already 1342px wide before it, and the workspace's content
column is the window minus a 250px sidebar.

- **The arithmetic.** Eight controls with widths guessed in 2025 — scope group ~150, search `min-w-40`,
  status `w-36`, priority `w-32`, assignee `w-40`, sprint `w-40`, cadence `w-36`, sort `w-36` — plus seven
  `gap-2`s, the card's `px-6` and the page's `p-6`. Nothing in that list is the width of its own text:
  "All sprints" does not need 160px, and "Recently updated" needs 158 in a 144px field, which is why the
  one control read every day was the first thing pushed off the line.
- **The contract.** `FILTER_BAR` (`gap-1.5`), `FILTER_TRIGGER` (`h-8 w-auto max-w-[13rem] shrink-0
  text-xs`) and `FILTER_SEARCH` (`relative min-w-0 flex-1 basis-40`) in
  [components/dashboard-kit.tsx](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/dashboard-kit.tsx)
  are now the only widths a filter bar uses: every control is exactly as wide as the text it holds and
  never stretches, and the search field — not a filter — is what absorbs the slack or gives it up. The
  row budget drops to ~743px before the search field, so the bar holds one line from a 1280px window up
  and wraps only below that, instead of clipping what does not fit.
- **The same text, cut off inside the list.** `SelectContent` was pinned to *exactly* the trigger width
  (`w-[var(--radix-select-trigger-width)]`) with every option `truncate`d — a deliberate rule from the
  onboarding-grid wave that made "Recently updat…" and "Sprint 7 – Infras…" correct behaviour. The menu
  now hugs its longest option (`w-max`), keeps the floor it had (`min-w-[max(8rem,var(--radix-select-trigger-width))]`)
  and is capped by the screen (`max-w-[min(30rem,calc(100vw-3rem))]`); `truncate` survives as the
  last resort past the cap, not the default. Sitting below the field and never flipping is unchanged, so
  the fix reaches every dropdown in the app — dialogs, forms, settings — without touching their call
  sites. The trigger got `whitespace-nowrap`, `gap-1.5` and `[&_svg]:shrink-0`, so a long value truncates
  in place rather than pushing the chevron out or wrapping to a second line.
- **Swept, not spot-patched.** All 36 fixed-width dropdowns in `app/dashboard` and every `gap-2 py-3` bar
  container now come from the three constants: the nine pages with a filter bar (dashboard, tasks,
  kanban, backlog, sprints, calendar, analytics, activity, team) plus the worklog bulk bar, the
  achievements people filter and the tasks bulk/page-size selects. `billing`'s per-invoice status
  dropdown is left at `h-7 w-28`: it sits in a table cell, sizes to its column, and its longest word
  ("refunded") already fits — the guard says so in its own comment rather than pretending the rule is
  universal.
- **Tests.** `tests/unit/filter-bar-layout.test.ts` (6 — the three constants carry their classes, the
  sort control is inside the bar and not beside it, a sweep of every `app/dashboard` page finds no bar
  dropdown with a hand-guessed width, and no bar still uses the old `gap-2 py-3` row).
  `tests/unit/select-geometry.test.ts` re-cut from 5 to 8: it used to assert the menu is *exactly* the
  trigger width and that a long option truncates rather than widening the list — the two rules this wave
  reversed — and now asserts the floor, the hug, the cap, one-line text in both the menu and the closed
  field, and that no `w-[var(--radix-select-trigger-width)]` or `line-clamp` comes back.
  Gates: `tsc --noEmit` clean, 178 files / 2944 tests, lint at the documented 82-problem / 4-error
  baseline. Layout itself is for the owner to confirm in the browser: the tasks bar on one row at
  desktop, and a sprint or assignee dropdown wide enough to read.

---

## 55. A newly created sprint is visible, deletable, and the board tells the truth about four of them (2026-11-10)

The owner added a sprint on `/dashboard/sprints` and could not see it. That one symptom opened onto four
sprint bugs, each the same shape: **a surface asked a shared question and answered it with a private
rule.** The rules now live in `lib/sprints/`, where every surface reads the same one.

- **The picker asked "which sprints am I inside?"** `/api/sprints?scope=mine` means *sprints this member
  holds an assigned task in* — right for a personal list, a trap for a dropdown: a sprint with no tasks
  is by definition invisible there, so a card saved into a fresh sprint rendered with **no sprint label
  at all**. All five pickers (kanban, tasks, calendar, backlog, `/dashboard`) now fetch
  `/api/sprints?scope=all`. The board's own *My board / Workspace* toggle is untouched — it decides which
  **tasks** are drawn — and `tests/unit/sprint-picker-scope.test.ts` (5) sweeps every page under
  `app/dashboard`, so the next dropdown that grows cannot repeat the mistake. The sprint board itself is
  the one exempt page: its toggle is the point, and it is guarded on opening in Workspace instead.
- **Sprints could not be deleted.** `tasks.sprint_id` and `task_schedules.sprint_id` are `ON DELETE SET
  NULL` and `retros.sprint_id` is `ON DELETE CASCADE`, but the route's pre-check counted only
  `taskStatusEvents`, so a sprint full of tasks was promised as deletable and then died on a foreign key.
  The count query returns all four dependents now, the message says *unlink* rather than *remove* because
  the tasks survive, and the whole sequence runs in `db.transaction()` — a partial delete used to leave a
  sprint half-dissociated from its own history. Same sweep, same page: `/dashboard/sprints` was opening on
  `scope=mine`, i.e. the page whose job is creating sprints opened on the one scope that cannot show what
  it just made, so its default flipped, and its empty state no longer says "create your first sprint" when
  the workspace has sprints the viewer is simply outside.
- **One of four running sprints was called *the* active sprint.** This workspace runs four `active`
  sprints at once and three surfaces each quietly picked the first one it saw: the kanban header and
  capacity panel, `/dashboard`'s sprint strip, and the sprint pre-filled into a new task dialog. Naming
  one of four is not a filter and not a summary — it is a wrong statement about the workspace.
  `lib/sprints/active.ts` owns the answer now: `activeSprints()` returns the set,
  `summarizeActiveSprints()` adds points, capacity and progress across it and reports `nextEnds` (the
  deadline that binds is the one that closes **first**), `capacityPct()` / `progressPct()` are one rule
  instead of three copies, and `defaultSprintId()` refuses to guess — a drafted card pre-fills a sprint
  only when exactly one is running. The kanban header reads `4 active sprints · next closes …`; the
  capacity panel meters the sprint you filtered to, otherwise the summed load with a row per sprint;
  `/dashboard` shows a card per running sprint under a workspace total. Capacity stays advisory (the bar
  goes red past it, nothing is blocked), and completion is a state rather than a percentage: a
  100%-done or over-capacity sprint still reports its own numbers.
- **`sprints.completed` was a column only its own PUT ever wrote.** Close a task and `donePoints`
  (aggregated live from the task rows) moves while `completed` does not, so `/dashboard` and the sprint
  page quoted different capacity numbers about the same sprint. `lib/sprints/completed.ts` makes the rule
  explicit: a sprint with tasks reports the **live** tally, and the stored column is authoritative only
  for the task-less rows imported history has. Both sprint reads pass through `reportedCompleted()`; the
  PUT still maintains the column, so a future read can keep using it.
- **Tests.** `sprint-picker-scope.test.ts` (5), `sprint-active-view.test.ts` (17),
  `sprint-completed-live.test.ts` (5), `sprint-active-surface.test.ts` (7),
  `sprint-create-visibility.test.ts` (4), `sprint-delete-dependents.test.ts` (3), plus
  `dashboard-member-boards.test.ts` re-cut: it used to *require* the sprint list to ride the board scope —
  exactly the bug this wave fixed — so it now pins the task reads to the scope and the sprint read to the
  workspace. Gates: `tsc --noEmit` clean, 189 files / 2,960+ tests.
- **Deliberately not built:** the optional due-date range filter for `/dashboard/tasks`. The page already
  filters by sprint, status, priority, assignee, cadence and text, and the kanban day navigator (§56) is
  where past and future occurrences are actually read — so an eighth control on a bar that was just
  fought back onto one row (§54) would have cost more than it returned.

## 56. The board can be turned to another day, and tomorrow is a preview (2026-11-08)

§51 made the kanban draw the day's occurrence. It drew exactly one day — today, unasked — so the board
could not answer "did the backup run last Friday" or "what lands next week". The owner asked for both
directions, and then said to build them.

> "is it wise to have calendar and able to filter tasks according to the day to see past and future for
> kanban and tasks page filters" → "build for future and past"

- **Two days, and the whole design is keeping them apart.** `/api/tasks` takes `?date=` and
  `lib/tasks/board-day.ts` resolves it: junk, a timestamp, or 29 February in a common year falls back to
  the member's today rather than querying a day nobody asked for. The **drawn day** (`dayIso`) only ever
  appears in a SELECT. The **top-up anchor** (`topUpIso`) is the member's real today and is the only day a
  grid may grow from — `lib/tasks/day-occurrence.ts` (renamed from `today-occurrence.ts`, and
  `todayInstance` with it) reads the browsed day first and grows a horizon only from today, so paging
  into December cannot fabricate a month of occurrences. Looking *behind* today writes nothing at all: a
  forward-walking horizon cannot birth a past row, so a top-up there would be pure write traffic on a
  look back. `?date=` is dropped from the address on today and kept for any other day, so a reload or a
  shared link lands on the day it named.
- **The server, not the open tab, decides whether a day may be written.** Every response carries
  `day: { date, today, relation, readOnly }`. The page trusts that verdict for the day the server
  actually drew and falls back to the same pure rule while a new day is in flight, so a future day is
  never briefly draggable; a tab left open overnight, or a member in another timezone, cannot disagree
  with the board about which day is still ahead. Related trap: the page sends the **raw** URL value and
  lets the route resolve it — resolving it client-side first would make the query depend on the
  response, and the read would chase its own tail.
- **A day ahead is a preview, not a place to record work.** Marking next Friday's backup done should not
  be possible by paging forward, so those days refuse the drag at every door: no drag start, no drop
  target, no enabled status button, and `moveTask` returns before the optimistic write with a toast that
  names the day and offers today. The panel turns amber, carries a Lock · Preview badge and one line
  saying what is still editable — a card's *details* change the task itself, which is not this day's row.
  A day **behind** today stays fully actionable: a missed occurrence is owed work.
- **The navigator says which day is on screen.** Chevrons step a day, a `DateField` jumps anywhere, Today
  is disabled when already there, and the title (`boardDayTitle`) reads "Today · Sun 8 Nov" / "Tomorrow
  · Mon 9 Nov" / "Fri 13 Nov" / "Mon 4 Jan 2027" — assembled from `Intl` parts so a locale's punctuation
  cannot leak into the header, with the year only when it is not this one. The title is `aria-live`, and
  a spinner marks the swap, because a board that silently changed days is the defect this section is
  written against. "N schedules not due on this day" moved with it, so a hidden card never reads as lost.
- **Tests.** `tests/unit/board-day.test.ts` (11 — the fallbacks, a leap day in a leap year, past actionable,
  future read-only however far forward it pages, the parameter appearing only off today) and
  `tests/unit/board-day-navigation.test.ts` (17 — the read draws the asked-for day, "never lets the browsed
  day become the horizon anchor", nothing written behind today, the top-up stays bounded and inside the
  caller's writable members, a failed top-up still returns found rows, the URL round-trip, and the four
  doors a preview closes). `board-today-occurrence.test.ts` (14) still guards the reader's bounds and the
  drawn-status wiring.

## 57. The Done column is a window, not an archive (2026-11-10)

§51 dated the board's occurrence cards and left the one-off cards all-time, so the Done column grew
into a pile: every card ever finished, on every day the board draws. The owner named the symptom.

> "on the cards done displays many cards can we be able to filter and show cards done per day or which
> approach is best for this" → (asked whether To do / In progress / Review / Blocked need the same
> treatment) → Done-only window → "implement"

- **A finished one-off already said when it finished; nobody was asking.** `tasks` has no
  `completed_at`, but `task_events` carries a row per status change with its `at`. On production that is
  40 of the 42 finished one-offs; the 2 that have no event are imported seed rows, so `updated_at` covers
  them and no migration was needed. `lib/tasks/completed-on.ts` turns the latest event into a finished
  **day in the member's own timezone** (`lib/worklog/local-day.ts` again — a UTC day would put a 9pm
  finish on the wrong card of the wrong date), and `/api/tasks` returns it per row as `completedOn`.
  Timezone comes from the session and never from the query string: a day a caller can type is a day a
  caller can impersonate.
- **The filter is SQL, not a `.filter()` after the fact.** The pile was not only ugly, it was eating the
  read: the board asks for `pageSize=200` and finished one-offs were spending most of that budget on
  work from weeks ago. `lib/tasks/completed-on-read.ts` builds the predicate
  (`doneWindowSql`) and `getPaginatedTasks` puts it in the WHERE list before the query is built, so
  `pagination.total`, the rows and the page count all respect the window. `?doneWindow=day|week|all` is
  anchored on the day already on screen (`?date=`), so a board turned to a past Friday is a view *as of
  that Friday* — the upper bound (midnight after the drawn day, in the member's zone) is always present.
  The week is 7 days ending on that day, inclusive. A row the read cannot date at all stays visible:
  `coalesce(<inside>, true)`, because Postgres would otherwise drop an undatable finish out of every
  window, including "All".
- **Schedules are provably outside the window.** A schedule's card is drawn by its `dayInstance` for the
  day on screen (§51), and `completedOn` is set only for a finished **one-off** — a template that is
  `done` is a data error, not a day. So in the grouping rule a schedule takes the drawn day, and hiding
  history cannot hide an occurrence.
- **The board asks, and the address remembers.** The Done column header wears a Day · Week · All
  segment (`DoneWindowSegment` in `components/dashboard-kit.tsx`, on the bar's own `h-8` tier — it sits
  on a row of its own inside the column, so the control-height ladder sees one rung per row as before).
  The choice rides `?doneWindow=` exactly like `?date=` does — `boardPath` now builds both, so stepping
  a day cannot drop the window and vice versa — and, same rule as the day, the parameter is dropped when
  the page is already showing its default. The cards then group under small-caps day headers ("Today ·
  1", "Tue 4 Nov · 5") and everything the window left out collapses to one line, "31 done earlier — Show
  all", which flips the segment instead of holding an expand state of its own; it renders only when the
  payload's `window` is the one on screen, so an in-flight response cannot mislabel the count. Default
  is **Week**: on the owner's board that turned 42 cards into 9. The "done total" KPI reads the window
  it shows, so its phrase now names it ("done this week").
- **The tasks page wears the same control and starts wide.** It is a query tool — the point of it is to
  find the row, including the old one — so the default is **All** and the segment sits in the existing
  filter bar. Two decisions came from reading the page rather than from the design: the window rides
  only `loadVisible` (the KPI strip and every chart are counted from `loadRawTasks`, and narrowing the
  list must not silently narrow the numbers), and the page keeps its view state in local state — it has
  no URL round-trip for filter, sort, page or view mode today, so the window matches its neighbours
  instead of being the one thing that survives a reload. Changing it returns to page 1, because no
  existing effect does that for any other filter. Every finished row gains a "Done · Tue 4 Nov" line in
  all three views, and the showing line names the window it counted.
- **One thing to know:** a row whose finish is only inferable from `updated_at` can change day when it
  is edited later — the fallback is the best available answer, not a record. The 2 affected rows are
  imported history.
- **The first deploy emptied the whole board, and the bug was a type of param.** `doneWindowSql` bound
  `bounds.from` / `bounds.to` as `Date` objects inside ``sql`…` `` fragments. A `sql` fragment
  parameterizes by *value*, and postgres.js hands a bare `Date` to its string encoder: `TypeError: The
  "string" argument must be of type string or an instance of Buffer or ArrayBuffer` (`ERR_INVALID_ARG_TYPE`).
  It threw on the `select COUNT(*) from (…)` wrapper — the first query to run — and `getPaginatedTasks`'
  catch answered an empty page with HTTP 200, so `/api/tasks` said `success: true` with no rows and every
  column read "0 cards". Nothing on screen was wrong; the production log had the throw. The fix is the
  form this repo already uses at `lib/data-access.ts:444` (`now.toISOString()`): `windowEdges()` renders
  both bounds as ISO strings, which Postgres infers as `timestamptz` from the comparison. Verified
  against production read-only: `all` 76 rows / 0 earlier, `week` 61 / 15, `day` 35 / 41, and the open
  counts (30 in progress, 3 review, 1 todo) identical in all three — the window still cannot touch
  outstanding work. The guard that missed it rendered the fragment and asserted the `Date` was bound
  (`params.filter(p => p instanceof Date)`), which pinned the bug; `done-window-read.test.ts` now asserts
  the opposite — no parameter may be a `Date` — because *renders* is not the same claim as *serializes*.
- **The empty page is gone, so the next failure will be seen.** `getPaginatedTasks`' `catch` no longer
  returns `{tasks: [], total: 0}`; it logs and rethrows, which is what its neighbours in the same file
  already do (`updateTask`, `deleteTask`). Both handlers that call it wrap it in a `try`, so the read
  now answers **HTTP 500** with `success: false`, the board renders its load-error screen with Retry
  (`app/dashboard/kanban/page.tsx:865`) and the tasks page raises a destructive toast. A background
  refresh stays quiet on purpose — `reloadTasks` keeps the cards already on screen rather than
  replacing a visible board with an error. `paginated-tasks-failure.test.ts` (5) holds the contract:
  the two failure tests are behavioural against a mocked driver — the old catch made them resolve,
  which is exactly what production could not tell apart from an idle member — and the third proves a
  successful read still returns rows, the total and `doneEarlier`, so the fix cannot be "always throw".
- **Tests.** `completed-on.test.ts` (28 — window resolution and its junk fallback, the timezone day
  maths, group order, the older-than-window count, a fallback row's day, the parameter appearing only
  off the page's own default) and the wiring guards `done-window-kanban.test.ts` (12 — the read is
  asked with the window on both paths, the segment appears only in the Done column, the collapse line
  reads the server's `earlier` and never a local length, a schedule card is dated by the drawn day) and
  `done-window-tasks.test.ts` (8 — the window leaves the all-time read alone, the page resets, the
  three views each carry the date line). `board-day-navigation.test.ts` and `dashboard-member-boards.test.ts`
  were re-cut for the longer fetch literal and the `boardPath` extraction; `recurrence-cross-surface-guards.test.ts`
  forced the board's column branch onto a named `DONE_COLUMN` rather than a bare `col.status === "done"`,
  which is what its swept-page rule is for. `done-window-read.test.ts` (11) is the one that renders the
  fragment rather than reading the source, and its serializable-params test is what now stands between
  a window predicate and a silent empty board. Gates: `tsc --noEmit` clean, 182 files / 2,939 tests.


## 58. Three pages join the sidebar, and four labels stop colliding (2026-11-10)

The audit of every dashboard surface found the same root cause behind most of its "looks unfinished"
reports: the sidebar is the only route discovery this workspace has — no command palette for routes,
no dashboard sitemap — so a page absent from `navCategories` is effectively undeployed however
complete its code is. Three built pages were in that position, and four nav labels collided.

- **Planner, Integrations and the assistant are now items.** `components/dashboard-layout.tsx` gains
  "Planner" (`GanttChartSquare`, first in Planning, `startsWith` so a future `/dashboard/planner/[id]`
  stays lit), "Integrations" (`Plug`, in Applications after Billing) and "AI Assistant" (`Sparkles`,
  in AI Features after AI Scrum Master). The third is also the mobile fix: the top bar hides the
  assistant popover under `!isMobile`, so the drawer item is the only assistant entry a phone has.
- **Four labels that meant four different things.** "Reports"/"Work Reports"/"Report previews" and
  "Playbook previews" named three report surfaces and one of two playbook surfaces. They are now
  **Period Reports** (`/dashboard/reports-work`, the builder that reads the work log), **Report
  Builder** (`/dashboard/reports`, scheduled dataset reports), **Pack Reports** and **Pack Playbooks**
  (`/dashboard/ops/*`, the read-only previews of what the role pack declares). The `/dashboard/playbooks`
  item keeps the unqualified "Playbooks": it is the library you write, the pack items are previews.
- **The rename followed the label everywhere a user could see it.** Page `<h1>`s and the toast titles,
  the operations overview and config cross-links, the "All work reports" handoff, the Automation
  cross-link array, `DASHBOARD_SECTIONS` (`lib/packs/types.ts:30`) — the strip on `/dashboard` that
  orders the pack's sections — and the `work_reports` dataset label in `app/api/reports/_shared.ts`.
  The assistant prompt heading (`lib/assistant/context.ts:297`) moves too, because a member who reads
  an answer citing "Work Reports" is being told about a page they cannot now find.
- **Historical records keep their wording.** `docs/superpowers/plans/*` and the dated FEATURES.md
  entries for Phases 3/16/29 describe the labels as they shipped, and are left alone.
- **Tests.** `tests/unit/dashboard-nav-labels.test.ts` (15) is the guard, written first and observed
  failing 14/15. Two halves: coverage — every item's `title`/`href` pair, and every nav `href` asserted
  against a real `app/**/page.tsx` on disk (so the guard fails the next time an item points at nothing,
  which is the same failure class it just fixed); and vocabulary — the retired labels may not reappear,
  `it.each` over the renamed surfaces in both the sidebar and the page bodies. `ops-playbooks.test.ts`
  and `assistant-context.test.ts` were re-cut for the new strings rather than exempted. Gates:
  `tsc --noEmit` clean, 196 files / 3,127 tests.

## 59. One hourly schedule runs the three things nothing was running (2026-11-11)

The same audit found the product gap behind three surfaces that looked finished: report schedules stored a
`next_run_at` that nothing ever compared against the clock, automation rules stored `is_active` that nothing
ever polled, and the email workspace queued `email_digest` rows that nothing ever delivered. All three had
a manual button and no timer. `vercel.json` carried no schedule at all.

- **One schedule, not three.** `vercel.json` declares `schedules.workspace-maintenance` — `"0 * * * *"`,
  `path: "/api/cron/hourly"`, `requestMethod: "GET"`. The method is explicit because Vercel defaults a path
  schedule to POST and the route exports only GET. There is no legacy `crons` key beside it: keeping both
  would fire the same path twice an hour. Hobby allows at most one run per 15 minutes and always applies a
  15-minute jitter, so the run lands somewhere in the hour, not on the dot.
- **The gate is a bearer secret, and it fails closed.** `app/api/cron/_auth.ts` exports
  `isAuthorizedCron(request, secret = process.env.CRON_SECRET)`: an exact compare against
  `Authorization: Bearer <secret>`, false when the variable is unset. `proxy.ts` only matches
  `/dashboard/*` and `/onboarding/*`, so this header is the route's only gate — an unconfigured deployment
  runs nothing rather than running unauthenticated. Vercel reads `CRON_SECRET` from the deployment's own
  environment, so the value sent and the value checked always come from the same build.
- **Three jobs, isolated.** `app/api/cron/hourly/route.ts` (`maxDuration = 60`) runs each job in its own
  try/catch and answers `200 {success:true,data:{jobs:{reports,rules,digest}}}` — or 500 with the same shape
  when any job threw, because Vercel does not retry a failed run and the status is what shows in the
  schedule's execution history. A throw in the first job must not freeze the other two for the day.
- **Reports claim before they run.** `app/api/reports/_runner.ts` selects due rows
  (`is_active AND next_run_at <= now()`) and claims each with
  `UPDATE report_schedules SET next_run_at = <computeNextRun(cadence)> WHERE id = ? AND is_active AND next_run_at <= now() RETURNING …`.
  Zero rows back means someone else claimed it, so the run skips — that is what makes a duplicate delivery
  harmless. `runSchedule()` was extracted from `app/api/reports/[id]/run/route.ts`, so the button and the
  timer execute one implementation. A scheduled run does exactly what the button does: it writes the run and
  its dataset. It does not email recipients.
- **Automation uses a ceiling, not a claim.** `app/api/automation/_scheduler.ts` selects
  `is_active AND (last_run_at IS NULL OR last_run_at <= now() - interval '55 minutes')` and calls the existing
  `executeRule(rule, { actorName: "Hourly schedule" })`, isolating per-rule failures. The 55-minute ceiling is
  the idempotency guard here because `executeRule` already owns `last_run_at`, `run_count` and
  `automation_runs`; a second claim column would need a migration. Residual risk, stated: two runs delivered
  in the same minute could both pass the ceiling and double-apply an action such as `bump_priority`. Runs are
  not announced to the owner — 24 notifications a day would be noise.
- **The digest queue now really sends.** `app/api/email/_dispatcher.ts` takes at most 25 `queued` rows per
  run and mails them through `lib/email.ts` `sendEmail()`. Two rules decide the outcome: `to_email` must
  match a `users.email` in this workspace (anything else is marked `failed` and logged — the open-relay rule
  that got `/api/aitopia` deleted), and an event type whose `email_preferences` entry has `digest: false` is
  not mailed. Unsubscribed rows are marked `failed` too, with the reason in the log: the table's status
  vocabulary is queued/delivered/failed and adding `skipped` would need a migration. The claim is
  `UPDATE … SET status='delivered' WHERE id=? AND status='queued'`, so a re-delivery cannot re-send. It marks
  before the provider call and corrects to `failed` on error — a crash inside that window would leave a false
  `delivered`, which is the cheaper of the two lies.
- **The email surfaces stopped claiming nothing is sent.** 17 copy sites on `app/dashboard/email/page.tsx`,
  the header comments and notification bodies of four `app/api/email/*` routes, and the `notifyEmail` line on
  `/dashboard/settings` were rewritten to state the real contract: hourly, ≤25 rows per run, member addresses
  only, digest-off stops mail, `CRON_SECRET` + `JIRAVISION_RESEND_API` required, a provider rejection marks the
  row failed, and marking a row delivered by hand records an operator's claim. The settings switch now points
  at the subscription matrix, because nothing in the mail path reads `users.preferences.notifyEmail`.
- **`CRON_SECRET` is set, and the first run is green.** `.env.example` carries the key with generation
  (`openssl rand -hex 32`) and placement instructions and **stays empty** — it is committed, so a real value
  there is a value in git history. `.env.local` has its own value; Vercel production has a separate one, added
  as a Secret on 2026-11-11 with the owner's approval (15 environment variables, was 14) and followed by a
  rebuild, because Vercel fixes the sent value at build time rather than reading it per request. Verified live:
  an unsigned `GET https://jiravision.vercel.app/api/cron/hourly` answers **401**
  `{"success":false,"message":"Unauthorized"}` with `x-matched-path: /api/cron/hourly`, and
  `vercel schedules invoke workspace-maintenance` — Vercel signs that call itself, so the secret never passes
  through a shell — recorded **Succeeded**, 1 invocation / 0 failed / 373ms. `vercel schedules list` reads
  `workspace-maintenance · Active · Cron · 0 * * * * · Path: /api/cron/hourly`.
- **What the mail provider actually does, measured.** The stale note in §4 and `PLACEHOLDERS.md` said
  `JIRAVISION_RESEND_API` returns 401. A read-only `GET https://api.resend.com/domains` with the local key
  answers **200** — the key is valid. Its only domain, `guriflex.co.ke`, is in status `failed`, and
  `JIRAVISION_EMAIL_FROM` is unset, so `EMAIL_FROM` falls back to `JiraVision <onboarding@resend.dev>`.
  Delivery therefore depends on a sender the provider accepts; no test message was sent. A rejection is
  handled: the row is marked `failed`.
- **No migration, and the first runs are no-ops.** A read-only census of production found 0 report schedules,
  0 automation rules and 0 digest rows, so nothing was due and nothing needed a schema change. The three
  tables stay raw-SQL (they are absent from `drizzle/schema.ts`, which is owned elsewhere).
- **Tests.** Seven files, 88 new cases, all written first and observed failing: `cron-auth.test.ts` (7),
  `cron-hourly.test.ts` (5, including "no job runs on a 401"), `report-runner-due.test.ts` (8, asserting the
  rendered SQL and its bound params), `automation-scheduler.test.ts` (7), `email-dispatcher.test.ts` (15),
  `email-delivery-copy.test.ts` (40, a comment-stripped source guard over every silence claim) and
  `cron-wiring.test.ts` (6). The wiring guard is the deploy-time net: exactly one schedule, no `crons` key,
  the path resolves to a real `route.ts` exporting the declared method, and a hand-evaluated cron window
  proves the interval is ≥15 minutes — mutation-checked by setting `*/10 * * * *` (fails: "fires every 10 min")
  and `requestMethod: "POST"` (fails: no POST handler). `schema-safety.test.ts` learned `isAuthorizedCron` as
  an auth check, so the anonymous-route census still enumerates `/api/cron/hourly` and still fails if the gate
  is removed. Gates: `tsc --noEmit` clean, 203 files / 3,216 tests.
