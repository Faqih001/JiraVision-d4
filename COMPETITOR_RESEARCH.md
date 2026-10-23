# Competitor Research — JiraVision Redesign v2

Compiled 2026-10-23 from working knowledge of the five public marketing sites (Linear, Asana, monday.com, ClickUp, Atlassian Jira). No text, imagery or brand assets are copied from any competitor — only structural and interaction patterns are noted for re-expression in JiraVision's own design language.

---

## 1. Linear (linear.app)

**Site map / nav structure**
- Header: sparse — Product (single dropdown of feature areas), Customers, Now (events/initiatives), Pricing, Contact, Changelog; Log in + "Talk to us"/sign-up on the right.
- Nav is famously minimal: one-level dropdowns, no mega-menu sprawl. Deep content lives in /changelog, /now, method articles and docs.
- Footer: compact link grid (Product, Company, Resources, Legal) + a now-legendary oversized wordmark treatment.

**Homepage section order (typical, 2025-era)**
1. Hero: one-sentence positioning + a real product screenshot/video that IS the demo
2. Rapid feature montage (issue creation, cycles, roadmap) — motion-driven
3. "Why Linear" philosophy section (speed, craft, opinionated defaults)
4. Customer logos (real customers only)
5. Feature deep-dives alternating with visuals
6. Changelog/"built for speed" credibility strip
7. Minimal final CTA

**Patterns worth borrowing**
- Product-as-hero: the demo carries the pitch; copy stays short.
- Keyboard-first identity: Cmd+K palette showcased on the marketing site itself; "made for people who ship" tone.
- Changelog as a design asset: clean timeline, version tags, dated entries.
- Understated nav with hover-intent-safe dropdowns.

**What it does badly**
- Almost no pricing detail (enterprise = "contact us" wall); gated content; thin resources for mid-market buyers; single-column opinions can read as arrogance for non-engineer personas (people ops, execs).

---

## 2. Asana (asana.com)

**Site map / nav structure**
- Mega-menus grouped by **Use case / Role / Team size / Industry** ("Marketing", "IT", "Operations", "Enterprise", "SMB") — heavy segmentation.
- Resources: insights, templates gallery, developer docs, community, help center.
- Strong solutions-by-role IA; pricing has a slider for seats.

**Homepage section order**
1. Hero: outcome headline + product visual + dual CTA (try / watch demo)
2. Logos strip (real enterprise customers)
3. Feature tour sections with screenshots
4. "Work with AI" (AI Studio) block
5. Templates/resources cross-link
6. Stats/impact claims
7. Testimonial carousel
8. CTA band

**Patterns worth borrowing**
- Role-based tabs / "for you" segmentation on the homepage (maps directly to v2 §3.10).
- Seat-count slider with live price on pricing.
- Templates gallery as a top-of-funnel magnet with preview modals.

**What it does badly**
- Nav is cluttered (4-level mega-menu); homepage is long and generic-feeling; gradient/bright illustration style ages poorly; vague "productivity" claims; multiple CTAs compete.

---

## 3. monday.com

**Site map / nav structure**
- Product dropdown lists "products" (Work Management, CRM, Dev, Service) — product-suite IA.
- Solutions by team + industry; Resources includes a large template center and blog.
- Aggressive conversion chrome: sticky CTAs, chat widgets, promo bars.

**Homepage section order**
1. Hero with product UI on a dashboard mock + "Get Started" repeated
2. Logo bar (very long)
3. "One platform" module grid
4. Use-case carousels
5. AI features block
6. Reviews/ratings wall (G2/Capterra badges)
7. Pricing teaser with per-seat calculator
8. FAQ + CTA

**Patterns worth borrowing**
- Per-seat pricing calculator with immediate numbers.
- Ratings/reviews as third-party proof (only real badges allowed for us).
- Module grid showing platform breadth in one screen.

**What it does badly**
- Loud, saturated visual identity; conversion pressure everywhere (popups, chat, countdowns); long logo bars of questionable relevance; copy is salesy and vague; accessibility is weak in places (thin contrast on colored chips).

---

## 4. ClickUp (clickup.com)

**Site map / nav structure**
- "The Platform" mega-menu of features; Solutions by team; Resources is enormous (blog, templates, webinars, productivity guide, developer docs).
- Comparison pages ("ClickUp vs Jira/Asana/monday") are a dedicated content cluster with SEO intent.
- Changelog + "What's new" release notes hub.

**Homepage section order**
1. Hero: "One app to replace them all" + product video
2. Feature matrix blocks (tasks, docs, goals, chat) with screenshots
3. AI (Brain) section
4. Templates gallery strip
5. Customer stories + numbers
6. Comparison cross-links
7. Pricing teaser, FAQ, CTA

**Patterns worth borrowing**
- **Comparison pages as a content system** (/vs-jira etc.) — factual feature matrices, "best for" guidance (v2 §3.8).
- Template library depth with filterable categories.
- Changelog with category filters.

**What it does badly**
- Overstuffed feature lists; "everything" positioning dilutes trust; heavy gradients/bright purple AI styling; slow, asset-heavy pages; claims ("save 20+ hours/week") that are unverifiable — exactly what our brief forbids.

