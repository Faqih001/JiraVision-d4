// /api/ethical-metrics/[id] — edit or delete a recorded ethical metrics snapshot.
//
// Scores live in ethical_metrics; the human label/note that the workspace
// history table shows lives in users.preferences JSONB (the table has no label
// column). Both mutations push a system notification into the audit feed.

import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { db } from "@/lib/db"
import { ethicalMetrics } from "@/drizzle/schema"
import { createNotification } from "@/lib/notifications"
import {
  ETHICS_LINK,
  dayKey,
  readEthicsMeta,
  serializeSnapshot,
  writeEthicsMeta,
  type SnapshotMeta,
} from "../route"

export const dynamic = "force-dynamic"

type Context = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

function parseScore(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return "invalid"
  return Math.max(0, Math.min(100, Math.round(n)))
}

async function loadRow(id: number) {
  const [row] = await db
    .select({
      id: ethicalMetrics.id,
      date: ethicalMetrics.date,
      payEquityScore: ethicalMetrics.payEquityScore,
      workloadBalanceScore: ethicalMetrics.workloadBalanceScore,
      deiTaskDistributionScore: ethicalMetrics.deiTaskDistributionScore,
      overtimeCompliance: ethicalMetrics.overtimeCompliance,
      createdAt: ethicalMetrics.createdAt,
    })
    .from(ethicalMetrics)
    .where(eq(ethicalMetrics.id, id))
    .limit(1)
  return row ?? null
}

/** Newest ethical snapshot id belonging to this workspace, used for ordering-safe deletes. */
async function latestId(): Promise<number | null> {
  const [row] = await db
    .select({ id: ethicalMetrics.id })
    .from(ethicalMetrics)
    .orderBy(desc(ethicalMetrics.date), desc(ethicalMetrics.id))
    .limit(1)
  return row?.id ?? null
}

// GET /api/ethical-metrics/[id] — one snapshot with its label/note.
export async function GET(_request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseId(idParam)
    if (id === null) {
      return NextResponse.json({ success: false, message: "Invalid snapshot ID" }, { status: 400 })
    }
    const [row, meta] = await Promise.all([loadRow(id), readEthicsMeta(session.id)])
    if (!row) {
      return NextResponse.json({ success: false, message: "Snapshot not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: serializeSnapshot(row, meta) })
  } catch (error) {
    console.error("Ethical metrics snapshot fetch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch snapshot", error: (error as Error).message },
      { status: 500 },
    )
  }
}

type PatchBody = {
  date?: string
  payEquityScore?: number
  workloadBalanceScore?: number
  deiTaskDistributionScore?: number
  overtimeCompliance?: number
  label?: string
  note?: string
}

async function mutate(request: Request, idParam: string, mode: "patch" | "put") {
  const id = parseId(idParam)
  if (id === null) {
    return NextResponse.json({ success: false, message: "Invalid snapshot ID" }, { status: 400 })
  }
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
  }

  const existing = await loadRow(id)
  if (!existing) {
    return NextResponse.json({ success: false, message: "Snapshot not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as PatchBody | null
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, message: "Request body is required" }, { status: 400 })
  }

  const updates: {
    date?: string
    payEquityScore?: number
    workloadBalanceScore?: number
    deiTaskDistributionScore?: number
    overtimeCompliance?: number
  } = {}

  if (body.date !== undefined) {
    if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json({ success: false, message: "date must look like YYYY-MM-DD" }, { status: 400 })
    }
    updates.date = body.date
  }

  const scoreKeys = [
    "payEquityScore",
    "workloadBalanceScore",
    "deiTaskDistributionScore",
    "overtimeCompliance",
  ] as const
  for (const key of scoreKeys) {
    if (body[key] === undefined) continue
    const value = parseScore(body[key])
    if (value === "invalid") {
      return NextResponse.json({ success: false, message: `${key} must be a number between 0 and 100` }, { status: 400 })
    }
    if (value === null) continue
    updates[key] = value
  }

  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : undefined
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined
  if (mode === "patch" && Object.keys(updates).length === 0 && label === undefined && note === undefined) {
    return NextResponse.json(
      { success: false, message: "Provide at least one of date, scores, label, note" },
      { status: 400 },
    )
  }

  if (Object.keys(updates).length > 0) {
    await db.update(ethicalMetrics).set(updates).where(eq(ethicalMetrics.id, id))
  }

  const meta = await readEthicsMeta(session.id)
  const snapshots = { ...(meta.snapshots ?? {}) }
  const currentMeta: SnapshotMeta = snapshots[String(id)] ?? {}
  const nextDate = updates.date ?? dayKey(existing.date) ?? ""
  const nextMeta: SnapshotMeta = {
    label: label ?? currentMeta.label ?? `Snapshot ${nextDate}`,
    note: note !== undefined ? note : currentMeta.note,
    source: "edited",
  }
  snapshots[String(id)] = nextMeta
  await writeEthicsMeta(session.id, { snapshots })

  const [row, latest] = await Promise.all([loadRow(id), latestId()])
  const snapshot = row ? serializeSnapshot(row, { ...meta, snapshots }) : null
  const changed = Object.keys(updates)

  await createNotification({
    userId: session.id,
    type: "system",
    title: `Ethics snapshot updated: ${nextMeta.label ?? `#${id}`}`,
    body:
      changed.length > 0
        ? `Adjusted ${changed.join(", ")}${latest === id ? ", which also moves the headline scores shown on the dashboard." : "."}`
        : "Snapshot label/notes updated.",
    link: ETHICS_LINK,
    metadata: {
      action: "ethics_snapshot_updated",
      snapshotId: id,
      label: nextMeta.label ?? null,
      changed,
      scores: row
        ? {
            payEquity: row.payEquityScore,
            workloadBalance: row.workloadBalanceScore,
            deiTaskDistribution: row.deiTaskDistributionScore,
            overtimeCompliance: row.overtimeCompliance,
          }
        : null,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Ethical metrics snapshot updated",
    data: { snapshot },
  })
}

