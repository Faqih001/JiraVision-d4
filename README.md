# Fork of Jiravision dashboard

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/neemas-projects-5c325988/v0-fork-of-jiravision-dashboard)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/VL98TY2lRF6)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/neemas-projects-5c325988/v0-fork-of-jiravision-dashboard](https://vercel.com/neemas-projects-5c325988/v0-fork-of-jiravision-dashboard)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/VL98TY2lRF6](https://v0.dev/chat/projects/VL98TY2lRF6)**

## AI

All AI features go through one module, `lib/ai/gemini.ts` — it is the only place that knows Google's URL,
key and payload shape. Everything else calls `geminiText()` or `geminiJson()` and handles `GeminiError`
(`auth | quota | blocked | timeout | transport | badjson`). Nothing calls Google directly.

Configure it in `.env.local` (see `.env.example` for where to get a key):

| Variable | Required | Meaning |
|---|---|---|
| `GOOGLE_GEMINI_API_KEY` | yes, for any AI surface | Unset → AI controls render disabled; the log, reports and exports work fully |
| `GEMINI_MODEL` | no | Unset → the first text-capable model is discovered once per cold start |
| `AI_PUBLIC_DAILY_CAP` | no | Global daily ceiling for the anonymous site assistant (default 200) |

Five surfaces use it:

| Surface | Route | Who can call it | Grounded in |
|---|---|---|---|
| Site assistant | `POST /api/assistant/site` | Anyone (rate-limited) | Published `content/*` text for the current pathname |
| Workspace assistant | `POST /api/assistant/workspace` (+ `/threads`) | Signed-in member | That member's own tasks, work log, deliverables, reports |
| Planner extraction | `POST /api/planner/extract` | Signed-in member | The pasted or uploaded brief |
| AI scrum master | `POST /api/dashboard/ai-recommendation` | Signed-in member | The sprint's own rows |
| Provider proxy | `POST /api/ai/generate` | Signed-in member | Whatever the caller sends |

Three rules hold across all of them:

1. **No invented numbers.** A prompt that produces a recommendation is given real values and told to use only
   those. If the provider fails, the route says so (503/422) rather than inventing advice; the rule engine on
   the client is the fallback, not a plausible sentence.
2. **The model reads only what it is given.** The public assistant gets published site text, so it cannot
   disclose anything private; the workspace assistant gets one member's rows, scoped by `user_id`.
3. **The cheap path answers first.** The site assistant answers from 35 keyword entries before it ever calls
   the model, so most visitor questions cost nothing. Per-visitor caps are 8/hour and 24/day; the global
   ceiling is `AI_PUBLIC_DAILY_CAP`.

The legal notice states the same thing to visitors: what the assistant reads, and that a published page
outranks a machine answer (`content/legal.ts`, section `ai-assistant-answers`).

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository