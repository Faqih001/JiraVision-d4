"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Gift, Pencil, Plus, RefreshCw, Star, Trash2 } from "lucide-react"
import { EmptyNote, relativeTime, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { LIVE_REFRESH_MS, useLiveRefresh } from "@/hooks/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type Redemption, type RewardItem } from "../_kit"

interface RewardsData {
  catalog: RewardItem[]
  ledger: Redemption[]
  balance: number
  xpPerLevel: number
  catalogOwnerUserId: number | null
}

interface Draft {
  id: string | null
  name: string
  cost: string
  description: string
  active: boolean
}

const emptyDraft: Draft = { id: null, name: "", cost: "", description: "", active: true }

export default function RewardsCatalogPage() {
  const { toast } = useToast()
  const [data, setData] = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [confirmDelete, setConfirmDelete] = useState<RewardItem | null>(null)
  const [confirmRedeem, setConfirmRedeem] = useState<RewardItem | null>(null)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const json = await jsonFetch<{ success: boolean; data: RewardsData }>("/api/gamification/rewards")
      setData(json.data)
    } catch (err) {
      if (quiet) return
      toast({ variant: "destructive", title: "Rewards", description: (err as Error).message })
      setData(null)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useLiveRefresh(() => load(true), { intervalMs: LIVE_REFRESH_MS })

  const openCreate = () => {
    setDraft(emptyDraft)
    setEditorOpen(true)
  }

  const openEdit = (reward: RewardItem) => {
    setDraft({
      id: reward.id,
      name: reward.name,
      cost: String(reward.cost),
      description: reward.description ?? "",
      active: reward.active,
    })
    setEditorOpen(true)
  }

  const validate = (): string | null => {
    const name = draft.name.trim()
    if (!name) return "Reward name is required."
    if (name.length > 80) return "Name must be 80 characters or fewer."
    const cost = Number(draft.cost)
    if (!Number.isFinite(cost) || cost <= 0) return "Cost must be a positive XP amount."
    if (data?.catalog.some((r) => r.id !== draft.id && r.name.trim().toLowerCase() === name.toLowerCase())) {
      return `A reward named "${name}" already exists.`
    }
    return null
  }

  const save = async () => {
    const error = validate()
    if (error) {
      toast({ variant: "destructive", title: "Reward", description: error })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        cost: Number(draft.cost),
        description: draft.description.trim() || undefined,
        active: draft.active,
      }
      if (draft.id) {
        await jsonFetch("/api/gamification/rewards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rewardId: draft.id, ...payload }),
        })
        toast({ title: "Reward updated", description: payload.name })
      } else {
        await jsonFetch("/api/gamification/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        toast({ title: "Reward created", description: payload.name })
      }
      setEditorOpen(false)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Reward", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (reward: RewardItem) => {
    setSaving(true)
    try {
      await jsonFetch("/api/gamification/rewards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: reward.id }),
      })
      toast({ title: "Reward removed", description: reward.name })
      setConfirmDelete(null)
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Reward", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const redeem = async (reward: RewardItem) => {
    setRedeemingId(reward.id)
    try {
      const json = await jsonFetch<{ success: boolean; data: { balance: number; ledger: Redemption[] } }>(
        "/api/gamification/rewards/redeem",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rewardId: reward.id }),
        },
      )
      setData((prev) => (prev ? { ...prev, balance: json.data.balance, ledger: json.data.ledger } : prev))
      toast({
        title: "Reward redeemed",
        description: `“${reward.name}” cost ${reward.cost} XP. You received a gamification notification.`,
      })
      setConfirmRedeem(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Redeem", description: (err as Error).message })
    } finally {
      setRedeemingId(null)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rewards catalog</h1>
          <p className="text-muted-foreground">
            Team-shared catalog stored in the rewards jsonb ledger; redemptions spend your XP balance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/gamification">
              <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
          </Button>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New reward
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Your spendable XP balance</p>
            <p className="text-2xl font-bold tabular-nums">{data?.balance ?? 0} XP</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Stored in the xp column (level model: {data?.xpPerLevel ?? 500} XP/level) — redeeming lowers it.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Catalog entries</p>
            <p className="text-2xl font-bold tabular-nums">{data?.catalog.length ?? 0}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Kept on the rewards jsonb of the team&apos;s first gamification row (userId{" "}
              {data?.catalogOwnerUserId ?? "—"}), so everyone shares one catalog.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Your redemptions</p>
            <p className="text-2xl font-bold tabular-nums">{data?.ledger.length ?? 0}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Each redemption logs to your own rewards jsonb ledger.</p>
          </CardContent>
        </Card>
      </div>

      <SectionCard title="Catalog" icon={<Gift className="h-4 w-4" />}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : data && data.catalog.length > 0 ? (
          <ul className="space-y-2">
            {data.catalog.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    {r.name}
                    {!r.active && (
                      <Badge variant="outline" className="text-[9px]">
                        inactive
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{r.description || "No description"}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold tabular-nums">
                  <Star className="h-3 w-3 text-amber-500" /> {r.cost} XP
                </span>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={!r.active || (data.balance ?? 0) < r.cost}
                  onClick={() => setConfirmRedeem(r)}
                >
                  {redeemingId === r.id ? "Redeeming…" : !r.active ? "Inactive" : (data.balance ?? 0) < r.cost ? "Need XP" : "Redeem"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  aria-label={`Delete ${r.name}`}
                  onClick={() => setConfirmDelete(r)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>
            The shared catalog is empty. Add the first reward with “New reward” — it becomes available to everyone.
          </EmptyNote>
        )}
      </SectionCard>

      <SectionCard title="Your redemption history" icon={<Gift className="h-4 w-4" />}>
        {data && data.ledger.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {data.ledger
              .slice()
              .sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
              .slice(0, 20)
              .map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
                  <span className="truncate">{l.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    −{l.cost} XP · {relativeTime(l.redeemedAt)}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <EmptyNote>No redemptions recorded yet.</EmptyNote>
        )}
      </SectionCard>

      {/* create/edit dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit reward" : "New reward"}</DialogTitle>
            <DialogDescription>
              Saves to the shared catalog jsonb. Any signed-in member can curate it; redemptions always hit the redeemer&apos;s
              own XP balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="reward-name">Name *</Label>
              <Input
                id="reward-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Half-day PTO"
                maxLength={80}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reward-cost">XP cost *</Label>
              <Input
                id="reward-cost"
                type="number"
                min={1}
                value={draft.cost}
                onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="reward-description">Description</Label>
              <Textarea
                id="reward-description"
                rows={2}
                maxLength={300}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="reward-active" className="text-sm">
                Active (redeemable)
              </Label>
              <Switch
                id="reward-active"
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: !!v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : draft.id ? "Save changes" : "Create reward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        {confirmDelete && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{confirmDelete.name}” from the catalog?</DialogTitle>
              <DialogDescription>
                Removes it for everyone. Past redemptions in member ledgers are kept. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => remove(confirmDelete)} disabled={saving}>
                {saving ? "Deleting…" : "Delete reward"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* redeem confirm */}
      <Dialog open={confirmRedeem !== null} onOpenChange={(open) => !open && setConfirmRedeem(null)}>
        {confirmRedeem && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redeem “{confirmRedeem.name}”?</DialogTitle>
              <DialogDescription>
                Spends {confirmRedeem.cost} XP from your balance of {data?.balance ?? 0} XP, logs the redemption to your
                rewards ledger and sends you a gamification notification.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmRedeem(null)} disabled={redeemingId !== null}>
                Cancel
              </Button>
              <Button onClick={() => redeem(confirmRedeem)} disabled={redeemingId !== null}>
                {redeemingId === confirmRedeem.id ? "Redeeming…" : `Redeem for ${confirmRedeem.cost} XP`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
