"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronUp, Minus, Trophy } from "lucide-react"
import { AvatarCircle, EmptyNote, SectionCard } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { jsonFetch, type RosterPlayer } from "../_kit"

interface TaskLite {
  id: number
  status: string
  assigneeId: number | null
  updatedAt: string
}

type SortKey = "rank" | "name" | "level" | "xp" | "tasksCompleted" | "recentXp"
type Period = "all" | "4w"

const MS_PER_DAY = 86_400_000
const XP_PER_DONE_TASK = 50

export default function GamificationLeaderboardPage() {
  const { toast } = useToast()
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null)
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("all")
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [myUserId, setMyUserId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rosterJson, tasksJson] = await Promise.all([
        jsonFetch<{ success: boolean; data: RosterPlayer[]; me: { userId: number } | null }>("/api/gamification"),
        jsonFetch<{ success: boolean; data: TaskLite[] }>("/api/tasks?pageSize=200"),
      ])
      setRoster(rosterJson.data)
      setMyUserId(rosterJson.me?.userId ?? null)
      setTasks(Array.isArray(tasksJson.data) ? tasksJson.data : [])
    } catch (err) {
      toast({ variant: "destructive", title: "Leaderboard", description: (err as Error).message })
      setRoster([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  /** XP estimated from done-task completions inside a window, per assignee. */
  const recentXpByUser = useCallback(
    (days: number) => {
      const cutoff = Date.now() - days * MS_PER_DAY
      const counts = new Map<number, number>()
      for (const t of tasks) {
        if (t.status !== "done" || t.assigneeId == null) continue
        if (new Date(t.updatedAt).getTime() < cutoff) continue
        counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1)
      }
      const out = new Map<number, number>()
      counts.forEach((count, userId) => out.set(userId, count * XP_PER_DONE_TASK))
      return out
    },
    [tasks],
  )

  const recent4w = useMemo(() => recentXpByUser(28), [recentXpByUser])
  const recent1w = useMemo(() => recentXpByUser(7), [recentXpByUser])

  const ranked = useMemo(() => {
    if (!roster) return []
    const xpOf = (p: RosterPlayer) => (period === "all" ? p.xp : recent4w.get(p.userId) ?? 0)
    return roster
      .slice()
      .sort((a, b) => xpOf(b) - xpOf(a) || b.xp - a.xp || a.userId - b.userId)
      .map((p, idx) => ({ player: p, periodXp: xpOf(p), periodRank: idx + 1 }))
  }, [roster, period, recent4w])

  /**
   * Honest movement model: no previousRanks jsonb exists on the rows, so the
   * "last week" rank is reconstructed by subtracting the estimated XP earned
   * from tasks completed in the last 7 days (50 XP per done task) from each
   * player's stored XP and re-ranking. The UI labels this as an estimate.
   */
  const movement = useMemo(() => {
    if (!roster) return new Map<number, number>()
    const priorXpOf = (p: RosterPlayer) => Math.max(0, p.xp - (recent1w.get(p.userId) ?? 0))
    const priorOrder = roster.slice().sort((a, b) => priorXpOf(b) - priorXpOf(a) || a.userId - b.userId)
    const priorRank = new Map<number, number>()
    priorOrder.forEach((p, idx) => priorRank.set(p.userId, idx + 1))
    const out = new Map<number, number>()
    roster.forEach((p) => out.set(p.userId, (priorRank.get(p.userId) ?? p.rank) - p.rank))
    return out
  }, [roster, recent1w])

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    const numeric = (r: (typeof ranked)[number]): number => {
      switch (sortKey) {
        case "rank":
          return r.player.rank
        case "level":
          return r.player.level
        case "xp":
          return r.player.xp
        case "tasksCompleted":
          return r.player.tasksCompleted
        case "recentXp":
          return r.periodXp
        default:
          return 0
      }
    }
    return ranked.slice().sort((a, b) => {
      const res = sortKey === "name" ? a.player.name.localeCompare(b.player.name) : numeric(a) - numeric(b)
      return res * dir || a.player.userId - b.player.userId
    })
  }, [ranked, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  const podium = ranked.slice(0, 3)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Team leaderboard</h1>
          <p className="text-muted-foreground">Full roster on real stored XP, level and completion counts.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" asChild>
          <Link href="/dashboard/gamification">
            <ArrowLeft className="h-4 w-4" /> Hub
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} aria-label="Leaderboard period">
          <TabsList>
            <TabsTrigger value="all">All-time (stored XP)</TabsTrigger>
            <TabsTrigger value="4w">Last 4 weeks (est.)</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="max-w-md text-[10px] text-muted-foreground">
          &ldquo;Last 4 weeks&rdquo; ranks by an estimate: {XP_PER_DONE_TASK} XP per task completed in the window (from task
          updatedAt dates). Movement compares today&apos;s stored-XP rank against last week&apos;s, reconstructed the same
          way — there is no stored previous-rank history yet.
        </p>
      </div>

      {loading && (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!loading && roster && roster.length === 0 && (
        <EmptyNote>No gamification rows exist yet, so there is nothing to rank.</EmptyNote>
      )}

      {!loading && podium.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {podium.map(({ player, periodXp }, idx) => (
            <Card key={player.userId} className={player.userId === myUserId ? "border-[hsl(var(--chart-pine))]" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--chart-clay))] text-sm font-bold text-white">
                  {idx === 0 ? <Trophy className="h-5 w-5" /> : `#${idx + 1}`}
                </div>
                <AvatarCircle name={player.name} avatar={player.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {player.name}
                    {player.userId === myUserId && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {player.jobTitle ?? player.role} · Lv {player.level}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums">
                    {period === "all" ? `${player.xp} XP` : `${periodXp} est. XP · ${player.xp} stored`}
                  </p>
                </div>
                {period === "all" && <MovementBadge delta={movement.get(player.userId) ?? 0} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <SectionCard title={period === "all" ? "All-time standings" : "Last 4 weeks (estimated XP)"} icon={<Trophy className="h-4 w-4" />}>
          {sorted.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <SortHeader label="Stored rank" k="rank" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader label="Member" k="name" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader label="Level" k="level" right sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader label="Stored XP" k="xp" right sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                    <SortHeader
                      label={period === "all" ? "Done" : "Est. 4w XP"}
                      k={period === "all" ? "tasksCompleted" : "recentXp"}
                      right
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onToggle={toggleSort}
                    />
                    <th className="py-2 text-right font-medium">Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(({ player, periodXp }) => (
                    <tr
                      key={player.userId}
                      className={`border-b last:border-0 ${
                        player.userId === myUserId ? "bg-[hsl(var(--chart-pine)/0.08)] font-medium" : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="py-2 pr-2 tabular-nums">
                        <Badge variant="outline" className="text-[10px]">
                          #{player.rank}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2">
                        <span className="flex items-center gap-2">
                          <AvatarCircle name={player.name} avatar={player.avatar} size={24} />
                          <span className="truncate">{player.name}</span>
                          {player.userId === myUserId && (
                            <Badge variant="secondary" className="text-[9px]">
                              you
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{player.level}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{player.xp}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {period === "all" ? player.tasksCompleted : periodXp}
                      </td>
                      <td className="py-2 text-right">
                        <MovementBadge delta={movement.get(player.userId) ?? 0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote>No standings yet.</EmptyNote>
          )}
        </SectionCard>
      )}
    </div>
  )
}

function SortHeader({
  label,
  k,
  right,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string
  k: SortKey
  right?: boolean
  sortKey: SortKey
  sortDir: "asc" | "desc"
  onToggle: (key: SortKey) => void
}) {
  return (
    <th className={`py-2 pr-2 font-medium ${right ? "text-right" : "text-left"}`}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onToggle(k)}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <Minus className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  )
}

function MovementBadge({ delta }: { delta: number }) {  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${up ? "text-[hsl(var(--chart-pine))]" : "text-[hsl(var(--destructive))]"}`}
      title={up ? `Up ${delta} place(s) vs last week (estimated)` : `Down ${Math.abs(delta)} place(s) vs last week (estimated)`}
    >
      {up ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {Math.abs(delta)}
    </span>
  )
}
