# JiraVision Placeholders — Owner Action List

Source: repo-wide grep for `NOTE(PLACEHOLDER)` (plus one `TODO(owner)`), cross-checked against
REDESIGN_PLAN phase notes and a manual audit of un-flagged legacy content. Severity:
**blocks launch** = false/unverified claim or broken flow visible to visitors;
**nice-to-have** = honest but suboptimal; **copy-only** = wording/date polish, gated honestly.

`components/sections/legal-doc.tsx:88` and `app/(marketing)/one-pager/page.tsx:20` also match the
grep but are pointer comments to the real entries below — no separate action. `REDESIGN_PLAN.md`
hits (lines 230–266) are the plan's own log, not code.

## 1. Email & forms

| Where | What must be confirmed/replaced | Severity |
|---|---|---|
| `JIRAVISION_RESEND_API` in `.env.local` (REDESIGN_PLAN V2-2 owner action; `/status` publishes "email delivery degraded") | Invalid key returns 401. Forms store fine but team notification + newsletter confirm emails do not send. Provide valid Resend key + verified sender domain (`lib/email.ts`; fallback from is `onboarding@resend.dev` — must not ship) | blocks launch |
| `content/site.ts:239` (`contactDetails`) | `sales@` / `partners@` mailboxes, phone/WhatsApp and hours inherited from v0, unconfirmed — owner to verify or correct | blocks launch |
| `content/careers.ts:2` (`jobOpenings`) | Openings inherited from v0 are illustrative. Confirm which roles are genuinely open + real descriptions before public careers page | blocks launch |
| `content/home.ts:262` pricing teaser ("owner: confirm current prices before launch") and `seatModel` ($9/$19/$49, 14-day trial, 20% annual) | Confirm actual prices/trial/discount everywhere they render (home, /pricing, /one-pager) | blocks launch |
| `content/about.ts:150` | Team section says "named profiles coming soon" — real names/headcount pending owner input | copy-only |

## 2. Legal

| Where | What must be confirmed/replaced | Severity |
|---|---|---|
| `content/legal.ts:31` `legalLastReviewed = "May 1, 2025"` | Placeholder carried over from v0 copy. Confirm the real review date; renders on legal pages (comment at `legal-doc.tsx:88`) | blocks launch |
| `content/one-pagers.ts:3,10` `onePagerBuildDate = "October 2026"` | Manual stamp; update before circulating printed/PDF copies | copy-only |
| `content/pricing-page.ts:328` | Enterprise document set (security questionnaire, DPA) unconfirmed — align wording with what actually exists | nice-to-have |

## 3. Content