---

## 5. Atlassian Jira (atlassian.com/software/jira)

**Site map / nav structure**
- Enterprise-scale IA: Product / Solutions by use case + industry + team / Learn (docs, community, university) / Why Jira / Pricing / Enterprise.
- Trust infrastructure is huge: security/compliance center, data privacy page, status page, transparency reports.
- Templates + migration guides ("Switch to Jira") content hubs.

**Homepage section order**
1. Hero: project management positioning + product shot
2. Use-case cards (software, IT, service, marketing)
3. AI (Atlassian Intelligence / Rovo) block
4. Customer stories
5. "Built for every team" expansion
6. Free trial CTA + pricing link

**Patterns worth borrowing**
- Trust/security center as a first-class page (maps to our Responsible-AI transparency center, v2 §3.6).
- Migration guide hub with step checklists.
- Status page discipline ("All systems normal" chip in the topbar).
- Roadmap page with public voting.

**What it does badly**
- Corporate and cluttered; navigation overwhelming; generic stocky imagery; performance-heavy pages; pricing sprawl across products; the very "config-heavy, plan-by-gut" experience we position against.

---

## Borrow / Improve / Avoid

| # | Pattern (source) | Verdict | How JiraVision expresses it |
|---|---|---|---|
| 1 | Product-as-hero demo (Linear) | **Borrow** | Interactive sprint-board sandbox with AI rebalance + wellbeing meter, built in our palette, clearly labelled demo |
| 2 | Keyboard-first showcase (Linear) | **Borrow** | Cmd/Ctrl+K site palette, `g`-prefixed nav shortcuts, `?` help modal |
| 3 | Changelog as design asset (Linear, ClickUp) | **Borrow** | /changelog timeline, version tags, category filter, data-driven |
| 4 | Role-based tabs / segmentation (Asana) | **Borrow** | Use-case tabs (Eng lead / People ops / Exec) + "Find your fit" quiz personalising CTAs |
| 5 | Seat slider w/ live price (Asana, monday) | **Borrow** | Pricing page + homepage teaser slider, assumptions shown |
| 6 | Template gallery w/ preview modal (Asana, ClickUp) | **Borrow** | 12–20 filterable templates, "Use this template" → signup preselect |
| 7 | Comparison page cluster (ClickUp) | **Borrow** | /compare/* pages: factual, sourced, dated, feature matrix, "best for" — no disparagement |
| 8 | Trust/security center (Jira) | **Improve** | Responsible-AI transparency center *plus* an interactive "why did the AI suggest this?" explainer — competitors explain nothing |
| 9 | Migration hub + checklists (Jira) | **Improve** | Per-competitor migration guides with locally-saved checklist progress |
| 10 | Public roadmap w/ voting (Jira) | **Borrow** | /roadmap data-driven, vote state local until backend exists |
| 11 | Status chip in topbar (Jira) | **Borrow** | "All systems normal" → /status, data-driven |
| 12 | Third-party ratings wall (monday) | **Avoid for now** | We have no real reviews yet; adding fake/absent badges breaks the no-fabrication rule. Revisit when real |
| 13 | Long logo bars (monday, Asana) | **Avoid** | Replaced by honest "Built on / Works with" strip (already live) |
| 14 | Conversion-pressure chrome: popups, chat spam, countdowns (monday) | **Avoid** | One dismissible announcement + calm assistant only |
| 15 | Bright gradients / AI-glow styling (ClickUp, monday) | **Avoid** | Muted earthy tokens only — enforced by design system |
| 16 | "Everything app" feature sprawl (ClickUp) | **Avoid** | Four pillars, stated plainly; no laundry lists |
| 17 | 4-level mega-menu clutter (Asana, Jira) | **Improve** | Two-column mega-menus with one featured card each; everything else in the footer grid |
| 18 | Contact-us pricing walls (Linear) | **Avoid** | Transparent prices (placeholder-flagged until owner confirms) |
| 19 | Vague productivity stats (all five) | **Avoid** | Qualitative outcomes + PLACEHOLDER stats until verified — our differentiator is honesty |
| 20 | Stocky photography (Jira, Asana) | **Avoid** | Code-built mockups + curated relevant Unsplash per owner direction (D3) |

## Where competitors are weak — our hero territory
1. **Wellbeing-aware planning** — none of the five treat burnout as a first-class planning input. → Sandbox wellbeing meter, burnout risk calculator.
2. **Ethical/fairness metrics with visible methodology** — Jira's metrics are leaderboards; nobody shows the formula. → Equity explorer + "method" chips on every metric.
3. **Explainable AI** — Rovo/Atlassian Intelligence and ClickUp Brain are black boxes in marketing. → "Why this suggestion?" explainer as a real interaction.
4. **Calm credibility** — every competitor site shouts. Quiet, editorial, placeholder-honest is itself a differentiator.

---
*Owner note: statements above describe competitors' public marketing patterns as known in 2025–2026 and are for internal design reference only; verify before quoting externally. Comparison pages (v2 §3.8) must be re-verified and dated at publish time.*
