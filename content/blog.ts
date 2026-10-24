// The single blog catalogue for /resources/blog.
// Both the index page and the [slug] reader import from here, so an index card
// can never point at a post that does not exist.
//
// NOTE(PLACEHOLDER): the previous version of these pages credited four invented
// people (Sarah Johnson, Michael Chen, Jessica Taylor, David Wilson) with stock
// portrait photos, published invented dates, invented per-category article
// counts, and a "Real-World Impact" list of percentages ("40% reduction in
// administrative time", "30% improvement in estimation accuracy") that nothing
// in this repo measures. All of that is gone. Articles are credited to the
// JiraVision team, carry the date this version shipped, and quote no result
// figures — where a number matters, the article names the page you can compute
// it on yourself. Reading time is derived from the word count rather than
// stated.
//
// When the owner wants a named author, add `author` to the post and the reader
// will show it with the attribution.

import { wordCount } from "@/lib/markdown-lite"

export type BlogCategoryId =
  | "ai-scrum-master"
  | "team-wellbeing"
  | "gamification"
  | "ethical-ai"

export type BlogCategory = {
  id: BlogCategoryId
  title: string
  description: string
  /** lucide icon name, resolved by the index page */
  icon: string
}

export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  category: BlogCategoryId
  /** ISO date — the date this version of the article shipped. */
  publishedOn: string
  /** markdown-lite: `#`/`##`/`###` headings, `- ` bullets, `1.` steps, blank lines */
  content: string
  /** Unsplash photo id already verified elsewhere on this site. */
  image: string
  imageAlt: string
  /** slugs in content/documentation.ts — verified by tests/unit/blog.test.ts */
  relatedDocs: string[]
  relatedProduct?: string
  /** signed-in route the article points at */
  demoRoute?: string
  /** Shown large at the top of the index. One post only. */
  featured?: boolean
  /** Present only when the owner has confirmed a real named author. */
  author?: { name: string; role: string }
}

export const blogCategories: BlogCategory[] = [
  {
    id: "ai-scrum-master",
    title: "AI Scrum Master",
    description: "Where the draft comes from, what the rationale says, what it refuses to do",
    icon: "Bot",
  },
  {
    id: "team-wellbeing",
    title: "Team Wellbeing",
    description: "Load, check-ins and the burnout signals worth acting on",
    icon: "HeartPulse",
  },
  {
    id: "gamification",
    title: "Gamification",
    description: "Points, streaks and recognition that do not backfire",
    icon: "Trophy",
  },
  {
    id: "ethical-ai",
    title: "Ethical AI",
    description: "Explainability, override paths and the metrics we will not build",
    icon: "ShieldCheck",
  },
]

/** Index filter chip value. */
export type BlogFilter = BlogCategoryId | "all"