| Where | What must be confirmed/replaced | Severity |
|---|---|---|
| Example quotes → permissioned testimonials: `content/products.ts:175,297,419,541`; `content/solutions.ts:219,402,585,767`; `content/compare.ts:220,402,584,764,942`; `content/migration.ts:566`; `content/pricing-page.ts:361` | All render honestly as "Early-access participant — Role" with a "published only with permission" disclaimer. Replace with permissioned testimonials when available; nothing misleading ships meanwhile | copy-only |
| `content/templates.ts:1` — all 12 templates | Proposed starters; none "ship" as product features until owner confirms | nice-to-have |
| `content/pricing-page.ts:193` proration, `:205` + `:420` VAT/sales tax, `:212` billing provider/payment options, `:269` invoicing granularity, `:309` discount percentages/eligibility, `:316` OSS program, `:398` post-cancellation data retention | Each is unconfirmed mechanics/claims on the pricing page; confirm with billing reality or keep the current hedged FAQ wording. The −20% annual and seat math itself are also pending (#1) | blocks launch (billing claims) |
| `content/roadmap.ts:157,161,166,171,176,181` — Later items (GitLab, Slack, Teams, Calendar, hosted data layer) | Framing is exploratory-by-design; keep framing, add dates only when real | copy-only |
| `content/status.ts:14` `statusUpdatedAt` | Manual review timestamp; becomes machine-generated once automated checks exist | nice-to-have |
| `content/compare.ts:1` header | Competitor positions checked against public materials at authoring time only — re-verify each row on vendor sites before any public push | nice-to-have |
| `content/about.ts:2,30,54,132,253` | Origin-story details, first-team facts, cadence specifics, investment/ownership: unconfirmed items kept generic-true; publish facts only when owner verifies | copy-only |
| `content/migration.ts:9,58,204,454` | Hour model weights, factor tables, attachment/export ceilings are working models, not measured — labelled illustrative in UI; validate or keep labels | nice-to-have |
| `content/site.ts:219-220` `socialLinks = []` (`TODO(owner)`) | Per decision D5 social row is hidden until real profile URLs are provided | nice-to-have |
| `content/products.ts:3`, `content/solutions.ts:3` headers | Standing honesty rules, no action beyond keeping them | copy-only |

## 4. Un-flagged fabricated content (audit findings — worse than the marked items)

| Where | Problem | Severity |
|---|---|---|
| ~~`app/(marketing)/resources/case-studies/page.tsx` and `[slug]/page.tsx`~~ — **RESOLVED 2026-10-24** | The invented companies, stats ("ACME Corp +35%", "95% sprint completion, up from 72%", "TechNova +45%") and quoted people are gone. `content/case-studies.ts` now publishes the same three slugs as clearly-labelled illustrative scenarios (fictitious Acme/GlobalTech/StartupX) with a visible banner, ordered setup steps that link to real routes, and measures that state where each number is computed instead of asserting a result. A `customer` field is reserved for a real permissioned reference — **owner task: supply one, or leave the scenarios as they are** | copy-only |
| ~~`app/(marketing)/resources/webinars/page.tsx`, `[slug]/page.tsx`~~ — **RESOLVED 2026-10-24** | Fabricated speakers/attendees and the Rickroll video embed are gone. `content/webinars.ts` keeps the three public slugs as session outlines with no recording claimed; the detail page renders a "No recording published" note unless a `videoUrl` is added. **Owner task: supply recordings or leave the outlines** | copy-only |
| `app/(marketing)/resources/blog/[slug]/page.tsx:28,67-68,97`, `blog/page.tsx:92`, `blog/ai-scrum-master-guide/page.tsx:175` | Fake authors (Sarah Johnson, Michael Chen) and fabricated stats ("40% reduction in admin time", "30% estimation accuracy") | blocks launch |
| `content/home.ts:233-258` → `components/sections/testimonials.tsx` | Homepage testimonials use names `"PLACEHOLDER — Engineering manager"` etc. — the literal word PLACEHOLDER renders to visitors. (The `Outcomes` stat row at `home.ts:226-230` IS gated honestly per `home-misc.tsx:128`; the Testimonials section is not) | blocks launch |

## 5. Security

| Where | What must be confirmed/replaced | Severity |
|---|---|---|
| Google Maps key (REDESIGN_PLAN §1.7 + D4 + V2-2 owner action) | Leaked v0 key removed from source (Phase 0); map now reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`components/google-map.tsx:14`) and hides without it. **Revocation/rotation in Google Cloud Console is an owner task and is NOT confirmed done** — old key must be assumed live until revoked. Add referrer restrictions on the new key | blocks launch |

## 6. Launch checklist (must-do before public launch)

1. Revoke the old Google Maps API key; issue a restricted key via env var.
2. Configure valid `JIRAVISION_RESEND_API` + `JIRAVISION_EMAIL_FROM` (verified sender domain); flip the `/status` email row from degraded.
3. Confirm/correct contact mailboxes, phone/WhatsApp and hours in `content/site.ts`.
4. Confirm real prices/trial/annual discount (`content/home.ts` + `content/pricing-page.ts`) or soften claims; resolve proration/tax/discount FAQ hedges with billing reality.
5. Set the true `legalLastReviewed` date (and per-doc review status) in `content/legal.ts`.
6. ~~Delete or rewrite the legacy `/resources` case-studies, webinars and blog pages~~ — case-studies and webinars were **rewritten 2026-10-24** (see §4) and documentation was replaced with a real 29-doc catalogue (2026-10-23). **Still open: `blog/[slug]/page.tsx` fake authors and fabricated stats** (row 3 above). To publish a real case study, add `customer: { name, url? }` to an entry in `content/case-studies.ts` — the reader only shows attribution when that field is present, and `tests/unit/case-studies.test.ts` fails if any entry claims a customer without one.
7. Homepage testimonial names relabeled to "Early-access participant — Role" (`content/home.ts`, `content/products.ts`, `content/solutions.ts`); still need real permissioned quotes to replace them. Fit-quiz verdict CTAs (`content/fit-quiz.ts`) carry `NOTE(PLACEHOLDER)` — revisit if plan gating (trial length, enterprise-only features) changes.
8. Confirm careers openings (`content/careers.ts`) or unpublish the board's role list.
9. Verify the 12 template definitions (`content/templates.ts`) before promoting the library as usable.
10. Re-verify compare-page rows against vendor sites (`content/compare.ts` header rule).
11. Update `onePagerBuildDate` before circulating print/PDF; refresh `statusUpdatedAt` after the final review pass.
12. (Ops, not placeholder but launch-relevant from FEATURES.md: hosted data persistence for form submissions before real traffic, and V2-6b SEO items — sitemap/robots/metadata.)
