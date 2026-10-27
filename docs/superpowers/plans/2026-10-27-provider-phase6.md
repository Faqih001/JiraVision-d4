# Phase 6: Provider layer — lib/ai/gemini.ts

Date: 2026-10-27
Spec: §9 of `docs/superpowers/specs/2026-10-26-worklog-reports-planner-assistant-design.md`

## Goal

Ship the real Gemini provider that replaces the mock AI stack. Plain `fetch` against Google's API, no SDK. Two entry points: `geminiText` (free-form text) and `geminiJson` (structured output with schema). Error handling maps Google's responses to UI-friendly kinds. Model discovery when `GEMINI_MODEL` is unset. Delete the mock branches and the IBM Granite claims.

## Tasks

### Task 1: Create lib/ai/gemini.ts
- `GeminiRequest` interface: system, contents, responseSchema, maxOutputTokens, temperature
- `geminiText(req)`: returns `{ text, usage }`
- `geminiJson<T>(req, parse)`: returns `{ data, usage }` with zod parsing
- `GeminiError` with `kind`: auth | quota | blocked | timeout | transport | badjson
- `AbortController` timeouts: 20s chat, 120s extraction, 45s report prose
- Model discovery: `GET /v1beta/models` on cold start, cache first text-capable generation model
- Plain `fetch`, no `@google/genai`

### Task 2: Update .env.example
- Add `GOOGLE_GEMINI_API_KEY` with where-to-get docs
- Add `GEMINI_MODEL` (optional) with note about auto-discovery

### Task 3: Delete lib/ai-models.ts
- Remove the file entirely
- Remove all imports/references

### Task 4: Update /api/ai/generate
- Remove mock branches
- Wire to real `geminiText` or `geminiJson` based on request type
- Map `GeminiError.kind` to UI states

### Task 5: Update PLACEHOLDERS.md and FEATURES.md
- Remove IBM Granite claims
- Document the real Gemini provider

### Task 6: Tests — tests/unit/gemini.test.ts
- Stub `fetch` to test all error kinds
- Test model discovery caching
- Test timeout handling
- Test structured output parsing
- Test retry on badjson

### Task 7: Gates and commit
- typecheck: 0 errors
- lint: 0 errors, ≤70 warnings
- tests: all passing
- commit and push

## Deliberately absent

- Actual AI features (planner extraction, report prose, assistant) — those are phases 7, 9
- Streaming responses — the spec says one POST, one response
- Multi-turn conversations — each call is independent
- Image/file inputs beyond inline PDF for the planner (phase 7)

## File ownership

- `lib/ai/gemini.ts` — new file
- `lib/ai-models.ts` — delete
- `.env.example` — extend
- `app/api/ai/generate/route.ts` — rewrite
- `PLACEHOLDERS.md`, `FEATURES.md` — update
- `tests/unit/gemini.test.ts` — new file
