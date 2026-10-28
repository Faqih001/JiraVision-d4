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
- **Site assistant API.** `lib/assistant/site.ts` — tier 1: keyword matching (35 keywords: pricing, cost, trial, free, features, support, secure, security, integration, migrate, migration, demo, contact, api, mobile, offline, data, privacy, gdpr, soc, enterprise, team, user, seat, billing, payment, invoice, cancel, refund, discount, nonprofit, education, student). Tier 2: Gemini with pathname-based knowledge. `POST /api/assistant/site` — anonymous, rate-limited (8/hour, 24/day per IP), global daily cap 200 via `ai_usage_daily`. Falls back to scripted answer on Gemini error.
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
  and the three scripts) — seven files, 97 tests — plus four onboarding guards in `worklog-reports.test.ts`.
  Suite: 121 files / 1981 tests.


## 23. Agent entry (phase 18, 2026-10-27)

- **One page, two jobs.** `/dashboard/agent` keeps `?tab=handover` (default) and `?tab=recommendations`
  in the URL, so a link opens the same list.
- **Handover is preview → commit.** `POST /api/agent/handover` reads a pasted brief or one PDF against a
  chosen role pack and returns normalised register rows, playbook drafts and a refusal list. It writes
  nothing, stores neither the text nor the PDF, and never logs them.
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
