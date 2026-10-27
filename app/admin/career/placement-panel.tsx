"use client"

// Placements and the sign-off loop (design §11). Placing a member writes the rung they
// hold; ticking a checklist item records the admin who certified it, never the member.
// Both writes are re-gated server-side — this panel only shapes the request.

import { useCallback, useEffect, useState } from "react"
import { Award, ChevronDown, ChevronRight, Loader2, Save, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { LADDER_DISCIPLINES } from "@/lib/career/ladder-seed"
import { CAREER_RUNGS, DISCIPLINE_LABEL, isWorkDiscipline } from "@/lib/roles"

type Member = { id: number; name: string; email: string }

type PlacementRow = {
  userId: number
  memberName: string
  discipline: string
  level: number
  title: string | null
  placedAt: string
  note: string | null
}

type SignoffItem = {
  key: string
  label: string
  hint: string
  status: "ticked" | "declined" | null
  tickedBy: number | null
  tickedByName: string | null
  tickedAt: string | null
  note: string | null
}

type SignoffRung = {
  levelId: number
  level: number
  title: string
  checklist: SignoffItem[]
}

type SignoffPayload = {
  member: Member
  placement: { discipline: string; level: number; placedAt: string; note: string | null }
  current: SignoffRung | null
  next: SignoffRung | null
}

type PanelState = {
  key: string
  loading: boolean
  error: string | null
  data: SignoffPayload | null
}

type Flash = { kind: "ok" | "err"; text: string } | null

const disciplineLabel = (value: string): string =>
  isWorkDiscipline(value) ? DISCIPLINE_LABEL[value] : value

const rungLabel = (level: number): string => {
  const rung = CAREER_RUNGS.find((entry) => entry.level === level)
  return rung ? `Level ${rung.level} · ${rung.name}` : `Level ${level}`
}

function formatDay(value: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const keyOf = (userId: number, discipline: string) => `${userId}:${discipline}`

function SignoffRungView({
  rung,
  busyKey,
  onSign,
}: {
  rung: SignoffRung
  busyKey: string | null
  onSign: (rung: SignoffRung, itemKey: string, status: "ticked" | "declined") => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Level {rung.level} · {rung.title}
      </p>
      {rung.checklist.length === 0 ? (
        <EmptyNote>No checklist is configured for this rung.</EmptyNote>
      ) : (
        <ul className="space-y-2">
          {rung.checklist.map((item) => {
            const busy = busyKey === `${rung.levelId}:${item.key}`
            return (
              <li key={item.key} className="rounded-md border border-border/70 px-2.5 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">{item.label}</p>
                    {item.hint ? (
                      <p className="text-[11px] text-muted-foreground">{item.hint}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      variant={item.status === "ticked" ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => onSign(rung, item.key, "ticked")}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : "Tick"}
                    </Button>
                    <Button
                      size="sm"
                      variant={item.status === "declined" ? "destructive" : "outline"}
                      disabled={busy}
                      onClick={() => onSign(rung, item.key, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.status === "ticked" && item.tickedByName
                    ? `Ticked by ${item.tickedByName} on ${formatDay(item.tickedAt)}`
                    : item.status === "declined" && item.tickedByName
                      ? `Declined by ${item.tickedByName} on ${formatDay(item.tickedAt)}`
                      : "Awaiting sign-off"}
                  {item.note ? ` — ${item.note}` : ""}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PlacementPanel() {
  const [members, setMembers] = useState<Member[]>([])
  const [placements, setPlacements] = useState<PlacementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [memberId, setMemberId] = useState("")
  const [discipline, setDiscipline] = useState<string>(LADDER_DISCIPLINES[0])
  const [level, setLevel] = useState("1")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<Flash>(null)

  const [panel, setPanel] = useState<PanelState | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/career/placements")
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      setMembers(json.data.members as Member[])
      setPlacements(json.data.placements as PlacementRow[])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/career/placements")
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        return json
      })
      .then((json) => {
        if (cancelled) return
        setMembers(json.data.members as Member[])
        setPlacements(json.data.placements as PlacementRow[])
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadPanel = useCallback(
    async (userId: number, targetDiscipline: string) => {
      const key = keyOf(userId, targetDiscipline)
      setPanel({ key, loading: true, error: null, data: null })
      try {
        const qs = new URLSearchParams({
          userId: String(userId),
          discipline: targetDiscipline,
        })
        const res = await fetch(`/api/career/signoffs?${qs.toString()}`)
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
        }
        setPanel({ key, loading: false, error: null, data: json.data as SignoffPayload })
      } catch (err) {
        setPanel({ key, loading: false, error: (err as Error).message, data: null })
      }
    },
    [],
  )

  const togglePanel = (row: PlacementRow) => {
    const key = keyOf(row.userId, row.discipline)
    if (panel?.key === key) {
      setPanel(null)
      return
    }
    void loadPanel(row.userId, row.discipline)
  }

  const savePlacement = async () => {
    const parsedUserId = Number(memberId)
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      setFlash({ kind: "err", text: "Choose a team member first." })
      return
    }
    setSaving(true)
    setFlash(null)
    try {
      const res = await fetch("/api/career/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parsedUserId,
          discipline,
          level: Number(level),
          note,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      const saved = json.data.placement as PlacementRow
      setFlash({
        kind: "ok",
        text: `${saved.memberName} placed at ${rungLabel(saved.level)} in ${disciplineLabel(saved.discipline)}.`,
      })
      setNote("")
      await load()
    } catch (err) {
      setFlash({ kind: "err", text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const sign = async (rung: SignoffRung, itemKey: string, status: "ticked" | "declined") => {
    if (!panel) return
    const [rawUserId, panelDiscipline] = panel.key.split(":")
    const userId = Number(rawUserId)
    const itemBusyKey = `${rung.levelId}:${itemKey}`
    setBusyKey(itemBusyKey)
    setPanel((prev) => (prev ? { ...prev, error: null } : prev))
    try {
      const res = await fetch("/api/career/signoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, levelId: rung.levelId, itemKey, status }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? json?.message ?? `Request failed (${res.status})`)
      }
      await loadPanel(userId, panelDiscipline)
    } catch (err) {
      setPanel((prev) =>
        prev ? { ...prev, error: (err as Error).message } : prev,
      )
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Place a member" icon={<UserCheck className="h-4 w-4" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="placement-member">Team member</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="placement-member" className="w-full">
                <SelectValue placeholder="Choose a member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="placement-discipline">Discipline</Label>
            <Select value={discipline} onValueChange={setDiscipline}>
              <SelectTrigger id="placement-discipline" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LADDER_DISCIPLINES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {disciplineLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="placement-level">Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="placement-level" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAREER_RUNGS.map((rung) => (
                  <SelectItem key={rung.level} value={String(rung.level)}>
                    {rungLabel(rung.level)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="placement-note">Note</Label>
            <Input
              id="placement-note"
              placeholder="Why this rung (optional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={() => void savePlacement()} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {saving ? "Saving…" : "Save placement"}
          </Button>
          {flash ? (
            <span
              className={
                flash.kind === "err"
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
              role={flash.kind === "err" ? "alert" : "status"}
            >
              {flash.text}
            </span>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Placements" icon={<Award className="h-4 w-4" />}>
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading placements…
          </p>
        ) : placements.length === 0 ? (
          <EmptyNote>No one is placed on a ladder yet.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {placements.map((row) => {
              const rowKey = keyOf(row.userId, row.discipline)
              const expanded = panel?.key === rowKey
              return (
                <li key={rowKey} className="rounded-lg border border-border/70">
                  <div className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{row.memberName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {disciplineLabel(row.discipline)} · Level {row.level}
                        {row.title ? ` — ${row.title}` : ""} · placed {formatDay(row.placedAt)}
                        {row.note ? ` — ${row.note}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-expanded={expanded}
                      onClick={() => togglePanel(row)}
                    >
                      {expanded ? (
                        <ChevronDown className="mr-1.5 h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="mr-1.5 h-4 w-4" aria-hidden />
                      )}
                      Checklist &amp; sign-off
                    </Button>
                  </div>
                  {expanded ? (
                    <div className="space-y-4 border-t border-border/70 px-3 py-3">
                      {panel.loading ? (
                        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Loading
                          sign-offs…
                        </p>
                      ) : panel.error ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] text-destructive">{panel.error}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void loadPanel(row.userId, row.discipline)}
                          >
                            Try again
                          </Button>
                        </div>
                      ) : panel.data ? (
                        <>
                          {panel.data.current ? (
                            <SignoffRungView
                              rung={panel.data.current}
                              busyKey={busyKey}
                              onSign={sign}
                            />
                          ) : (
                            <EmptyNote>
                              The held rung is not configured in the ladder.
                            </EmptyNote>
                          )}
                          {panel.data.next ? (
                            <SignoffRungView
                              rung={panel.data.next}
                              busyKey={busyKey}
                              onSign={sign}
                            />
                          ) : (
                            <EmptyNote>This member holds the top rung of the ladder.</EmptyNote>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="What a sign-off means" icon={<Award className="h-4 w-4" />}>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>
            A tick certifies that you have seen the evidence for that item; the member cannot
            tick their own. Declining leaves the item open until it is ticked later.
          </p>
          <p>
            A placement is written by an admin only. Approving a promotion request moves it; a
            returned request leaves it where it is.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