export const blogPosts: Record<string, BlogPost> = {
  "ai-scrum-master-guide": {
    slug: "ai-scrum-master-guide",
    title: "The complete guide to AI Scrum Masters",
    excerpt:
      "What an AI Scrum Master actually does: where the draft comes from, what the rationale contains, and why nothing reaches your board until a person accepts it.",
    category: "ai-scrum-master",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1170&auto=format&fit=crop",
    imageAlt: "A team working through a plan together at a shared table",
    featured: true,
    relatedDocs: ["ai-scrum-master-guide", "sprints-and-goals", "metrics-guide"],
    relatedProduct: "/products/ai-scrum-master",
    demoRoute: "/dashboard/ai-scrum-master",
    content: `
# The complete guide to AI Scrum Masters

An AI Scrum Master is not a chatbot with a sprint calendar. In JiraVision it is a recommendation
engine with an approval gate: it reads the same task rows you can see on the board, produces a
draft plan with a written reason for every item, and then waits. Nothing is written to your sprint
until a person accepts it.

This guide covers what the draft reads, what the rationale contains, how acceptance works, and
where the feature stops on purpose.

## What the draft reads

The draft plan is built from four inputs, every one of which is visible somewhere in the
workspace:

- Open load per member — each task assigned to them that is not done, with its story points.
- History — points completed in recent sprints, used as a capacity ceiling rather than a target.
- Calendar pressure — meetings and time off in the next seven days, which reduce available hours.
- Skills — the skill tags recorded on each member, so work is not handed to the only person who
  has never done it.

Nothing here is inferred from chat content or from activity telemetry. If a signal is not already
a row in your workspace, the model does not use it.

## The rationale is the point

Every suggested task carries a plain-language reason: why this person, why this sprint, what
capacity assumption it rests on. That is a deliberate choice, for two reasons.

1. You can disagree with the reasoning instead of guessing at it. A recommendation that reads
   "assigned to Sam because Sam holds the payments skill tag and has 8 open points" can be
   checked against reality in a few seconds.
2. The reason is stored with the record. Looking back at a finished sprint, the accepted draft
   still explains itself rather than presenting as a decision nobody made.

A score without a reason invites two bad responses — ignoring it entirely, or deferring to it
uncritically. Both are worse than not having the feature.

## Accept, edit or dismiss

Accepting a draft writes through the ordinary task and sprint endpoints. That matters more than
it sounds: the same notifications fire, the same activity entries are written and the same
validation runs as if you had made the change by hand. There is no privileged write path for the
model.

Dismissing works the same way in reverse. A dismissed recommendation moves to an archive that
keeps the reason you gave, so a pattern of dismissals stays visible later instead of
disappearing.

Re-drafting mid-sprint is allowed, and it names what slips. Accept a revised plan in week two and
the draft tells you which committed items no longer fit and why, rather than quietly
re-planning around them.

## What it watches

Three views sit alongside the draft, all computed from task rows:

- Sprint health — a gauge over completion, scope change and blocker age.
- Burndown — the actual line, the ideal line, and a projection derived from the current
  completion rate.
- Velocity forecast — the next sprint's likely capacity, from recent completed points.

Each one prints its own formula in the ethical metrics documentation. If a number cannot show you
how it was produced, it does not belong on the page.

## What it refuses to do

These refusals are product decisions, not gaps in a roadmap:

- No per-person productivity ranking. Load is shown so work can be moved, not so people can be
  ordered.
- No keyboard time, no idle detection, no commit-count scoring. Motion is not value.
- No automatic acceptance. There is no setting that lets a draft write to a sprint unattended.
- No sentiment inference from chat used as a performance input.

## Rolling it out

1. Turn it on for one team, for one sprint. Read the draft before accepting and note where the
   reasoning is wrong — that is the useful signal, not a bug report to file and forget.
2. Check the capacity ceiling against reality. If history says 40 points and the team finishes
   28, the draft will keep over-committing until the input is corrected.
3. Dismiss out loud. Use the archive reason field; the pattern is what tells you whether the
   skill tags or the load data need fixing.
4. Only then widen it. A second team is a different capacity profile and a different history,
   and the draft should be re-read there too.

## Where to go next

The AI Scrum Master documentation lists every endpoint and field. The metrics guide explains the
formulas behind the health gauge and the forecast. And if you would rather see it move, the
dashboard page runs against your own tasks.
`,
  },

  "ai-transforming-agile": {
    slug: "ai-transforming-agile",
    title: "How AI changes the agile routine",
    excerpt:
      "The ceremonies an AI assistant genuinely improves, the ones it leaves alone, and the five numbers worth measuring in your own workspace instead of trusting ours.",
    category: "ai-scrum-master",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1170&auto=format&fit=crop",
    imageAlt: "Two people reviewing work on a laptop screen",
    relatedDocs: ["ai-scrum-master-guide", "sprints-and-goals", "dashboards"],
    relatedProduct: "/products/ai-scrum-master",
    demoRoute: "/dashboard/sprints",
    content: `
# How AI changes the agile routine

Agile ceremonies are cheap to describe and expensive to run. Planning takes an hour because
nobody has read the backlog. Stand-up takes twenty minutes because three people are reciting
status nobody asked for. The retro produces four action items and completes none of them.

AI helps where the cost is bookkeeping. It does not help where the cost is judgement. This
article draws that line, ceremony by ceremony.

## Sprint planning: the part worth automating

Planning splits into two jobs. The first is arithmetic — how many points fit, given who is
available, what they already carry, and what the last few sprints actually delivered. The second
is negotiation — which of these matters now, and what are we willing to drop.

The arithmetic is a good automation target because it is the same calculation every sprint and
because humans do it badly under time pressure. JiraVision drafts the plan from open load,
completed points in recent sprints, meeting and time-off pressure, and the skill tags on each
member, then writes a reason for every suggested item.

The negotiation stays with the team. The draft is a starting position, and accepting it is a
human action that writes through the ordinary task endpoints.

## Stand-up: collect asynchronously, meet about exceptions

A daily call in which everyone recites yesterday, today and blockers is a status report wearing a
meeting's clothes. The parts that need a room are the exceptions: a blocker open three days, a
task that has changed owner twice, a dependency on another team that has gone quiet.

Collect the routine part asynchronously and spend the synchronous time on what the flags turned
up. Blocker age is the most useful single signal here, because it is already sitting in your task
data and because it is hard to argue with.

## Estimation: the honest limits

Historical data improves estimates in one specific way — it tells you which kinds of task
consistently overrun. If everything tagged "integration" has taken twice its estimate for three
sprints running, that is a real, checkable pattern and it is worth putting in front of the team
at planning time.

It does not make estimation accurate in general. Any tool quoting a percentage improvement in
estimation accuracy is reporting a number it cannot reproduce on your data, because the number
depends entirely on what your team was estimating before.

What you can measure is the gap between estimated and completed points, per sprint, in your own
workspace, over the sprints you have actually run. That is a smaller claim and a useful one.

## Retrospectives: close the loop or stop running them

Retros fail for one reason more than any other — nothing comes back. Action items are written,
the next retro starts fresh, and after three cycles the team stops answering honestly because
answering has been shown to do nothing.

The cheap fix is to carry action items forward as tasks with owners and due dates, and to open
the next retro by reading out what happened to the last set. JiraVision stores retro action items
on the delivery side for exactly this reason: a completed action item is then visible in the same
place, with the same status semantics, as a completed task.

## Measure it in your own workspace

There is no productivity percentage in this article, and that is deliberate. Here are the numbers
you can pull from your own data before and after a change, all of which live on pages you can
already open:

1. Cycle time per task — reported on the sprint dashboard from created and completed timestamps.
2. Blocker age — how long tasks sit in a blocked state before anyone moves them.
3. Scope change — points added to a sprint after it started, against points completed.
4. Estimation gap — estimated versus completed points, per sprint and per task type.
5. Retro follow-through — action items from the last three retros that reached done.

Take a baseline for two sprints before you change anything. A number you did not measure
beforehand cannot tell you whether the change worked.

## What AI does not fix

- An unclear roadmap. A well-planned sprint in service of the wrong thing is still the wrong
  thing, delivered efficiently.
- A team that does not trust each other. No tool surfaces that, and any tool claiming to read
  sentiment from chat is measuring something else and calling it culture.
- Too much work in flight. This one is arithmetic, and the arithmetic says no.

Where AI earns its place is in removing the bookkeeping that makes the ceremonies expensive, so
the time in the room goes to the decisions only people can make.
`,
  },

  "improve-team-wellbeing": {
    slug: "improve-team-wellbeing",
    title: "Five ways to improve team wellbeing in remote teams",
    excerpt:
      "Remote work removed the signals that tell you how a colleague is doing. Rebuilding them on purpose is mostly a scheduling and reporting problem, not a policy one.",
    category: "team-wellbeing",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=1170&auto=format&fit=crop",
    imageAlt: "A distributed team meeting over video call",
    relatedDocs: ["team-wellbeing-setup", "metrics-guide", "ethical-metrics"],
    relatedProduct: "/products/team-wellbeing",
    demoRoute: "/dashboard/team-wellbeing",
    content: `
# Five ways to improve team wellbeing in remote teams

Remote work removed the commute and gave people back hours of their day. It also removed the
small, constant signals that tell you how a colleague is actually doing — the sigh after a bad
review, the quiet person who suddenly has nothing to say in stand-up. Wellbeing work in a
distributed team is mostly the work of rebuilding those signals on purpose.

## 1. Make load visible before it becomes a problem

Burnout rarely announces itself. It shows up first as an uneven spread of work: one person
carrying three critical tasks while two others have slack. Review assignment against capacity on
a fixed cadence — weekly is usually enough — and treat "who is over-committed" as a planning
question, not a personal one.

- Sort the roster by open work rather than by name, so concentration is obvious at a glance.
- Flag anyone whose committed load exceeds what the sprint actually contains in working days.
- Move the work or move the date. Do not silently accept both.

## 2. Ask for a check-in, not a status report

A short, recurring wellbeing check-in gives people a low-cost way to say "this week is heavy"
without having to raise it in a group call. Keep it to a few questions — energy, workload,
blockers — and score it consistently so a downward trend is visible over time rather than only in
hindsight.

The scoring matters more than the questions. A single number per person per week, charted across
the team, turns a vague sense that things feel tense into something a lead can act on in the next
one-to-one.

## 3. Separate response time from working hours

Distributed teams span time zones, and the default that emerges without intervention is "always
available". Replace it with an explicit expectation: which channel is urgent, what response time
each channel carries, and what a person is never expected to answer outside their own hours.
Write it down where onboarding picks it up, because a norm that is not written is a norm that
every new joiner has to rediscover by getting it wrong.

## 4. Protect the boundaries between meetings

Back-to-back calls are the most common quiet tax on remote work. Two cheap fixes: default
meetings to 25 or 50 minutes so there is a gap, and give every meeting an owner who is
responsible for cutting it short when the agenda is done. Neither requires anyone's permission
beyond the team's own.

## 5. Close the loop on what people tell you

Check-ins and retros only keep working if answers lead somewhere. When someone flags overload,
the follow-up should be visible — a reassignment, a scope cut, a date moved. When nothing can
change, say so and explain why. Surveys that never produce a response teach the team that
answering is pointless, and the data dries up.

## What to look at first

1. Trend, not snapshot: one low score is a bad day, four in a row is a signal.
2. Distribution, not average: a healthy team mean can hide one person sitting at the floor.
3. Action items from the last retro that touched workload — did any of them complete?

None of this requires a new policy or a budget. It requires treating wellbeing as an operational
metric with the same standing as throughput: measured on a cadence, reviewed by the people who
can change the work, and reported honestly when the number is bad.

## One boundary worth repeating

A wellbeing score is a prompt to have a conversation. It is never a performance input, and the
moment a team suspects it has become one, the answers stop being honest and the signal dies.
Aggregate by default, keep per-person visibility to the person and their lead, and say so out
loud when you set it up.
`,
  },

  "preventing-burnout-guide": {
    slug: "preventing-burnout-guide",
    title: "Preventing burnout: a practical guide for team leads",
    excerpt:
      "The five factors behind the burnout score, the four bands it maps to, and the interventions that actually move the number — starting with the disclaimer.",
    category: "team-wellbeing",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1169&auto=format&fit=crop",
    imageAlt: "A person stepping away from a desk at the end of the working day",
    relatedDocs: ["team-wellbeing-setup", "ethical-metrics", "notifications"],
    relatedProduct: "/products/team-wellbeing",
    demoRoute: "/dashboard/team-wellbeing",
    content: `
# Preventing burnout: a practical guide for team leads

Burnout does not arrive as an event. It accumulates as a series of small, individually reasonable
decisions — one more task after the scope grew, one more evening because the release slipped, one
more meeting because nobody wanted to be the one to cancel it. By the time someone says they are
burnt out, the pattern has usually been visible in the work data for weeks.

This guide covers the signals worth watching, the model JiraVision uses to combine them, and what
to do when a signal fires.

## Start from the disclaimer

The burnout score is a weighted heuristic over five factors. The weights are an illustrative
model, not a measured clinical instrument, and the calculator page says so in as many words. Its
job is to make a slow trend visible early enough to act on — not to produce a number you can put
in a performance review.

If you take one thing from this article, take this: a burnout score is a prompt to have a
conversation, never a substitute for one, and never an input to an appraisal.

## The five factors

The model scores five inputs, each from 0 to 10, and weights them:

- Sustained overload, the heaviest weight — committed work regularly exceeds available hours. This
  is usually visible in your task data before anyone reports feeling it.
- After-hours bleed, the second heaviest — evenings, weekends or standby becoming the norm rather
  than the exception.
- Low autonomy — little say over scope, sequencing, or how the work gets done.
- Unclear priorities — goals shift mid-sprint and "done" stays negotiable.
- Recognition gap — effort and care outpace what the team visibly counts.

Two of those five are load problems and three are structural. That split is the useful part: the
two most heavily weighted factors are the ones a lead can change next sprint without anyone's
permission.

## The four bands

The score maps onto four bands, each with its own advice:

1. Steady — load and control look sustainable. Keep the signals flowing so drift shows up early.
2. Watch — nothing on fire, but headroom is thin. Protect slack and re-check the trend after the
   next two cycles.
3. Strained — patterns are setting in. Rebalance load and make one driver, usually after-hours
   work, an explicit sprint goal rather than a hope.
4. At risk — treat this as a now-problem. Cut commitments this sprint, not next quarter.

The model also names the top driver: whichever factor contributed most to the score. That is the
field to act on first, because it tells you which lever to pull instead of leaving you with a
single alarming number.

## What to look at, in order

- Trend, not snapshot. One high score is a bad week; three in a row is a pattern.
- Distribution, not average. A healthy team mean hides the person at the floor, so look at the
  spread.
- Load concentration. Sort the roster by open work rather than by name and check whether the same
  two people sit at the top every sprint.
- Retro follow-through. If the last three retros produced workload action items and none of them
  completed, the team has already learned that reporting changes nothing.

## Interventions that actually move the number

Load builds most of the score, so moving work is the only intervention that reliably moves it. In
rough order of cost:

1. Reassign. Take one committed item off the person at the top of the load list and give it to
   someone with slack and the matching skill tag.
2. Cut scope. Drop an item from the sprint out loud, inside the sprint, and say why. Silent
   de-scoping teaches the team that commitments are fiction.
3. Move the date. If neither of the above is available, the date moves. Do not accept both the
   scope and the date without saying so — that is precisely how after-hours bleed starts.
4. Remove a recurring meeting. The cheapest capacity anyone ever finds. Default to 25 or 50
   minutes so there is a gap, and give each meeting an owner who ends it when the agenda is done.
5. Write down the availability expectation. Which channel is urgent, what response time each one
   carries, what nobody is expected to answer outside their own hours. Put it where onboarding
   picks it up.

## What not to do

- Do not use a check-in score as a performance input. The moment the team suspects it, the
  answers stop being honest and the signal dies.
- Do not publish individual scores to the group. Aggregate by default and restrict per-person
  visibility to the person and their lead.
- Do not answer a bad score with a wellness initiative. A meditation app does not reduce
  committed load, and offering one reads as a refusal to look at the actual driver.
- Do not survey without acting. Close the loop visibly — a reassignment, a scope cut, a date
  moved — or stop asking.

## Try the model on your own team

The burnout calculator on the team wellbeing product page runs the same five factors and prints
the band, the advice and the top driver. It is a demo of the heuristic, so treat the output as a
prompt rather than a verdict, and compare it against the load numbers on your own wellbeing
dashboard before you act on either.
`,
  },

  "gamification-science": {
    slug: "gamification-science",
    title: "The science behind gamification that does not backfire",
    excerpt:
      "Badges record motivation, they do not create it. Which psychological need a mechanic feeds decides whether it helps a team or quietly damages it.",
    category: "gamification",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1559223607-a43c990c692c?q=80&w=1170&auto=format&fit=crop",
    imageAlt: "A team celebrating progress together in an office",
    relatedDocs: ["gamification", "metrics-guide", "ethical-metrics"],
    relatedProduct: "/products/gamification",
    demoRoute: "/dashboard/gamification",
    content: `
# The science behind gamification that does not backfire

Badges and leaderboards do not motivate people. They record motivation that already exists — or
they replace it with something thinner. The difference between gamification that helps and
gamification that quietly damages a team comes down to which psychological need the mechanic is
feeding.

## Start with self-determination theory

The most durable framework here is self-determination theory, which holds that sustained
intrinsic motivation rests on three needs: competence (I am getting better at this), autonomy (I
chose to do this), and relatedness (this matters to people I work with). A game mechanic that
serves one of those three tends to land. A mechanic that serves none of them is bookkeeping with
confetti.

- Competence — progress bars, streaks, and level-ups tied to skills someone is deliberately
  building.
- Autonomy — opt-in challenges, self-set targets, and choices about which reward to pursue.
- Relatedness — team goals, shared unlocks, and recognition that names the contribution rather
  than the score.

## Why points-for-points fails

Points awarded for activity — commits, comments, tickets touched — measure motion, not value.
Teams respond by optimising the metric rather than the work, which is Goodhart's law playing out
inside a sprint: once a measure becomes a target, it stops being a good measure. The classic
symptom is a burst of small, low-value ticket churn at the end of a scoring period.

The fix is not to remove points but to anchor them to outcomes you already believe in: work
completed within its estimate, review turnaround that unblocked someone else, a defect caught
before release. If you cannot explain why an action earns points in one sentence, the rule is
probably wrong.

## Design the leaderboard so losing is survivable

A single all-time leaderboard is demotivating for anyone not in the top three, and it rewards the
people who needed the least encouragement. Better patterns:

1. Reset cadence — weekly or per-sprint standings, so a slow start is not a permanent position.
2. Cohorts — compare people doing comparable work. A designer and an on-call engineer should not
   share one ranking.
3. Personal bests — show progress against the person's own history alongside any team ranking.
4. Team totals — where competition would damage collaboration, score the group instead of the
   individual.

## Recognition beats reward

Research on motivation consistently finds that extrinsic rewards can crowd out intrinsic interest
in work people already found meaningful — the overjustification effect. In practice this means a
public, specific acknowledgement of what someone did and why it mattered usually outperforms a
token of equivalent cash value. Kudos that name the behaviour also teach the rest of the team
what good looks like.

## Make the rules inspectable

Trust in a gamified system collapses the moment someone suspects the scoring is arbitrary or
hidden. Publish the point rules, show the history of a person's own awards, and let the team
propose changes. A mechanic people helped design is a mechanic people accept when they lose.

## Measure whether it is working

Gamification needs the same treatment as any other intervention: a baseline and a review. Watch
for movement in the things you actually care about — cycle time, review latency, sprint
completion, participation in retros — and watch the counter-signals too: ticket churn, gaming of
estimates, and whether the same two people collect every award.

If engagement with the game rises while delivery does not, the game has become the product and
your sprint is the raw material.

Used with that discipline, gamification is not a trick. It is a way of making progress visible
and effort acknowledged, which most teams already want and rarely get.
`,
  },

  "ethical-ai-project-management": {
    slug: "ethical-ai-project-management",
    title: "Ethical considerations in AI-powered project management",
    excerpt:
      "The ethical question is rarely whether the model is correct. It is who is accountable when a person acts on it — and whether they could have said no.",
    category: "ethical-ai",
    publishedOn: "2026-10-24",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1170&auto=format&fit=crop",
    imageAlt: "A person weighing a decision, hands resting on a desk",
    relatedDocs: ["ethical-metrics", "metrics-guide", "data-export"],
    relatedProduct: "/products/ethical-metrics",
    demoRoute: "/dashboard/ethical-metrics",
    content: `
# Ethical considerations in AI-powered project management

AI in project management is rarely a robot making decisions. It is a recommendation, a risk
score, a suggested owner, a summary of a thread nobody read. That framing matters: the ethical
question is almost never "is the model correct" but "who is accountable when a person acts on
it".

## Explainability is a feature, not a nicety

If a tool flags a task as at-risk, the person receiving that flag needs to know which inputs
produced it. Without that, they either ignore the system entirely or defer to it uncritically —
both of which are worse than not having it. Prefer models and prompts whose reasoning can be
surfaced in plain language alongside the recommendation, and store the reasoning with the record
so it can be audited later.

This is why every metric in JiraVision prints its own formula. A number you cannot reproduce is
not a measurement, it is an assertion.

## Watch for proxy discrimination

Historical project data encodes past decisions, including unfair ones. A model trained on who was
assigned stretch work, whose estimates were trusted, or who got flagged as a bottleneck can
reproduce those patterns while looking purely statistical. Two guards help:

- Review any per-person score for patterns across teams, locations, tenure or role before it
  influences a decision.
- Keep human judgement in the loop for anything that affects a person's work allocation,
  appraisal or reputation. Automate reminders, not consequences.

## Be honest about the data

Tell people what is collected, what is used to train or tune models, and what is retained.
Wellbeing and sentiment signals deserve the strictest treatment: they are the most useful inputs
an AI system can have and the easiest to misuse. Aggregate by default, restrict access to
individuals, and never let a check-in score become a performance input without the team knowing.

## Design the override path first

Every automated recommendation needs a visible way to disagree, a record that the disagreement
happened, and no penalty for using it. If dismissing a suggestion is harder than accepting it,
the system is not assisting — it is deciding.

In JiraVision a dismissed recommendation is archived with the reason you gave, so the
disagreement is legible later. That archive is not a nice-to-have; it is the audit trail for the
claim that a human stayed in the loop.

## The metrics we refuse to build

Some measurements are technically easy and organisationally corrosive. These are not on the
roadmap:

- Lines of code, commits per person, or any raw activity count presented as productivity.
- Keyboard time, idle detection, or screen monitoring of any kind.
- Per-person velocity rankings shown to the group.
- Sentiment analysis of chat content used as a performance signal.

Publishing a refusal list is itself part of the ethics work. A team cannot consent to a metric
they cannot predict.

## A practical checklist

1. Can a person see why this recommendation was made?
2. Can they override it, and is the override recorded?
3. Who is accountable for the outcome — the tool, the operator, or the manager who approved it?
4. What personal data went in, and who can still read it?
5. When was the last time anyone checked the outputs for unfair patterns?

Answering those five questions before rollout turns most ethical risk into an ordinary product
decision. Leaving them unanswered is what turns a useful assistant into a liability.
`,
  },
}