// PATCH /api/ethical-metrics/[id] — partial edit (scores, date, label, note).
export async function PATCH(request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    return await mutate(request, idParam, "patch")
  } catch (error) {
    console.error("Ethical metrics snapshot patch error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update snapshot", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// PUT /api/ethical-metrics/[id] — same contract as PATCH, accepted for callers
// that only speak PUT (the page's edit dialog uses PATCH, the smoke test uses PUT).
export async function PUT(request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    return await mutate(request, idParam, "put")
  } catch (error) {
    console.error("Ethical metrics snapshot put error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to update snapshot", error: (error as Error).message },
      { status: 500 },
    )
  }
}

// DELETE /api/ethical-metrics/[id] — removes the snapshot and its label.
export async function DELETE(_request: Request, { params }: Context) {
  const { id: idParam } = await params
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    const id = parseId(idParam)
    if (id === null) {
      return NextResponse.json({ success: false, message: "Invalid snapshot ID" }, { status: 400 })
    }
    const existing = await loadRow(id)
    if (!existing) {
      return NextResponse.json({ success: false, message: "Snapshot not found" }, { status: 404 })
    }

    await db.delete(ethicalMetrics).where(eq(ethicalMetrics.id, id))

    const meta = await readEthicsMeta(session.id)
    const snapshots = { ...(meta.snapshots ?? {}) }
    const label = snapshots[String(id)]?.label ?? `Snapshot ${dayKey(existing.date) ?? ""}`
    delete snapshots[String(id)]
    await writeEthicsMeta(session.id, { snapshots })

    await createNotification({
      userId: session.id,
      type: "system",
      title: `Ethics snapshot deleted: ${label}`,
      body: `The ${dayKey(existing.date) ?? "undated"} snapshot was removed from the ethical metrics history.`,
      link: ETHICS_LINK,
      metadata: { action: "ethics_snapshot_deleted", snapshotId: id, label },
    })

    return NextResponse.json({ success: true, message: "Snapshot deleted", data: { id } })
  } catch (error) {
    console.error("Ethical metrics snapshot delete error:", error)
    return NextResponse.json(
      { success: false, message: "Failed to delete snapshot", error: (error as Error).message },
      { status: 500 },
    )
  }
}
