// POST /api/agent/handover/commit — the human's preview comes back, and every item is
// validated again by the same readers the manual forms use. Registers land as
// `source:"gemini"`; playbooks land as drafts with `aiMarked:true`, so publishing needs a
// human edit. Tasks are created from outstanding work register rows and playbook steps.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { playbooks, registerItems, tasks } from "@/drizzle/schema"
import { stripCredentialValues } from "@/lib/agent/handover"
import { readPlaybookInput } from "@/lib/playbooks/fields"
import { defaultMethod } from "@/lib/playbooks/method"
import { readRegisterFields } from "@/lib/registers/fields"
import { isRegisterCustody } from "@/lib/registers/rules"
import { loadPacks } from "@/lib/registers/read"
import { packByKey } from "@/lib/packs/pack"
import { agentSession, bad } from "../../_shared"

export const dynamic = "force-dynamic"

const MAX_REGISTERS = 40
const MAX_PLAYBOOKS = 25

type Pairs = { key: string; value: string }[]

const pairsOf = (value: unknown): Pairs => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
      const row = entry as Record<string, unknown>
      if (typeof row.key !== "string") return []
      return [{ key: row.key, value: String(row.value ?? "") }]
    })
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, raw]) => ({
      key,
      value: String(raw ?? ""),
    }))
  }
  return []
}