/** Newest first, featured post ahead of everything. */
export const blogList: BlogPost[] = Object.values(blogPosts).sort((a, b) => {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1
  return b.publishedOn.localeCompare(a.publishedOn)
})

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts[slug]
}

/** Post slugs for sitemap.xml. */
export function blogSlugs(): string[] {
  return blogList.map((post) => post.slug)
}

export function postsByCategory(category: BlogCategoryId): BlogPost[] {
  return blogList.filter((post) => post.category === category)
}

export function getCategory(id: BlogCategoryId): BlogCategory | undefined {
  return blogCategories.find((category) => category.id === id)
}

/** Same-category posts first, then the rest. Never includes the post itself. */
export function relatedPosts(slug: string, limit = 3): BlogPost[] {
  const post = getPost(slug)
  if (!post) return blogList.slice(0, limit)
  const same = blogList.filter((other) => other.slug !== slug && other.category === post.category)
  const rest = blogList.filter((other) => other.slug !== slug && other.category !== post.category)
  return [...same, ...rest].slice(0, limit)
}

/** Previous and next post in the published order, for the reader footer. */
export function postNeighbours(slug: string): { previous?: BlogPost; next?: BlogPost } {
  const index = blogList.findIndex((post) => post.slug === slug)
  if (index < 0) return {}
  return { previous: blogList[index - 1], next: blogList[index + 1] }
}

/** Derived from the word count at 200 wpm — never a number we state by hand. */
export function readingMinutes(post: BlogPost): number {
  return Math.max(1, Math.round(wordCount(post.content) / 200))
}

/** Long-form date for display, e.g. "24 October 2026". */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** Index search across title, excerpt and article copy. */
export function searchPosts(query: string, category: BlogFilter = "all"): BlogPost[] {
  const needle = query.trim().toLowerCase()
  return blogList.filter((post) => {
    if (category !== "all" && post.category !== category) return false
    if (!needle) return true
    const haystack = [post.title, post.excerpt, post.content].join(" ").toLowerCase()
    return haystack.includes(needle)
  })
}
