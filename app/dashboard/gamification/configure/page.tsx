"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Info, RefreshCw, Save, Settings } from "lucide-react"
import { EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type GamificationSettings } from "../_kit"

interface ConfigureData {
  settings: GamificationSettings
  xpPerLevel: number
  defaultXpPerLevel: number
  level: number
  xp: number
  updatedAt: string | null
}

interface Toggle {
  key: keyof GamificationSettings
  label: string
  hint: string
  fallback: boolean
}

const TOGGLES: Toggle[] = [
  {
    key: "enableGamification",
    label: "Gamification enabled",
    hint: "Your personal switch for gamification surfaces.",
    fallback: true,
  },
  {
    key: "publicLeaderboard",
    label: "Public leaderboard",
    hint: "Show your XP and rank to the whole team.",
    fallback: true,
  },
  { key: "notifySkillTree", label: "Skill-tree notifications", hint: "Notify you when a skill tree is created.", fallback: true },
  { key: "notifyRedeem", label: "Redemption notifications", hint: "Notify you when a reward is redeemed.", fallback: true },
  {
    key: "notifyAchievement",
    label: "Achievement notifications",
    hint: "Notify you on unlocks by others and XP-threshold level-ups.",
    fallback: true,
  },
  { key: "notifyConfigure", label: "Settings-change notifications", hint: "Notify you when these settings are saved.", fallback: true },
]

export default function GamificationConfigurePage() {
  const { toast } = useToast()
  const [data, setData] = useState<ConfigureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [xpOverride, setXpOverride] = useState("")
  const [toggles, setToggles] = useState<Record<string, boolean>>({})

  const applyLoaded = useCallback((loaded: ConfigureData) => {
    setData(loaded)
    setXpOverride(loaded.settings.xpPerLevelOverride === undefined ? "" : String(loaded.settings.xpPerLevelOverride))
    const next: Record<string, boolean> = {}
    for (const t of TOGGLES) next[t.key] = loaded.settings[t.key] !== false ? true : false
    setToggles(next)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const json = await jsonFetch<{ success: boolean; data: ConfigureData }>("/api/gamification/configure")
      applyLoaded(json.data)
    } catch (err) {
      toast({ variant: "destructive", title: "Configure", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast, applyLoaded])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    const trimmed = xpOverride.trim()
    if (trimmed) {
      const n = Number(trimmed)
      if (!Number.isFinite(n) || n < 100 || n > 10_000) {
        toast({ variant: "destructive", title: "Configure", description: "XP per level override must be 100–10000 (or empty)." })
        return
      }
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { xpPerLevelOverride: trimmed || null }
      for (const t of TOGGLES) payload[t.key] = toggles[t.key] ?? false
      await jsonFetch("/api/gamification/configure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      toast({ title: "Settings saved", description: "Stored on your gamification row — a confirmation notification was sent." })
      await load()
    } catch (err) {
      toast({ variant: "destructive", title: "Configure", description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamification settings</h1>
          <p className="text-muted-foreground">
            Your personal configuration, persisted in the settings bag of your gamification row&apos;s rewards jsonb.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/gamification">
              <ArrowLeft className="h-4 w-4" /> Hub
            </Link>
          </Button>
          <Button size="sm" className="gap-1" onClick={save} disabled={saving || loading || !data}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      )}

      {!loading && !data && <EmptyNote>Could not load your gamification settings.</EmptyNote>}

      {!loading && data && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-4 text-xs">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Current config:</span>
              <Badge variant="secondary">XP/level {data.xpPerLevel}</Badge>
              <Badge variant="outline">you are level {data.level}</Badge>
              <Badge variant="outline">{data.xp} XP stored</Badge>
              <Badge variant="outline">
                override {data.settings.xpPerLevelOverride === undefined ? "none" : `${data.settings.xpPerLevelOverride} XP`}
              </Badge>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="XP & levels" icon={<Info className="h-4 w-4" />}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="xp-per-level">XP per level override</Label>
                  <Input
                    id="xp-per-level"
                    type="number"
                    min={100}
                    max={10000}
                    value={xpOverride}
                    onChange={(e) => setXpOverride(e.target.value)}
                    placeholder={String(data.defaultXpPerLevel)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave empty to use the default {data.defaultXpPerLevel} XP per level (the model the main dashboard uses).
                    An override here changes level math on these gamification pages only.
                  </p>
                </div>
                <p className="rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  Effective value: <span className="font-semibold text-foreground">{data.xpPerLevel} XP per level</span> — your
                  next level is at level × this value.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Toggles & notifications" icon={<Settings className="h-4 w-4" />}>
              <div className="space-y-3">
                {TOGGLES.map((t) => (
                  <div key={t.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Label htmlFor={`toggle-${t.key}`} className="text-xs font-medium">
                        {t.label}
                      </Label>
                      <p className="text-[10px] text-muted-foreground">{t.hint}</p>
                    </div>
                    <Switch
                      id={`toggle-${t.key}`}
                      checked={toggles[t.key] ?? t.fallback}
                      onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [t.key]: !!v }))}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="What these settings control" icon={<Info className="h-4 w-4" />}>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Skill-tree creation, reward redemptions, achievement unlocks and level-ups send “gamification” notifications — each channel can be muted above.</li>
              <li>Storage: no new tables were needed. Settings and your redemption ledger live in the rewards jsonb of your gamification row; skill trees in skillTrees jsonb; achievements in achievements jsonb; level/xp/tasksCompleted stay in their columns.</li>
              <li>The shared reward catalog lives in the rewards jsonb of the team&apos;s first gamification row (lowest userId) and is editable from the Rewards page.</li>
            </ul>
          </SectionCard>
        </>
      )}
    </div>
  )
}