export async function POST(request: Request) {
  const gate = await agentSession()
  if (!gate) return bad("Unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return bad("A JSON body is required")

  const packKey = typeof body.packKey === "string" ? body.packKey.trim() : ""
  if (!packKey) return bad("packKey is required")

  const registers = Array.isArray(body.registers) ? body.registers.slice(0, MAX_REGISTERS) : []
  const drafts = Array.isArray(body.playbooks) ? body.playbooks.slice(0, MAX_PLAYBOOKS) : []
  if (registers.length === 0 && drafts.length === 0) {
    return bad("Select at least one row to save.")
  }

  try {
    const packs = await loadPacks(false)
    const pack = packByKey(packs, packKey)
    if (!pack) return bad("That role pack does not exist or is inactive.", 404)

    const method = defaultMethod(pack.method)
    const kindKeys = new Set(pack.registerKinds.map((entry) => entry.key))
    const skipped: { title: string; reason: string }[] = []

    const result = await db.transaction(async (tx) => {
      const existingRegisters = await tx
        .select({ kind: registerItems.kind, title: registerItems.title })
        .from(registerItems)
        .where(eq(registerItems.packKey, pack.packKey))
        .limit(2000)
      const taken = new Set(
        existingRegisters.map((row) => `${row.kind}::${row.title.trim().toLowerCase()}`),
      )

      let createdRegisters = 0
      for (const entry of registers) {
        const row = (entry ?? {}) as Record<string, unknown>
        const title = typeof row.title === "string" ? row.title.trim() : ""
        const kind = typeof row.kind === "string" ? row.kind.trim() : ""
        if (!title || title.length > 200) {
          skipped.push({ title: title || "(untitled)", reason: "title must be 1-200 characters" })
          continue
        }
        if (!kindKeys.has(kind)) {
          skipped.push({ title, reason: "kind is not listed by this pack" })
          continue
        }
        const stripped = stripCredentialValues(pairsOf(row.fields), `${title}.fields`)
        if (stripped.refused.length > 0) {
          skipped.push({
            title,
            reason: stripped.refused.map((refusal) => refusal.path).join(", "),
          })
          continue
        }
        const fields = readRegisterFields(stripped.kept)
        if (!fields.ok) {
          skipped.push({ title, reason: fields.error })
          continue
        }
        const custody = isRegisterCustody(row.custody) ? row.custody : "member"
        const key = `${kind}::${title.toLowerCase()}`
        if (taken.has(key)) {
          skipped.push({ title, reason: "already in the register" })
          continue
        }
        taken.add(key)

        await tx.insert(registerItems).values({
          packKey: pack.packKey,
          kind,
          title,
          fields: fields.fields,
          status: "in_service",
          ownerId: gate.id,
          custody,
          verifyIntervalDays: null,
          parentId: null,
          source: "gemini",
        })
        createdRegisters += 1
      }

      const existingPlaybooks = await tx
        .select({ title: playbooks.title })
        .from(playbooks)
        .where(eq(playbooks.packKey, pack.packKey))
        .limit(2000)
      const takenTitles = new Set(existingPlaybooks.map((row) => row.title.trim().toLowerCase()))

      let createdPlaybooks = 0
      for (const entry of drafts) {
        const row = (entry ?? {}) as Record<string, unknown>
        const title = typeof row.title === "string" ? row.title.trim() : ""
        if (!title) {
          skipped.push({ title: "(untitled)", reason: "a playbook needs a title" })
          continue
        }
        if (takenTitles.has(title.toLowerCase())) {
          skipped.push({ title, reason: "a playbook with that title already exists in this pack" })
          continue
        }

        const read = readPlaybookInput({ ...row, packKey: pack.packKey, verifyIntervalDays: null }, method)
        if (!read.ok) {
          skipped.push({ title, reason: read.error })
          continue
        }
        takenTitles.add(title.toLowerCase())

        await tx.insert(playbooks).values({
          ...read.value,
          packKey: pack.packKey,
          status: "draft",
          version: 1,
          authorId: gate.id,
          source: "gemini",
          aiMarked: true,
        })
        createdPlaybooks += 1
      }

      // Create tasks from outstanding work register rows and playbook steps
      let createdTasks = 0

      // Tasks from outstanding work register rows
      for (const entry of registers) {
        const row = (entry ?? {}) as Record<string, unknown>
        const kind = typeof row.kind === "string" ? row.kind.trim() : ""
        if (kind !== "outstanding") continue

        const title = typeof row.title === "string" ? row.title.trim() : ""
        if (!title) continue

        const fields = row.fields as Record<string, string> | undefined
        const description = fields?.status || fields?.notes || null

        await tx.insert(tasks).values({
          title: `[Outstanding] ${title}`,
          description,
          status: "todo",
          priority: "medium",
          storyPoints: 0,
          assigneeId: gate.id,
          sprintId: null,
          dueDate: null,
          tags: ["handover", "outstanding"],
          startDate: null,
          discipline: null,
          sourcePlanId: null,
          metadata: { source: "handover", kind: "outstanding", registerTitle: title },
        })
        createdTasks += 1
      }

      // Tasks from playbook steps
      for (const entry of drafts) {
        const row = (entry ?? {}) as Record<string, unknown>
        const playbookTitle = typeof row.title === "string" ? row.title.trim() : ""
        if (!playbookTitle) continue

        const steps = Array.isArray(row.steps) ? row.steps : []
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i] as Record<string, unknown> | undefined
          if (!step) continue

          const phase = typeof step.phase === "string" ? step.phase.trim() : ""
          const action = typeof step.action === "string" ? step.action.trim() : ""
          if (!action) continue

          await tx.insert(tasks).values({
            title: `[${playbookTitle}] ${phase ? `${phase}: ` : ""}${action}`,
            description: null,
            status: "todo",
            priority: "medium",
            storyPoints: 1,
            assigneeId: gate.id,
            sprintId: null,
            dueDate: null,
            tags: ["handover", "playbook-step"],
            startDate: null,
            discipline: null,
            sourcePlanId: null,
            metadata: { source: "handover", kind: "playbook-step", playbook: playbookTitle, stepIndex: i, phase },
          })
          createdTasks += 1
        }
      }

      return { registers: createdRegisters, playbooks: createdPlaybooks, tasks: createdTasks }
    })

    return NextResponse.json({ success: true, data: { created: result, skipped } })
  } catch (error) {
    console.error("Handover commit error:", error)
    return bad("The handover could not be saved.", 500)
  }
}
