# JiraVision Redesign Plan

Frontend-only redesign of the marketing site. Dashboard app, auth, and API logic are out of scope (untouched except where they inherit the new theme tokens).

---

## 1. Audit

### 1.1 Stack & configuration
| Item | State |
|---|---|
| Next.js | 16.1.1 (current — no upgrade needed) |
| React | 19.1.x |
| Tailwind | 3.4.17, shadcn-style HSL CSS variables (`tailwind.config.ts` + `app/globals.css`) |
| TypeScript | `strict: true` in tsconfig, **but `next.config.mjs:5-7` sets `typescript.ignoreBuildErrors: true`** — type errors are silently ignored at build |
| Images | `next.config.mjs:8-10` sets `images.unoptimized: true` — `next/image` gives no optimization; remote images also have no `remotePatterns` whitelist |
| Rewrites | `/api/aitopia/*` proxied to `extensions.aitopia.ai` (`next.config.mjs:18-24`) — third-party dependency, kept as-is |
| Fonts | Inter only, via `next/font/google` in [app/layout.tsx:3](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/layout.tsx#L3). No display face. `styles/globals.css` (v0 leftover) sets Arial and is imported nowhere — dead file. |
| Metadata | `generator: 'v0.dev'` at [app/layout.tsx:21](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/layout.tsx#L21). No per-page metadata, no OG/Twitter cards, canonical URLs, sitemap, or robots — `public/` has no `sitemap.xml` or `robots.txt`, and there is no `app/sitemap.ts`. |
| package.json | Name is still `"my-v0-project"`. |
| Lockfiles | Both `package-lock.json` and `pnpm-lock.yaml` present — ambiguous package manager; Vercel will pick npm. Remove the pnpm lock. |

### 1.2 Dependency problems
~85 direct dependencies, of which **~20 are the v0 "every database driver" bundle** (verified by grep: zero imports in code):
`@aws-sdk/client-rds-data, @electric-sql/pglite, @libsql/client, @libsql/client-wasm, @planetscale/database, @tidbcloud/serverless, @xata.io/client, expo-sqlite, gel, knex, kysely, mysql2, pg, postgres, sql.js, sqlite3, @opentelemetry/api, @cloudflare/workers-types, bun-types, @types/pg, @types/sql.js, @types/socket.io-client`.
Also suspect-unused (verify at removal time, then delete): `framer-motion` (marketing pages use raw CSS, not motion), `react-resizable-panels`, `input-otp`, `vaul`, `cmdk` if unused after layout rebuild.
Radix primitives are pinned to old exact versions (all ~1 major behind); safe to bump only if actually used.
Outdated (per `npm outdated`): almost everything scoped above; core (next/react/tailwind/zod/react-hook-form) is fine as-is.

### 1.3 Architecture problems
- **No marketing layout group.** `MainNavbar` + `MainFooter` are manually imported in 28 page files (no `app/(marketing)/layout.tsx`). Every page edit duplicates chrome.
- **Root layout mounts fake AI chatbot everywhere.** `LandingChatbot` ([app/layout.tsx:35](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/layout.tsx#L35)) is a keyword-matched FAQ dictionary with `setTimeout` fake latency, `👋` emoji, stale-closure race bugs in `handleSendMessage`, no `aria-label` on the trigger, and it overlaps the WhatsApp FAB on /contact. It appears on marketing pages *and* dashboard/auth pages.
- **globals.css is copy-paste corrupted.** [app/globals.css](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/globals.css) (452 lines) contains the token block, kanban styles, and chart styles **twice** (identical `:root`/`.dark`/`.task-chart-bar` blocks).
- **105 gradient class occurrences across 28 marketing files** (`bg-gradient-to-*` indigo→purple recipes) bypassing the token system.
- 3 near-duplicate error pages: `app/error.tsx` → `components/error-boundary.tsx` → `components/global-error.tsx` (same copy, hard-coded `bg-gray-100`, and **displays raw `error.message` to end users**).

### 1.4 Broken / dead
| Issue | Where |
|---|---|
| Dead link `/changelog` — **route does not exist** (announcement bar, footer) | [components/main-navbar.tsx:206](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-navbar.tsx#L206) |
| Dead link `/support`, dead search form `action="/search"` | [app/not-found.tsx:20-24](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/not-found.tsx#L20-L24) |
| 10 footer social links are `href="#"` (Twitter/LinkedIn/GitHub/Facebook/Instagram ×2 menus) | [components/main-footer.tsx:38-66](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-footer.tsx#L38-L66), 140–168 |
| Fake newsletter: two inputs with no `<form>`, handler, or validation | [components/main-footer.tsx:108-113](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-footer.tsx#L108-L113), 259–264 |
| Theme toggle: `Moon` icon `absolute` in a non-`relative` button — mispositioned | [components/main-navbar.tsx:427-429](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-navbar.tsx#L427-L429) |
| Navbar mega-menu embeds 12 Unsplash URLs | [components/main-navbar.tsx:84-167](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-navbar.tsx#L84-L167) |
| Stray junk in repo: `middleware.ts.new`, `components/calendar/add-event-modal.tsx.new`, junk SQL-named file `ql -U postgres ...`, `local.db`, root debug `.js` scripts | repo root / components/ |

### 1.5 Fake credibility content (must be replaced with flagged placeholders)
- FAANG "Trusted by" logo bar (Google/IBM/Microsoft/Amazon/Netflix hotlinked from Wikimedia): [app/page.tsx:61-85](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/page.tsx#L61-L85)
- "Trusted by 5,000+ teams" + "99.9% uptime": [components/main-navbar.tsx:213-215](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/main-navbar.tsx#L213-L215)
- "Decreases burnout risk by 40%" ([app/page.tsx:270](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/page.tsx#L270)), "100% pay equity" (:281), "95% accuracy" (:382), "~5 hours/week per developer" (:258)
- About stats: "5,000+ Teams", "50+ Countries", "100+ Team Members", "$25M Venture Funding" ([app/about/page.tsx:232-249](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/app/about/page.tsx#L232-L249))
- ~15 fabricated testimonials with stock-photo avatars across home, all 4 product pages, all 4 solutions pages, case studies, webinars (Marcus Johnson, Sophia Chen, Robert Kim, Sarah Johnson, Michael Chen, Emily Rodriguez, James Wilson, David Kim, "Dr. Sarah Johnson"…)
- 152+ Unsplash/remote image references, ~90 raw `<img>` tags bypassing `next/image` (all marketing pages; list in §6.4)

### 1.6 Accessibility gaps
No skip-to-content link anywhere; no `<main>` landmark consistency; heading order jumps (h1→h3 on several sections); emoji used as UI icons (chatbot `👋` on every page); text-glyph `+/-` accordion controls in footer; chatbot trigger button unlabeled; purple `--primary: 262 83% 58%` fails AA contrast as white-on-purple for small text in places; dropdowns/accordions lack full aria wiring; `suppressHydrationWarning` on `<html>` masks theme flash issues.

### 1.7 Security flag (owner action, outside redesign)
**A Google Maps API key is committed in source** at [components/google-map.tsx:7](file:///Users/kiibridge-tech/Desktop/Projects/jiravision/components/google-map.tsx#L7) and used client-side. It must be revoked/rotated in Google Cloud Console and replaced with an env var + referrer restrictions. (There are also root-level `SECURITY_*.md` docs about a past incident — unrelated files, not touched.) The redesign will stop hard-coding it but cannot revoke it — that is an owner task.

### 1.8 Routes (keep all; URLs unchanged)
- Marketing: `/`, `/products/{ai-scrum-master,team-wellbeing,gamification,ethical-metrics}`, `/solutions/{agencies,enterprise,remote-teams,startups}`, `/pricing`, `/about`, `/careers`, `/contact`, `/faq`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/legal-notice`, `/terms`, `/privacy`, `/cookies`, `/accessibility`
- Resources: `/resources/{blog,case-studies,documentation,webinars}` (+ `[slug]` dynamic routes)
- Missing but linked: **`/changelog`** (spec requires it — will be created)
- App (out of scope): `/dashboard/*` (20 routes), `/api/*` — not restyled beyond token inheritance.

### 1.9 Orphan / dead code
Never imported: `components/icons.tsx`, `components/global-chatbot.tsx`, `components/ai-model-selector.tsx`, `components/dashboard-chatbot.tsx`, all 6 `components/chat/*` (dashboard chat reimplements inline), legacy `components/calendar/{add-event-modal,event-details-modal}.tsx`, `styles/` directory.

---

## 2. Design tokens

Single source of truth: CSS variables in `app/globals.css` (rewritten, deduped) exposed as Tailwind theme colors in `tailwind.config.ts`. **All existing shadcn variable names are kept and re-colored** so `/components/ui/*` and the dashboard inherit the new palette without per-file edits. One accent, no gradients.

### 2.1 Palette (muted, earthy; "warm stone + pine")
| Token | Light | Dark |
|---|---|---|
| background | `#F7F5F0` | `#1A1917` (warm charcoal) |
| surface / card | `#F1EEE6` | `#211F1D` |
| ink / foreground | `#1C1B19` | `#E8E4DC` (softened, not white) |
| ink-muted | `#6F6A61` | `#A39D92` |
| border | `#DED8CC` | `#37342F` |
| **accent (pine)** | `#2F4A3F` | `#6E9A85` |
| accent-foreground | `#F7F5F0` | `#14211B` |
| secondary neutral (stone) | `#8A857B` | `#8A857B` |
| success (moss) | `#4F6B3A` | `#87A36F` |
| warning (ochre) | `#8A6520` | `#C49A4A` |
| error (brick) | `#8F4433` | `#C97B66` |

All pairs verified ≥ 4.5:1 (body) / 3:1 (large, UI) in both themes; documented per-pair in DESIGN_SYSTEM.md.

### 2.2 Type
- Display: **Fraunces** (opsz variable, weights 400/500/600) — headlines.
- UI/body: **Inter** (400/500/600) — kept.
- Both via `next/font/google`, `display: swap`, CSS vars `--font-display` / `--font-sans`.
- Scale (mobile→desktop fluid): 36/44/56/72 display sizes; body 16px, 1.65 line-height, `max-width: 65ch` for prose.

### 2.3 Layout & motion
- 8px spacing scale (Tailwind default is compliant); container `max-w-[1200px]`; 12-col grid via `grid-cols-12` at `lg+`.
- Radius: `--radius: 8px` (cards 12px via `md`, inputs/buttons 6–8px). Shadows: two low-contrast tokens (`--shadow-sm/md`), warm-tinted.
- Transitions 150–250ms `ease-out`; scroll reveal = one small fade/translate via a `<Reveal>` client component using IntersectionObserver; global `@media (prefers-reduced-motion: reduce)` kill-switch.
- Icons: **lucide-react only** (already installed; current version fine). No emoji.

### 2.4 Imagery policy
- Delete every Unsplash/Wikimedia reference on marketing routes.
- Product visuals are code-built UI mockups (§4 `mockups/`): sprint board, workload/burnout chart, skill tree, equity dashboard, plus tabbed product-tour views.
- Avatars → initials chips. OG images: generate simple `ImageResponse`-free static SVG/PNG wordmarks (no bright colors).

---

## 3. Content architecture

New `content/` directory (TS data files, typed): `site.ts` (nav/footer/socials), `stats.ts`, `testimonials.ts`, `integrations.ts`, `pricing.ts`, `faq.ts`, `changelog.ts`, `careers.ts`, `product-pages.ts`. Every unverifiable number is `PLACEHOLDER: true` + `// TODO(owner): replace with verified figure` and renders with a visible "(placeholder)" marker **only in dev** (via `NODE_ENV`), clean in prod. Rewrite all marketing copy: specific, benefit-led, modest.

---

## 4. Component inventory

- `app/(marketing)/layout.tsx` — new group layout: navbar/footer/chatbot-free chrome, skip link, `<main id="main">`. Marketing pages move into the group (URLs unchanged).
- `components/ui/*` — kept (shadcn), re-tokenized. Unused ones deleted with their deps.
- `components/sections/` — new: `announcement-bar`, `navbar` (dropdown menus, keyboard-navigable), `mobile-drawer`, `footer`, `hero`, `built-on-strip`, `problem-solution`, `pillar-bento`, `how-it-works`, `product-tour-tabs`, `integrations-grid`, `security-section`, `use-cases`, `results`, `testimonials`, `pricing-teaser`, `faq-accordion`, `cta-band`, `reveal`.
- `components/mockups/` — new: `sprint-board`, `workload-chart`, `skill-tree`, `equity-dashboard`, `mock-frame` (browser-chrome wrapper).
- `components/product/` — shared product-page template (hero, capabilities rows, how-it-works, outcomes, related, FAQ, CTA).
- `components/legal/legal-layout` — long-form template + sticky TOC + last-updated.
- `components/theme-toggle` — fixed relative-positioning, aria-label, no flash (`next-themes` already present; script strategy kept, remove blanket `suppressHydrationWarning` where possible).
- Pages: `app/changelog/page.tsx` (new route, timeline + category filter); `not-found.tsx` + `error.tsx` rebuilt in-system (no raw error messages to users); pricing/about/careers/contact/faq/login/signup/legal pages restyled in place.

---

## 5. Phases (each: lint + typecheck + build green, then git commit + push)

| Phase | Scope |
|---|---|
| **0** | Repo hygiene: remove junk files (`.new`, lockfile dup), `package.json` name → `jiravision`, remove the 20 verified-unused DB driver deps + lock entries, turn off `ignoreBuildErrors`, `next lint` check (Next 16 removed it — add eslint if needed). Dashboard untouched except tokens. |
| **A** | Tokens + global styles (§2), fonts, globals.css rewrite. Verify build + dashboard still renders with new palette. |
| **B** | Marketing layout group + navbar/announcement bar/mobile drawer/footer/theme toggle/skip link + `content/site.ts`. Fake chatbot removed from marketing (decision D1 below). |
| **C** | Homepage: all 17 spec sections + mockups. |
| **D** | Product pages ×4 + shared template. `/solutions/*` ×4 restyled with the same section components (they're live, linked from navbar). |
| **E** | Pricing, about, careers, contact (RHF+zod + honeypot + states), faq, changelog (new), login/signup/forgot/reset (restyle only, auth logic untouched), legal ×5, 404 + error. |
| **F** | SEO (per-page metadata, OG/Twitter, canonical, `app/sitemap.ts`, `robots.txt`, JSON-LD Organization/SoftwareApplication/FAQPage), delete orphan components, responsive QA at 360/768/1024/1280/1536, keyboard/a11y pass, contrast audit both themes, DESIGN_SYSTEM.md, final summary. |

---

## 6. Owner decisions (approved 2026-10-23)

- **D1 — Fake AI chatbot**: KEEP on all pages, but fix bugs (stale-closure races, keyword matching), restyle to the new tokens, add proper aria-label/focus, resolve the /contact FAB overlap, replace `👋` emoji with a lucide icon.
- **D2 — Dashboard**: OUT of restyle scope; inherits new tokens only.
- **D3 — Images (REVISED by owner 2026-10-23)**: KEEP Unsplash photography across pages, but only *relevant, on-tone* imagery (calm, professional, muted; no neon) served via `next/image` with `images.unsplash.com` in remotePatterns. Replace the current mismatched/broken hotlinks (incl. the FAANG/Wikimedia logo bar) with curated on-topic photos; code-built UI mockups remain for product-UI sections.
- **D4 — Maps API key (security)**: owner to revoke/rotate in Google Cloud Console; code moves the key to env var.
- **D5 — Social links**: none exist → removed by default; re-add when real URLs are provided.
- **D6 — `images.unoptimized`**: kept `true` while remote images remain in dashboard code; revisit in Phase F.

Deliverables: this file (updated at the end), DESIGN_SYSTEM.md, redesigned routes, final summary with placeholder list + QA checklist.

---

## 5b. v2 extension brief (owner, 2026-10-23 — supersedes v1 where they conflict)

The owner issued a second brief: competitor-informed (Linear, Asana, monday, ClickUp, Jira), fully-functional, standout-feature redesign. Research output: **COMPETITOR_RESEARCH.md** (Borrow/Improve/Avoid table). Everything from v1 that still applies (muted palette, no fabricated claims, a11y/SEO, commit-per-phase) stays; v2 adds:

**New global rules**
- No dead buttons / `#` links / static fakes anywhere — where no backend exists, build route handlers + a typed, swappable data layer (JSON-file adapter now, Supabase-ready interface).
- Every major page: 15–20 sections, no two adjacent sections sharing a layout, rotating CSS/SVG background treatments (grain, dot grid, contours, tonal bands, hatching, serif watermark, duotone shapes, inverse charcoal band, terracotta/sage cut-outs, stacked cards) defined as reusable utilities with dark variants and AA contrast.
- Chrome rework: topbar gains status chip + docs link; header gains scroll-aware compact/hide behavior, mega-menu featured cards, Cmd+K search button; footer becomes editorial (closing CTA + email capture, status, language/theme switchers, back-to-top, oversized outlined wordmark); mobile bottom nav bar + desktop floating contextual bar; cookie-consent manager gating analytics.
- New deliverables: FEATURES.md, PLACEHOLDERS.md; Playwright smoke tests + unit tests for calculator logic.

**Feature set (v2 §3)** — interactive sandbox board with AI-rebalance + wellbeing meter, burnout-risk calculator, ROI calculator, pay-equity explorer (recharts/visx, demo-labelled), gamification playground, responsible-AI transparency center with "why this suggestion?" explainer, template library (12–20, filterable, preview modals), /compare/* ×5 (factual, dated, flagged), migration hub with locally-saved checklists, "find your fit" quiz personalising CTAs, /roadmap + /status with voting, reading progress + scroll-spy + copy-section-link, Cmd+K palette + `g` shortcuts + `?` help, printable one-pagers per product.

**Phase mapping (v2 §7 → our state)**

| v2 phase | Scope | Status |
|---|---|---|
| 0 | Audit + COMPETITOR_RESEARCH.md → present, await go-ahead | ✅ done (audit = §1; research = COMPETITOR_RESEARCH.md) — **awaiting owner go-ahead** |
| 1 | Tokens ✅, backgrounds library, Topbar/Header/Footer/BottomBar rework | tokens+chrome v1 done in Phase A/B; v2 upgrade pending |
| 2 | Data layer, forms (contact/demo/newsletter/careers/quote with RHF+zod+honeypot+rate-limit+email adapter+storage), auth verification, Cmd+K search, cookie consent | new |
| 3 | Homepage → 20 sections incl. sandbox, calculators, explorer, playground, template carousel, comparison snapshot, seat slider | v1 homepage (13 sections) shipped in Phase C; expands here |
| 4 | Product pages (15–17 sections each), Pricing (15), About (15), Solutions by role+size | supersedes v1 Phase D + parts of E |
| 5 | Compare ×5, migration hub, templates, roadmap, status, blog/resources, changelog | supersedes v1 Phase E additions |
| 6 | QA, a11y pass, perf pass (Lighthouse 90+ on Home/Product/Pricing), Playwright+unit tests, cleanup + docs deliverables | supersedes v1 Phase F |

i18n scaffolding (EN first, structure ready for Swahili/French) lands in phase 2 as a thin message-catalog layer, not a rewrite.

---

## 7. Phase results log

### Phase 0 — repo hygiene & dependency cleanup (done 2026-10-23)
- Deleted junk: all `*.new` files (7, incl. drizzle schema + api routes), `local.db`, `db-debug.json`, the SQL-named stray file, root debug scripts (`chat-api-debug.js`, `socket-debug.js`, `production-readiness-check.js`, `test-neon-connection.js`) + their dead package.json scripts, duplicate `pnpm-lock.yaml`. (All recoverable from git history.) `generate-jwt-secret.js` kept (owner utility).
- Removed 21 verified-unused dependencies (the v0 DB-driver bundle + `framer-motion`, `@types/socket.io-client`, `mini-css-extract-plugin`, `postcss-loader`); `postgres`, `pg`, `@types/pg` were initially removed by mistake and **restored** — they are used by `lib/db.ts` and drizzle/scripts. Net: package.json 96 → ~60 deps; renamed `my-v0-project` → `jiravision`.
- Lockfile + node_modules fully regenerated (old one was npm/pnpm mixed). Peer conflict `react-day-picker@8` vs `date-fns@4` handled via new `.npmrc` (`legacy-peer-deps=true`) — matches previous behavior; Vercel build unaffected (uses committed lockfile).
- `next lint` no longer exists in Next 16 → added ESLint 9 via `eslint.config.mjs` (`eslint-config-next` flat config). 0 errors / 355 warnings; legacy dashboard files have a scoped exceptions block (TODO: removed in Phase F).
- Fixed real bugs: `lib/socket.ts` mistyped singleton (`typeof Socket` → `Socket`, 51 type errors); `lib/socket-client.ts` listener cleanup closures null-safety; `components/google-map.tsx` map container was unmounted during load (ref null → map never rendered) **and its committed leaked API key removed from source** — key now `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (owner: revoke the old one!).
- `.env.example` created documenting all env vars. `typecheck` script added.
- Type debt: 165 → ~87 unique errors (rest are pre-existing in API routes, drizzle scripts, landing-chatbot, generated route validators incl. hrefs to the missing `/changelog` route — fixed as phases proceed). `ignoreBuildErrors` kept temporarily with TODO; removed in Phase F.
- Verified: `npm run lint` exit 0, `npm run build` exit 0.

### Phase A — design tokens (done 2026-10-23)
- `app/globals.css` rewritten: warm stone + pine palette (light/dark), deduped double token blocks, display-font headings, focus-visible ring, prefers-reduced-motion kill-switch, dashboard/chat utilities preserved.
- `tailwind.config.ts`: font families, surface/ink/clay/success/warning/chart colors, soft shadows, container 1240px.
- Fraunces + Inter wired via `next/font` in root layout; `v0.dev` generator meta removed.
- Verified live in browser: light bg `rgb(248,246,242)`, dark `rgb(24,24,22)`, h1 renders Fraunces.

### Phase B — shared marketing chrome (done 2026-10-23)
- New `app/(marketing)` route group: all 17 public route dirs + homepage moved in via `git mv` (URLs unchanged — build confirms identical route list). 28 pages had per-page `<MainNavbar/>`/`<MainFooter/>` stripped; group layout supplies chrome + skip-link + `<main id="main">`.
- New components: `components/sections/navbar.tsx` (sticky, announcement bar, mega-menu dropdowns with Unsplash thumbnails, mobile Sheet drawer with aria-expanded accordions, Log in / Get started CTAs), `footer.tsx` (5 config-driven columns, brand block, newsletter form gated behind `newsletter.enabled=false` until a real endpoint exists, social row hidden while `socialLinks` empty), `announcement-bar.tsx` (dismissible, `useSyncExternalStore` + localStorage, no hydration flash), `theme-toggle.tsx` (fixed broken absolute-icon positioning via `relative overflow-hidden`).
- Fake content removed from chrome: "Trusted by 5,000+ teams / 99.9% uptime" strip gone; 10 dead `href="#"` social icons gone; scroll-hide navbar effect dropped.
- `content/site.ts` extended with footer columns + newsletter config (PLACEHOLDER-flagged).
- `landing-chatbot.tsx` fixed per D1: emoji greeting removed, stale-closure `setMessages` replaced with functional updates, aria-labels + `role=dialog` + Escape-to-close, responsive width, unverifiable claims ($10/user, 14-day trial, "Yes!" discount answers) softened to point at pricing/contact.
- Deleted `components/main-navbar.tsx`, `components/main-footer.tsx`.
- Verified live (Playwright): desktop header/footer DOM + computed styles, dropdown images load, theme toggle flips class + colors, mobile 375px drawer opens/accords with no horizontal overflow, announcement dismiss persists across reload; `/pricing`, `/products/ai-scrum-master`, `/login`, `/resources/blog` all 200. Lint 0 errors, build exit 0.

### Phase C — homepage v1 (done 2026-10-23)
- 13-section homepage composed from `components/sections/*` with all copy in `content/home.ts`; code-built UI mockups (`components/mockups/product-mockups.tsx`: sprint board, wellbeing bars, skill tree, equity bars) replace stock hero; fake logo bar replaced by honest "Built on" strip; PLACEHOLDER flags on outcomes/testimonials.

### V2-1 — backgrounds library + chrome rework (done 2026-10-23)
- **Backgrounds**: 10 `.jv-bg-*` CSS treatments + `.jv-watermark` + `.jv-invert` token-remap block in `globals.css`; `SectionBg` component; `Section({bg, watermark})` wired. Homepage rotation: dots×2, grain, grid, hatch×2, band-clay, inverse(+watermark "J"), contour, shapes, band-sage — adjacent sections never repeat; inverse band text color fixed by re-resolving `color` against remapped tokens (verified rgb(228,224,216) on charcoal in both themes).
- **Topbar**: dismissible pine strip with rotating-ready announcement, live status chip (→ new `/status`), Docs link.
- **Header**: moved to `components/layout/navbar.tsx`; scroll-aware (compact h-20→h-14, hide-on-down/reveal-on-up, border+shadow on scroll), underline-slide ink on triggers, 720px mega-menus with FeaturedCard (`menuFeatures` in content), mobile Sheet drawer with accordions + 48px targets.
- **Footer**: editorial rework — closing statement + CTA, working newsletter capture (POST `/api/newsletter`, zod + honeypot + 5/min/IP rate limit, JSON adapter `lib/data/subscribers.ts`, `data/` gitignored), status chip, theme toggle, 5-column grid w/ mobile `<details>` accordions, outlined JiraVision wordmark flourish, compliance row + Back-to-top (FAB clearance margin). `newsletter.enabled` now true.
- **Bottom bar**: `components/layout/bottom-bar.tsx` — mobile persistent nav (Home/Pricing/Contact/Menu; Menu dispatches event the navbar listens for to open the drawer; active dot indicator, safe-area padding, hide-on-scroll-down) + desktop floating contextual bar (appears past hero, reading-progress %, Get started CTA, dismiss persisted in sessionStorage, hides near footer). Layout spacer prevents overlap.
- **New routes**: `/changelog` (timeline from `content/changelog.ts`) and `/status` (from `content/status.ts`) — topbar/menu links are live.
- Honeypot bug fixed: filled `company` now returns fake success (was 400 via zod max(0)).
- Verified live (Playwright): 11 bg layers in DOM order, inverse contrast, form submit → subscriber stored, honeypot not stored, float bar show/hide + progress, mobile bar reveal-on-scroll-up, Menu→drawer, footer accordions, light+dark footers, 390px no overflow, 0 console errors. Lint 0 errors, build exit 0.

### V2-2 — data layer, functional forms, search palette, consent, i18n (done 2026-10-23)
- **Data layer**: `lib/data/json-store.ts` generic `createJsonCollection<T>` (list/add/findBy/update → gitignored `data/<name>.json`, Supabase-swappable); `subscribers.ts` upgraded to double opt-in records (pending/confirmed + token, legacy rows migrated to confirmed); `submissions.ts` for contact/demo/quote/careers.
- **Forms pipeline**: `lib/forms/handler.ts` `formRoute()` factory — honeypot fake-success → per-IP rate limit (`lib/rate-limit.ts`) → zod (`lib/forms/schemas.ts`) with per-field errors → stored → email via provider-agnostic `lib/email.ts` (Resend if `JIRAVISION_RESEND_API` valid, else dev-log; HTML-escaped templates). Routes: `/api/contact|demo|quote|careers` replace the old single-purpose send-contact-email route (deleted).
- **Contact page rebuilt**: 3-tab working forms (message/demo/quote) with RHF+zodResolver+hidden honeypot, detected-timezone demo scheduling, verified direct lines (tel/mailto/WhatsApp), map hidden until `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (leaked v0 key removed from source; fallback card links to Google Maps search), department mailto cards, "what happens next" steps, inverse FAQ/status CTA. Contact info config-driven in `content/site.ts` with NOTE(PLACEHOLDER) on unconfirmed department mailboxes.
- **Careers rebuilt**: `content/careers.ts` (NOTE(PLACEHOLDER) on inherited openings), searchable/filterable board, Apply dialog → working `/api/careers` form per role + general application; fabricated team-voice testimonials removed.
- **Newsletter double opt-in**: pending record + confirm email link → `GET /api/newsletter/confirm` → `/newsletter/confirm?status=ok|invalid` result page.
- **Search palette** (`components/features/site-search.tsx`): ⌘/Ctrl+K, `jv-open-search` event triggers (navbar button, drawer row, mobile bottom-bar Search tab), grouped index (`content/search-index.ts`: pages/products/solutions/resources/blog/FAQ/changelog), Recent searches (localStorage via useSyncExternalStore, max 5), Suggested group on empty query, Actions → keyboard-help modal (`?`), g h/p/c/s nav shortcuts; drawer→palette handoff verified (single dialog, focus in input).
- **Cookie consent** (`lib/consent.ts`, `components/features/cookie-consent.tsx`): bar + preferences dialog with real analytics/marketing switches (necessary locked), footer "Cookie preferences" re-open event, `lib/analytics.ts` Plausible adapter loads only after analytics consent + configured domain; `track()` no-ops pre-consent.
- **i18n scaffold**: `lib/i18n/*` + `content/i18n.ts` chrome dictionaries (EN complete; sw/fr live for nav/footer keys), `LanguageSelector` (topbar + footer) persisted via `jv-locale`.
- **Auth pass**: shared `AuthShell` (split image card / narrow card), login+signup restyled to tokens with Unsplash panels, forgot/reset restyled; all `useAuth` logic untouched.
- **Chrome fixes**: mobile bottom bar tabs now Home/Pricing/Search/Menu; chatbot FAB lifted above the bar on mobile; `.env.example` documents JIRAVISION_EMAIL_FROM/TEAM_EMAIL/SUPPORT_EMAIL + NEXT_PUBLIC_PLAUSUAL_DOMAIN.
- Verified live: contact/demo/quote/careers submissions stored + success states, honeypot invisible, rate limit 429 after 5/min, confirm token flow pending→confirmed + invalid-token redirect, palette type+Enter navigation, recents persist, `?` help, g p nav, consent save toggles persist, sw locale flips footer labels, drawer→palette, 0 console errors, lint 0 errors, build exit 0.
- **Owner action**: `JIRAVISION_RESEND_API` in `.env.local` returns 401 (invalid key) — forms store fine but team emails don't send until a real Resend key + verified sender domain are configured; Google Maps key still needs revocation (no longer in source).

### V2-3 — homepage → 19 sections with interactive demos (done 2026-10-23)
- **Sprint sandbox** (`components/sections/demo-sandbox.tsx` + `lib/sandbox/plan.ts`): auto-draft (greedy skill-fit, per-ticket rationale), per-person load bars + variance-based team wellbeing meter, "Suggest rebalance" → proposals panel ("nothing applied yet") with per-move Apply/Apply all/Reset. Pure deterministic logic, unit-testable.
- **Gamification playground** (`demo-gamification.tsx` + `lib/gamification/xp.ts`): 8 recognised behaviours → branch XP → 3×3 skill-tree node unlocks + team level; guardrail switches visibly change the demo (team-only off reveals individual standings; opt-in off dims playground + "we don't ship that configuration" note).
- **Workload & equity explorer** (`demo-equity.tsx` + `content/equity-demo.ts`): recharts horizontal bars, 4 metrics (points/review load/after-hours/comp-vs-band), >130%-of-mean watch rules, clay+asterisk flagged bars, team-mean reference line, data-driven "Why this number?" panel (formula/source/guardrail), visible semantic table + aria-live insight.
- **Calculators** (`demo-calculators.tsx` + `lib/calculations/{burnout,roi}.ts`): burnout 5-factor weighted model → score/bands/advice/top-driver; ROI with conservative recovery assumption → savings/cost/net/payback (honest "doesn't pay for itself" branch). Pure functions for V2-6 unit tests.
- **Templates carousel**: `content/templates.ts` (12 NOTE(PLACEHOLDER) templates) + embla carousel with category filter chips + counter.
- **Keyboard-first section**: live "Try the palette"/"Show all shortcuts" buttons dispatch OPEN_SEARCH_EVENT/OPEN_HELP_EVENT (new event in site-search); kbd cheat table.
- **Pricing seat slider** (`pricing-seats.tsx`, replaces static PricingTeaser): seats 5–100, monthly/annual −20% toggle, per-plan totals from new `seatModel` in content/home.ts; inverse band + "$" watermark.
- **Rotation rework**: 19 sections, all variants ≤2 uses, no adjacent repeats (dots,grain,grid,hatch,contour,shapes,band-sage,inverse,band-clay,stacked,…); testimonials→dots, usecases→contour, outcomes→band-sage, faq→hatch, sandbox→contour, equity→band-sage, calculators→grid, keyboard→shapes, templates→stacked.
- Verified live: sandbox draft→propose→apply (overload clears), gamification unlock 0→9 nodes + reset + guardrail reveal, equity tab-switch + why-panel expand, calculator slider→score change (45→42), pricing toggle $86↔$108, palette+help open from section buttons and close clean, 390px no page overflow (equity table in own scroll container), 0 console errors (fixed cmdk aria-describedby warning), lint 0 errors, build exit 0.

### V2-4 — product, pricing, about & solutions pages rebuilt (done 2026-10-23)
- **Page kit** (`components/sections/page-kit.tsx` + `faq-accordion.tsx`): shared PageHero, ProblemSection, FeatureGridSection, SplitFeature, StepsSection, AudienceSection, MethodSection, HonestFitSection, PlanIncludeBand, QuotesSection, UpdatesSection, FaqSection, RelatedSection, CtaSection, PhotoCard — all marketing subpages now compose one editorial system. Hydration fix: hero eyebrow badge wrapper is a `<div>` (Badge is a div; was invalid `<p>` nesting).
- **Product content** (`content/products.ts`): typed copy for all 4 products (hero, problem, features, 3 deep-dives, demo mapping, workflow, audience, honest-fit good/bad, method, placeholder quotes, changelog-matched update titles, 5 FAQs, cross-links).
- **Products rebuilt** (17 sections each, exemplar pattern): ai-scrum-master (SandboxDemo), team-wellbeing (CalculatorsDemo), gamification (GamificationDemo), ethical-metrics (EquityExplorer); old fabricated stats/testimonials/logos removed.
- **Pricing rebuilt** (`content/pricing-page.ts` + `pricing-calculator.tsx` island, 17 sections): live seats slider 5–100 + monthly/annual −20% toggle driving per-plan totals from `seatModel`, ROI cost-vs-time estimator on `lib/calculations/roi.ts` (illustrative-model disclaimer), full feature comparison table, anchor nav to real ids, 8-item pricing FAQ; NOTE(PLACEHOLDER) on proration/taxes/discounts/retention.
- **About rebuilt** (`content/about.ts`, 16 sections): honest origin story (no fake founding dates), values grid, roles-only team section (fake named team members removed), milestones from real changelog, transparency commitments labelled as commitments, "see the receipts" links to /status /changelog /careers.
- **Solutions rebuilt** (`content/solutions.ts`, 4 pages × 17–18 sections): audience-specific copy for agencies/enterprise/remote-teams/startups, product-map band, demos where they fit (equity/calculators/sandbox), enterprise security wording honest ("in progress, not certifications"), placeholders never shown to visitors ("Early-access participant — Role").
- Verified live: all 10 routes 200 with 17–19 sections, 0 dead `href="#"`, 0 visible placeholder leaks, pricing slider 12→13 updates totals, Monthly/Annual toggle recomputes ($94→$117 Starter), plan pill selector + estimator sliders hydrate, 0 console errors on rebuilt pages, filtered tsc clean, lint 0 errors, build exit 0.

### V2-5 — compare pages, migration hub, templates, roadmap/status, FAQ, legal TOC, one-pager (done 2026-10-23)
- **Compare section** (`content/compare.ts` + `/compare` hub + 5 pages, 16 sections each): generic-jira (keep Jira, add intelligence), asana, linear, trello, notion. Semantic comparison tables with "verify current details on their site" note; zero competitor prices/stats/logos; strengths credited honestly. Demos mapped per angle (sandbox/equity/gamification/calculators).
- **Migration hub** (`/migration`, 16 sections): pure plan model (`migration-plan.ts` — hours=(base+perSeat×size)×sourceFactor, labelled illustrative), client planner island (source buttons, team-size slider, attachment/parallel-run switches, 28-item checklist + progress bar, Blob .txt download, localStorage persistence via useSyncExternalStore, no setState-in-effect), field-map/dual-run/rollback/data-handling bands.
- **Template library** (`/templates`, 15 sections): all 12 templates from content/templates.ts, search + category chips + sort, per-template Radix Dialog, working Copy checklist (clipboard → execCommand → manual textarea fallback) and Download .md (Blob), request form POSTing to existing /api/contact with RHF+zod+honeypot.
- **FAQ data-driven** (`content/faq.ts`: 35 entries across Product/Pricing/Migration/Company/Security, de-duplicated from home/products/solutions/pricing/about sources): rebuilt /faq (13 sections) with explorer island (search + category chips + grouped accordion + empty state), `?q=`/`?category=` deep links via Suspense+searchParams; search palette now indexes all 35 questions with deep links.
- **Roadmap** (`/roadmap`, 15 sections): now/next/later with explicit commitment levels (Done=real changelog, In-progress=actual V2-5/V2-6 scope, Later=NOTE(PLACEHOLDER) exploratory), refusal-list "never on this roadmap" band, priority process section.
- **Status upgraded** (`/status`, 10 sections + extended content/status.ts): per-component manifest table, honest email-delivery "degraded until owner configures Resend key", derived overallStatus ("Core systems normal; email delivery degraded") flows to footer chip, process-not-history incident wording, original "automated checks on the roadmap" caveat preserved; consumers (footer/contact) keep compiling.
- **Legal pages** (`content/legal.ts` + `components/sections/legal-doc.tsx`): terms/privacy/cookies/legal-notice/accessibility rebuilt with sticky numbered TOC (all anchors verified to resolve), verbatim-preserved legal text, print button (`components/features/print-button.tsx`), cross-doc links, back-to-top.
- **Printable one-pager** (`/one-pager` + `content/one-pagers.ts`): self-contained white card, real seatModel facts, ethical-stance summary linking /products/ethical-metrics, print: utilities only, Print/Save-as-PDF button.
- **Chrome wiring**: nav Resources now includes Templates/Compare/Migration hub/Roadmap; footer Product+Resources columns and menuFeatures.Resources updated; search index gained one-pager + auto-derived FAQ entries. Dead Unsplash ids found in site.ts (3 of 4 new probes 404'd) — replaced with verified ids; remaining legacy dead ids to sweep in V2-6.
- Verified live: all 17 touched/new routes 200 (compare×6, migration, templates, faq, roadmap, status, one-pager, legal×5), 0 dead `href="#"`, 0 visible PLACEHOLDER leaks; migration planner source-switch rewrites plan + checkbox→progress bar; templates search 12→1 + empty state + dialog Copy→"Copied"; /faq?q=burnout pre-fills; all /terms TOC anchors resolve; 0 console errors on spot-checked pages; lint 0 errors; build exit 0.

### V2-6 — tests, QA, SEO, cleanup, deliverable docs (done 2026-10-24)
- **Unit tests** (vitest, `tests/unit/*` — 61 tests over the six pure models): burnout bands/weights/clamp/top-driver, ROI maths incl. "doesn't pay for itself" branch + formatUsd, sandbox draft/loads/wellbeing/rebalance (no ticket loss), gamification XP thresholds/level interpolation/member attribution, migration plan formula vs content tables + checklist determinism/disclaimer, search-index integrity (all hrefs start with `/`, FAQ ≥30 deep links).
- **E2E smoke** (`playwright.config.ts` + `tests/e2e/smoke.spec.ts`, 7 scenarios, reuses dev server on :3000): homepage section stack + zero console errors, pricing billing toggle + seats slider maths, /faq?q= prefill + empty state, migration planner source-switch rewrites totals + checklist .txt download filename, templates search narrowing + empty state, Cmd+K palette open/search/Esc, compare/asana + one-pager render clean.
- **SEO**: `app/sitemap.ts` (~33 marketing routes, auth excluded, changelog-driven lastModified), `app/robots.ts` (disallow /api, /dashboard, auth pages; sitemap link), root metadata: metadataBase, title template, OpenGraph block; generateMetadata added to the four resources index pages. Both endpoints verified 200 with expected bodies.
- **QA sweep**: dead `href="#"` count now 0 site-wide (removed four dead download buttons + fake like/comment/share bar from the legacy webinar detail page; replaced fabricated "Additional Resources" links with an honest contact-form note); every internal href in all content files curl-verified 200; all `<Image>`/`<img>` in marketing code carry alt; lint 0 errors; filtered tsc clean for new files; chromium-1248 installed for Playwright.
- **Honesty fix**: homepage testimonials no longer render "PLACEHOLDER — Role" names (→ "Early-access participant — Role") + disclaimer line under the grid.
- **Docs**: `DESIGN_SYSTEM.md`, `FEATURES.md`, `PLACEHOLDERS.md` (all NOTE(PLACEHOLDER) inventories + owner-decision list) at repo root.
- **Verified**: `npm test` 61/61 (8 files, 0.2s); `npm run test:e2e` 7/7 scenarios (7.3s against dev server, chromium channel build); route sweep — every internal href in every content file + all nav/footer links 200; `href="#"` count 0; sitemap.xml/robots.txt 200 with expected bodies; build exit 0 (all marketing routes static); lint 0 errors; playwright artifacts gitignored.
- **Known gaps for owner**: legacy /resources detail pages (blog/case-studies/webinars/documentation) still contain v0-fabricated entries, transcript text and slide images — launch decision (rewrite with real content or noindex); Fraunces `axis:` next/font option is a tolerated tsc quirk (runtime works, `axes:` breaks the build); "powered by IBM Granite" remains in the root metadata description — confirm the claim is accurate or drop it; fit-quiz page promised in the v2 brief was never scoped in; form rate limit ships at 3/min default vs 5/min in brief.

### V2-7 — "find your fit" quiz + rate-limit alignment (done 2026-10-24)
- **/fit-quiz** (`content/fit-quiz.ts` + `app/(marketing)/fit-quiz/{page.tsx,fit-quiz.tsx,fit-model.ts}`, 15 sections): six-question quiz with fully published scoring weights table, two veto answers (per-person rankings → standing refusal; "nothing hurts" → talk-you-out-of-it verdict), bands 13+/9–12/≤8, caveat engine (enterprise size, non-Jira base, attachments, consent-boundary) and personalised CTAs driven by the "what hurts" answer; answers persist in localStorage via useSyncExternalStore — no submission endpoint, nothing leaves the browser.
- **Wiring**: nav Resources card + footer Resources column + search index (via resourceItems) + sitemap entry; unverified hash anchors avoided (`/pricing`, `/roadmap` plain).
- **Forms**: `formRoute` default rate limit raised 3→5/min to match the v2 brief (careers keeps its explicit 2/min).
- Verified: 15 new unit tests (76 total green), 8/8 Playwright smoke scenarios green incl. new fit-quiz flow (six clicks → "Strong fit" + Deep-dive CTA + restart), /fit-quiz 200, sitemap 37 URLs, filtered tsc clean on all touched files.

---

## V3 — Dashboard product build + realtime + super-admin CMS (brief 2026-10-24)

Owner brief: every user gets ≥15 relevant dashboard pages; the main dashboard has ≥15 sections
(cards, filters, graphs, modals, grid/list view and the standard component kit); every other
dashboard page has 10–14 relevant sections; all dashboard pages do real CRUD through functional
APIs; modern dashboard layout; every mutation API wired to the notification system and realtime;
a super-admin CMS page that can edit every section of every landing page.

Inventory findings this build (what already exists):
- 16 dashboard routes (main, ai-scrum-master, analytics, billing+settings, calendar, chat, email,
  ethical-metrics, gamification (+7 subpages), integrations, kanban, settings, sprints, tasks,
  team(+settings), team-wellbeing).
- ~60 API routes; drizzle Postgres (Neon) with 26 tables incl. `users.role` (default "user") and
  `notifications` (userId/type/title/body/isRead/metadata).
- Realtime today is dead code: socket.io lived in `server/websocket.ts` + `lib/websocket-manager.ts`
  but `npm run dev/start` never booted a custom server, and Vercel (the deploy target) cannot host a
  persistent socket server. → Realtime ships as SSE + polling fallback, DB as source of truth.
  **Resolved 2026-10-25**: the whole socket.io layer was deleted (server.js, lib/websocket-manager.js,
  both `socket.io*` deps, the `dev:socket`/`start:socket` scripts and the two socket env vars).
- Bell dropdown in the shell is hardcoded fake notifications; `app/api/chat/notifications` uses a
  hardcoded userId=1. recharts 2.15.0 available. Middleware protects /dashboard via session cookies.

Phases (report after each; commit+push on every change set):

### V3-1 — Foundation: session/role helpers, notification system, realtime transport, modern shell
- `lib/session.ts`: getCurrentUser()/requireUser() usable from route handlers (cookie→user, 401/403),
  isAdmin() = DB role admin/superadmin OR ADMIN_EMAILS env (bootstrap; documented in .env.example).
- `lib/notifications.ts`: createNotification() → insert + broadcast; notifyMany; used by every CRUD API.
- `lib/realtime.ts` + `/api/events/stream`: SSE endpoint (auth-gated, per-user stream, heartbeat,
  clean cancel) + in-process bus; `lib/realtime-client.ts` subscribes and auto-falls back to
  /api/notifications?since= polling on Vercel/serverless where long streams can't live.
- `/api/notifications` CRUD: GET list+unreadCount (+since), POST create (self or admin→user),
  PATCH read flags, DELETE. Fixes hardcoded userId=1 pattern.
- Shell rework (components/dashboard-layout.tsx): grouped modern sidebar, real NotificationsBell
  replacing the fake array, user menu with real session, mobile drawer, search entry.

### V3-2 — Main dashboard: ≥15 sections, grid/list, filters, modals, graphs
- One page, 15 sections: header+quick actions, filter bar (range/project/priority/type/view),
  KPI cards ×6, sprint status cards, my-work table (grid|list toggle, sort, inline actions),
  team capacity, burndown (recharts), velocity chart, wellbeing trend, gamification leaderboard,
  AI insights, activity feed (real), notifications feed, agenda, storage/integrations health.
- Modals: new task, new sprint, task detail (edit = real CRUD), confirm-delete.
- All data from the drizzle APIs (tasks/sprints/wellbeing/gamification/aiInsights), never mock.

### V3-3 — Elevate existing 16 pages to 10–14 sections + full CRUD wiring
- Per page: section stack (summary cards, filters, table/graph views, detail drawer/modal,
  activity, settings, empty/loading/error states) and CRUD against new+existing APIs.
- Every mutation route calls createNotification() → realtime to affected users.

### V3-4 — New pages so every user has ≥15 product pages
- /dashboard/backlog, /dashboard/retros, /dashboard/goals (OKR), /dashboard/reports,
  /dashboard/activity, /dashboard/automation-rules (each 10–14 sections, CRUD, notifications).

### V3-5 — Super-admin CMS for landing content
- `lib/cms/registry.ts` (pageId → default content objects from content/*.ts), `cms_overrides`
  table (pageId, sectionKey, path, value, published) + merge helper `withOverrides(pageId, obj)`.
- Marketing pages switch defaults through the loader (static file stays the fallback → SSR-safe,
  no behavior change until edited). `/admin/cms` (role-gated): page list → section list → field
  editor (text/textarea/list/image-url) + preview link + publish/unpublish + restore default.
- `/api/admin/cms` CRUD, validation, notifications on publish events kept in-app.

### V3-6 — Tests, QA, docs
- Unit: session/admin logic, notifications service, CMS merge; e2e: bell realtime, main dashboard
  CRUD round-trip, grid/list+filters, CMS edit → public page change. Playwright + vitest green,
  lint+build green, FEATURES/PLACEHOLDERS/DESIGN_SYSTEM updated.

### V3 feature bar — competitive parity + advantage (owner add-on 2026-10-24)
Owner requirement: the webapp must have all modern PM-tool features and more than rivals
(Jira, Linear, Asana, ClickUp, monday.com). Mapped into phases:
- Parity (must-haves rivals all ship): command palette + keyboard shortcuts in-app, drag-and-drop
  kanban, saved views/filters, bulk task edit/delete, Gantt/timeline view, retrospectives, OKR
  goals, backlog management with prioritization, report export (CSV + printable PDF), full-text
  search over tasks/sprints/docs, mobile-usable responsive shell, dark mode, @mentions + comments,
  audit/activity log, templates, sprint reports.
- Advantages (things rivals do NOT ship): team wellbeing telemetry with burnout bands, ethical
  AI metrics + fairness refusals (per-person ranking refusal), gamification without per-person
  rankings, AI Scrum Master drafts that require human approval before touching Jira,
  read-only-on-top-of-Jira architecture (never copies attachments/history), realtime live queries
  (Neon Realtime) instead of page refreshes, super-admin landing CMS, transparent pricing maths +
  fit quiz that can refuse your money.
Phase owners: parity items land inside V3-2/V3-3/V3-4; advantages are already designed and get
wired to real data in V3-3.
