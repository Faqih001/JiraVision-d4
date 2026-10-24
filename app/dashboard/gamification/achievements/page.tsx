"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Award, Pencil, Plus, Trash2 } from "lucide-react"
import { AvatarCircle, EmptyNote, relativeTime, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type AchievementEntry, type RosterPlayer } from "../_kit"

interface AchievementRow {
  userId: number
  name: string
  avatar: string | null
  rank: number
  entry: AchievementEntry
}

interface Draft {
  userId: string
  name: string
  description: string
  xp: string
  unlockedAt: string
}

const emptyDraft: Draft = { userId: "", name: "", description: "", xp: "", unlockedAt: "" }

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

export default function AchievementsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<AchievementRow[] | null>(null)
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [userFilter, setUserFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<{ userId: number; name: string } | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<{ userId: number; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [achJson, rosterJson] = await Promise.all([
        jsonFetch<{ success: boolean; data: AchievementRow[] }>("/api/gamification/achievements"),
        jsonFetch<{ success: boolean; data: RosterPlayer[]; me: { userId: number } | null }>("/api/gamification"),
      ])
      setRows(achJson.data)
      setRoster(rosterJson.data)
      setMyUserId(rosterJson.me?.userId ?? null)
    } catch (err) {
      toast({ variant: "destructive", title: "Achievements", description: (err as Error).message })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(
    () => (rows ?? []).filter((r) => userFilter === "all" || String(r.userId) === userFilter),
    [rows, userFilter],
  )

  const openCreate = () => {
    setEditing(null)
    setDraft({ ...emptyDraft, userId: String(myUserId ?? "") })
    setDialogOpen(true)
  }

  const openEdit = (row: AchievementRow) => {
    setEditing({ userId: row.userId, name: row.entry.name })
    setDraft({
      userId: String(row.userId),
      name: row.entry.name,
      description: row.entry.description ?? "",
      xp: row.entry.xp === undefined ? "" : String(row.entry.xp),
      unlockedAt: toInputDate(row.entry.unlockedAt),
    })
    setDialogOpen(true)
  }

  const validate = (): string | null => {
    if (!draft.userId) return "Select a team member."
    const name = draft.name.trim()
    if (!name) return "Achievement name is required."
    if (name.length > 80) return "Name must be 80 characters or fewer."
    if (draft.xp && (!Number.isFinite(Number(draft.xp)) || Number(draft.xp) < 0)) {
      return "XP bonus must be a non-negative number."
    }
    if (draft.unlockedAt && Number.isNaN(Date.parse(draft.unlockedAt))) {
      return "Unlock date is invalid."
    }
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) {
      toast({ variant: "destructive", title: "Achievement", description: error })
      return
    }
    setSaving(true)
    try {
      const userId = Number(draft.userId)
      const payload = {
        userId,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        xp: draft.xp ? Number(draft.xp) : undefined,
        unlockedAt: draft.unlockedAt ? new Date(draft.unlockedAt).toISOString() : undefined,
      }
      if (editing) {
        await jsonFetch("/api/gamification/achievements", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: editing.userId, name: editing.name, updates: payload }),
        })
        toast({ title: "Achievement updated", description: payload.name })
      } else {
        await jsonFetch("/api/gamification/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({
          title: editing === null ? "Achievement unlocked" : "Saved",
          description:
            userId !== myUserId
              ? `“${payload.name}” unlocked for that teammate — they received a gamification notification.`
              : `“${payload.name}” added to your achievements.`,
        })
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Achievement", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (target: { userId: number; name: string }) => {
    setDeleting(true)
    try {
      await jsonFetch("/api/gamification/achievements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target.userId, name: target.name }),
      })
      toast({ title: "Achievement removed", description: target.name })
      setConfirmDelete(null)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Achievement", description: (err as Error).message })
    } finally {
      setDeleting(false)
    }
  }

  const ownerName = (userId: number) => roster.find((r) => r.userId === userId)?.name ?? `User ${userId}`

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-muted-foreground">
            Every achievement entry across the team, read live from the achievements jsonb on each gamification row.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/gamification">
              <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
          </Button>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Unlock achievement
          </Button>
        </div>
      </div>

      <SectionCard
        title="Team achievement log"
        icon={<Award className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="user-filter" className="sr-only">
              Filter by member
            </Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger id="user-filter" className="h-8 w-44 text-xs">
                <SelectValue placeholder="Filter by member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All members</SelectItem>
                {roster.map((r) => (
                  <SelectItem key={r.userId} value={String(r.userId)}>
                    {r.name}
                    {r.userId === myUserId ? " (you)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <ul className="space-y-2">
            {filtered.map((row) => (
              <li key={`${row.userId}-${row.entry.name}`} className="flex items-center gap-3 rounded-lg border p-2.5">
                <AvatarCircle name={row.name} avatar={row.avatar} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{row.entry.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {ownerName(row.userId)}
                    {row.userId === myUserId ? " (you)" : ""} · {row.entry.description ?? "no description"}
                    {row.entry.unlockedAt ? ` · unlocked ${relativeTime(row.entry.unlockedAt)}` : " · no unlock date"}
                    {row.entry.unlockedByUserId
                      ? ` · by ${ownerName(row.entry.unlockedByUserId)}`
                      : ""}
                  </p>
                </div>
                {row.entry.xp !== undefined && row.entry.xp > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    +{row.entry.xp} XP
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  aria-label={`Edit ${row.entry.name}`}
                  onClick={() => openEdit(row)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  aria-label={`Delete ${row.entry.name}`}
                  onClick={() => setConfirmDelete({ userId: row.userId, name: row.entry.name })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>
            {userFilter === "all"
              ? "No achievements recorded yet — unlock the first one."
              : "This member has no achievements recorded yet."}
          </EmptyNote>
        )}
      </SectionCard>

      {/* unlock/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit “${editing.name}”` : "Unlock an achievement"}</DialogTitle>
            <DialogDescription>
              Persists to the achievements jsonb on the selected member&apos;s row. Unlocks performed for someone else send
              them a gamification notification (managers/admins only).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ach-user">Team member</Label>
              <Select value={draft.userId} onValueChange={(v) => setDraft({ ...draft, userId: v })} disabled={!!editing}>
                <SelectTrigger id="ach-user">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((r) => (
                    <SelectItem key={r.userId} value={String(r.userId)}>
                      {r.name}
                      {r.userId === myUserId ? " (you)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ach-name">Name *</Label>
              <Input
                id="ach-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Sprint Champion"
                maxLength={80}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ach-xp">XP bonus (optional)</Label>
                <Input
                  id="ach-xp"
                  type="number"
                  min={0}
                  value={draft.xp}
                  onChange={(e) => setDraft({ ...draft, xp: e.target.value })}
                  placeholder="e.g. 250"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ach-date">Unlocked on</Label>
                <Input
                  id="ach-date"
                  type="date"
                  value={draft.unlockedAt}
                  onChange={(e) => setDraft({ ...draft, unlockedAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ach-description">Description (optional)</Label>
              <Textarea
                id="ach-description"
                rows={2}
                maxLength={300}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        {confirmDelete && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove “{confirmDelete.name}”?</DialogTitle>
              <DialogDescription>
                Deletes this achievement entry from {ownerName(confirmDelete.userId)}&apos;s gamification row. This cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => remove(confirmDelete)} disabled={deleting}>
                {deleting ? "Deleting…" : "Remove entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
