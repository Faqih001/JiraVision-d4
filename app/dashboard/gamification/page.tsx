"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Award,
  BarChart3,
  CalendarDays,
  GitBranch,
  Gift,
  LineChart as LineChartIcon,
  Bell,
  RefreshCw,
  Settings,
  Star,
  Trophy,
  Users,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { AvatarCircle, AXIS, EmptyNote, relativeTime, SectionCard, TOOLTIP_STYLE } from "@/components/dashboard-kit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  computeStreak,
  dayKey,
  jsonFetch,
  SUBPAGES,
  weekKey,
  XP_ESTIMATE_PER_DONE_TASK,
  type GamificationSettings,
  type MeSnapshot,
  type Redemption,
  type RewardItem,
  type RosterPlayer,
} from "./_kit"

interface TaskLite {
  id: number
  status: string
  assigneeId: number | null
  updatedAt: string
}

interface NotificationLite {
  id: number
  type: string
  title: string
  body: string | null
  createdAt: string
  isRead: boolean
}

interface RewardsPayload {
  success: boolean
  data: { catalog: RewardItem[]; ledger: Redemption[]; balance: number; xpPerLevel: number; catalogOwnerUserId: number | null }
}

interface ConfigurePayload {
  success: boolean
  data: { settings: GamificationSettings; xpPerLevel: number; defaultXpPerLevel: number }
}

export default function GamificationHubPage() {
  const { toast } = useToast()
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null)
  const [me, setMe] = useState<MeSnapshot | null>(null)
  const [rewards, setRewards] = useState<RewardsPayload["data"] | null>(null)
  const [settings, setSettings] = useState<ConfigurePayload["data"] | null>(null)
  const [tasks, setTasks] = useState<TaskLite[]>([])
  const [activity, setActivity] = useState<NotificationLite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [redeemTarget, setRedeemTarget] = useState<RewardItem | null>(null)
  const [redeeming, setRedeeming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rosterJson, rewardsJson, configureJson, tasksJson, notifJson] = await Promise.all([
        jsonFetch<{ success: boolean; data: RosterPlayer[]; me: MeSnapshot | null }>("/api/gamification"),
        jsonFetch<RewardsPayload>("/api/gamification/rewards"),
        jsonFetch<ConfigurePayload>("/api/gamification/configure"),
        jsonFetch<{ success: boolean; data: TaskLite[] }>("/api/tasks?pageSize=200"),
        fetch("/api/notifications?limit=50").then((r) => r.json()),
      ])
      setRoster(rosterJson.data)
      setMe(rosterJson.me)
      setRewards(rewardsJson.data)
      setSettings(configureJson.data)
      setTasks(Array.isArray(tasksJson.data) ? tasksJson.data : [])
      setActivity(Array.isArray(notifJson?.items) ? (notifJson.items as NotificationLite[]) : [])
    } catch (err) {
      toast({ variant: "destructive", title: "Gamification", description: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [rosterJson, rewardsJson, configureJson, tasksJson, notifJson] = await Promise.all([
        jsonFetch<{ success: boolean; data: RosterPlayer[]; me: MeSnapshot | null }>("/api/gamification"),
        jsonFetch<RewardsPayload>("/api/gamification/rewards"),
        jsonFetch<ConfigurePayload>("/api/gamification/configure"),
        jsonFetch<{ success: boolean; data: TaskLite[] }>("/api/tasks?pageSize=200"),
        fetch("/api/notifications?limit=50").then((r) => r.json()),
      ])
      setRoster(rosterJson.data)
      setMe(rosterJson.me)
      setRewards(rewardsJson.data)
      setSettings(configureJson.data)
      setTasks(Array.isArray(tasksJson.data) ? tasksJson.data : [])
      setActivity(Array.isArray(notifJson?.items) ? (notifJson.items as NotificationLite[]) : [])
      toast({ title: "Gamification refreshed" })
    } catch {
      toast({ variant: "destructive", title: "Gamification", description: "Refresh failed." })
    } finally {
      setRefreshing(false)
    }
  }, [toast])

  const redeem = useCallback(
    async (reward: RewardItem) => {
      setRedeeming(true)
      try {
        const json = await jsonFetch<{ success: boolean; data: { redemption: Redemption; balance: number; ledger: Redemption[] } }>(
          "/api/gamification/rewards/redeem",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rewardId: reward.id }),
          },
        )
        setRewards((prev) => (prev ? { ...prev, balance: json.data.balance, ledger: json.data.ledger } : prev))
        toast({
          title: "Reward redeemed",
          description: `"${reward.name}" cost ${reward.cost} XP · ${json.data.balance} XP left. A gamification notification was sent.`,
        })
        setRedeemTarget(null)
      } catch (err) {
        toast({ variant: "destructive", title: "Redeem failed", description: (err as Error).message })
      } finally {
        setRedeeming(false)
      }
    },
    [toast],
  )

  /* ---- derived real-data computations ---- */

  const myDoneTasks = useMemo(
    () => (me ? tasks.filter((t) => t.status === "done" && t.assigneeId === me.userId) : []),
    [tasks, me],
  )

  const doneDates = useMemo(() => {
    const set = new Set<string>()
    for (const t of myDoneTasks) set.add(dayKey(new Date(t.updatedAt)))
    return set
  }, [myDoneTasks])

  const streak = useMemo(() => computeStreak(doneDates), [doneDates])

  const streakCells = useMemo(() => {
    const cells: { key: string; label: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const key = dayKey(d)
      cells.push({
        key,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: myDoneTasks.filter((t) => dayKey(new Date(t.updatedAt)) === key).length,
      })
    }
    return cells
  }, [myDoneTasks])

  const weeklyXp = useMemo(() => {
    const buckets = new Map<string, number>()
    for (let i = 7; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      buckets.set(weekKey(d), 0)
    }
    for (const t of myDoneTasks) {
      const key = weekKey(new Date(t.updatedAt))
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    return [...buckets.entries()].map(([key, count]) => ({
      week: new Date(key).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      xp: count * XP_ESTIMATE_PER_DONE_TASK,
    }))
  }, [myDoneTasks])

  const pointsByMember = useMemo(
    () =>
      (roster ?? [])
        .slice()
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 8)
        .map((r) => ({ name: r.name.split(" ")[0], xp: r.xp, isMe: r.userId === me?.userId })),
    [roster, me],
  )

  const myTrees = me && roster ? (roster.find((r) => r.userId === me.userId)?.skillTrees ?? []) : []
  const myAchievementEntries =
    me && roster ? (roster.find((r) => r.userId === me.userId)?.achievements ?? []) : []

  const achievementRules = useMemo(() => {
    if (!me) return []
    return [
      { name: "First Steps", hint: "Close your first task", value: myDoneTasks.length, target: 1 },
      { name: "Task Machine", hint: "Complete 10 tasks", value: myDoneTasks.length, target: 10 },
      { name: "Level 2", hint: "Reach level 2", value: me.level, target: 2 },
      { name: "Level 3", hint: "Reach level 3", value: me.level, target: 3 },
      { name: "Skill Seeker", hint: "Start one skill tree", value: myTrees.length, target: 1 },
      { name: "Tree Gardener", hint: "Grow three skill trees", value: myTrees.length, target: 3 },
      { name: "Streak Starter", hint: "3-day completion streak", value: streak, target: 3 },
      { name: "On Fire", hint: "7-day completion streak", value: streak, target: 7 },
      { name: "Reward Redeemer", hint: "Redeem a reward", value: rewards?.ledger.length ?? 0, target: 1 },
    ]
  }, [me, myDoneTasks.length, myTrees.length, streak, rewards])

  const gamificationActivity = useMemo(
    () => activity.filter((n) => n.type === "gamification").slice(0, 8),
    [activity],
  )

  const xpPerLevel = me?.xpPerLevel ?? 500
  const nextLevelXp = me ? me.level * xpPerLevel : 0
  const levelProgress = me ? Math.min(100, Math.round(((me.xp % xpPerLevel) / xpPerLevel) * 100)) : 0

  /* ------------------------------------------------------------- render */

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gamification</h1>
          <p className="text-muted-foreground">Levels, XP, skill trees, achievements and rewards — all from live team data.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={refresh} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* 2 — nav chips */}
      <nav aria-label="Gamification subpages" className="flex flex-wrap gap-2">
        {SUBPAGES.map((s) => (
          <Button key={s.href} asChild size="sm" variant="outline" className="text-xs">
            <Link href={s.href}>{s.label}</Link>
          </Button>
        ))}
      </nav>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!loading && !me && <EmptyNote>No gamification row found for your account yet — create one from the Configure page.</EmptyNote>}

      {!loading && me && (
        <>
          {/* 3 — level/XP hero */}
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <AvatarCircle name={me.name} avatar={me.avatar} size={64} />
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--chart-pine))] text-xs font-bold text-white">
                    {me.level}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{me.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rank #{me.rank} of {roster?.length ?? 0} · {me.xp} XP · level {me.level}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <Trophy className="h-3 w-3" /> Level {me.level}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <CalendarDays className="h-3 w-3" /> {streak}-day streak
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-[11px]">
                      <Star className="h-3 w-3" /> {myDoneTasks.length} done tasks
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="md:px-4">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">
                    {me.xp % xpPerLevel} / {xpPerLevel} XP toward level {me.level + 1}
                  </span>
                  <span className="text-muted-foreground">next level at {nextLevelXp} XP</span>
                </div>
                <Progress value={levelProgress} className="mt-1.5 h-2" aria-label="XP progress toward next level" />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  XP model: {xpPerLevel} XP per level (same as the main dashboard; overridable in Configure).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href="/dashboard/gamification/add-skill">
                    <GitBranch className="h-4 w-4" /> New skill tree
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link href="/dashboard/gamification/configure">
                    <Settings className="h-4 w-4" /> Configure
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4+5 — leaderboard */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <SectionCard
              title="XP podium"
              icon={<Trophy className="h-4 w-4" />}
              action={
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link href="/dashboard/gamification/leaderboard">Full leaderboard</Link>
                </Button>
              }
            >
              {(roster?.length ?? 0) === 0 ? (
                <EmptyNote>No players yet.</EmptyNote>
              ) : (
                <div className="grid grid-cols-3 items-end gap-2">
                  {([roster?.[1], roster?.[0], roster?.[2]] as (RosterPlayer | undefined)[]).map((player, idx) =>
                    !player ? (
                      <div key={`empty-${idx}`} />
                    ) : (
                      <div key={player.userId} className="flex flex-col items-center gap-1.5 text-center">
                        <AvatarCircle name={player.name} avatar={player.avatar} size={32} />
                        <p className="w-full truncate text-[11px] font-medium">
                          {player.userId === me.userId ? "You" : player.name.split(" ")[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{player.xp} XP</p>
                        <div
                          className={`flex w-full items-start justify-center rounded-t-md pt-1 text-xs font-bold text-white ${
                            idx === 1 ? "h-24 bg-[hsl(var(--chart-clay))]" : idx === 0 ? "h-20 bg-[hsl(var(--chart-stone))]" : "h-16 bg-[hsl(var(--chart-moss))]"
                          }`}
                        >
                          #{player.rank}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </SectionCard>

            <SectionCard title="XP leaderboard" icon={<Users className="h-4 w-4" />}>
              {roster && roster.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-1.5 pr-2 font-medium">#</th>
                        <th className="py-1.5 pr-2 font-medium">Member</th>
                        <th className="py-1.5 pr-2 text-right font-medium">Level</th>
                        <th className="py-1.5 pr-2 text-right font-medium">XP</th>
                        <th className="py-1.5 text-right font-medium">Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((p) => (
                        <tr
                          key={p.userId}
                          className={`border-b last:border-0 ${p.userId === me.userId ? "bg-[hsl(var(--chart-pine)/0.08)] font-medium" : "hover:bg-muted/40"}`}
                        >
                          <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">{p.rank}</td>
                          <td className="flex items-center gap-2 py-1.5 pr-2">
                            <AvatarCircle name={p.name} avatar={p.avatar} size={20} />
                            <span className="truncate">{p.name}</span>
                            {p.userId === me.userId && (
                              <Badge variant="secondary" className="ml-auto shrink-0 text-[9px]">
                                you
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">{p.level}</td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">{p.xp}</td>
                          <td className="py-1.5 text-right tabular-nums">{p.tasksCompleted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyNote>No leaderboard rows yet.</EmptyNote>
              )}
            </SectionCard>
          </div>

          {/* 6 — skill trees */}
          <SectionCard
            title="Skill trees"
            icon={<GitBranch className="h-4 w-4" />}
            action={
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/dashboard/gamification/skill-tree">Manage trees</Link>
              </Button>
            }
          >
            {myTrees.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myTrees.map((t) => (
                  <div key={t.name} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        Lv {t.level}
                      </Badge>
                    </div>
                    <Progress value={t.progress} className="mt-2 h-1.5" aria-label={`Progress in ${t.name}`} />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t.progress}% complete
                      {t.tasksToNextLevel > 0 ? ` · ${t.tasksToNextLevel} tasks to next level` : ""}
                    </p>
                    <Button asChild size="sm" variant="ghost" className="mt-1 h-7 px-2 text-[11px]">
                      <Link href="/dashboard/gamification/skill-tree">Edit “{t.name}”</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyNote>
                No skill trees yet —{" "}
                <Link className="underline" href="/dashboard/gamification/add-skill">
                  add your first one
                </Link>
                .
              </EmptyNote>
            )}
          </SectionCard>

          {/* 7 — achievements wall */}
          <SectionCard
            title="Achievements wall"
            icon={<Award className="h-4 w-4" />}
            action={
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/dashboard/gamification/achievements">All achievements</Link>
              </Button>
            }
          >
            <p className="mb-2 text-[10px] text-muted-foreground">
              Unlocked vs locked is computed live from your real counters: done tasks from the task board, level from XP
              ({xpPerLevel} XP/level), streak from completion dates, trees and redemptions from your row.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {achievementRules.map((rule) => {
                const unlocked = rule.value >= rule.target
                return (
                  <div
                    key={rule.name}
                    className={`rounded-lg border p-2.5 ${unlocked ? "bg-[hsl(var(--chart-pine)/0.08)]" : "opacity-70"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium">{rule.name}</p>
                      <Badge variant={unlocked ? "secondary" : "outline"} className="shrink-0 text-[9px]">
                        {unlocked ? "unlocked" : `${rule.value}/${rule.target}`}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{rule.hint}</p>
                    {!unlocked && <Progress value={Math.min(100, (rule.value / rule.target) * 100)} className="mt-1.5 h-1" />}
                  </div>
                )
              })}
            </div>
            {myAchievementEntries.length > 0 && (
              <>
                <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recorded achievements
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {myAchievementEntries.map((a) => (
                    <Badge key={a.name} variant="outline" className="gap-1 text-[10px]">
                      <Award className="h-3 w-3 text-[hsl(var(--chart-clay))]" />
                      {a.name}
                      {a.unlockedAt && <span className="text-muted-foreground">· {relativeTime(a.unlockedAt)}</span>}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          {/* 8+9 — rewards catalog + ledger */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <SectionCard
              title="Reward catalog"
              icon={<Gift className="h-4 w-4" />}
              action={
                <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                  <Link href="/dashboard/gamification/rewards">Manage rewards</Link>
                </Button>
              }
            >
              <p className="mb-2 text-[10px] text-muted-foreground">
                Redeeming deducts the reward&apos;s XP cost from your XP balance (your spendable progress) and logs the
                redemption on your gamification row; you receive a gamification notification.
              </p>
              {rewards && rewards.catalog.length > 0 ? (
                <div className="space-y-2">
                  {rewards.catalog
                    .filter((r) => r.active)
                    .map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{r.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{r.description ?? "—"}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">{r.cost} XP</span>
                        <Button
                          size="sm"
                          className="h-7 shrink-0 text-[11px]"
                          disabled={(rewards.balance ?? 0) < r.cost}
                          onClick={() => setRedeemTarget(r)}
                        >
                          {(rewards.balance ?? 0) < r.cost ? "Need XP" : "Redeem"}
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyNote>
                  The shared catalog is empty —{" "}
                  <Link className="underline" href="/dashboard/gamification/rewards">
                    add the first reward
                  </Link>
                  .
                </EmptyNote>
              )}
              <p className="pt-2 text-[10px] text-muted-foreground">Balance: {rewards?.balance ?? 0} XP available.</p>
            </SectionCard>

            <SectionCard title="My redemptions" icon={<Gift className="h-4 w-4" />}>
              {rewards && rewards.ledger.length > 0 ? (
                <ul className="space-y-1.5 text-xs">
                  {rewards.ledger
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                        <span className="truncate">{l.name}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          −{l.cost} XP · {relativeTime(l.redeemedAt)}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <EmptyNote>No rewards redeemed yet.</EmptyNote>
              )}
            </SectionCard>
          </div>

          {/* 10+11 — charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="XP by member" icon={<BarChart3 className="h-4 w-4" />}>
              {pointsByMember.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={pointsByMember}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={AXIS} />
                    <YAxis tick={AXIS} width={36} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="xp" name="XP (stored)" radius={[3, 3, 0, 0]}>
                      {pointsByMember.map((entry) => (
                        <Cell key={entry.name} fill={entry.isMe ? "hsl(var(--chart-pine))" : "hsl(var(--chart-stone))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyNote>No members with gamification rows yet.</EmptyNote>
              )}
            </SectionCard>

            <SectionCard title="Weekly XP trend (my done tasks)" icon={<LineChartIcon className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weeklyXp}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={AXIS} minTickGap={16} />
                  <YAxis tick={AXIS} width={30} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="xp" name="XP" stroke="hsl(var(--chart-moss))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
              <p className="pt-1 text-[10px] text-muted-foreground">
                Estimated: {XP_ESTIMATE_PER_DONE_TASK} XP per task you completed, bucketed by the task&apos;s last-updated
                date over the last 8 weeks.
              </p>
            </SectionCard>
          </div>

          {/* 12 — streak calendar */}
          <SectionCard
            title="Completion streak — last 30 days"
            icon={<CalendarDays className="h-4 w-4" />}
            action={<Badge variant="secondary" className="text-[10px]">{streak}-day streak</Badge>}
          >
            {myDoneTasks.length === 0 ? (
              <EmptyNote>Complete a task to start a streak — days come from the updated dates of your done tasks.</EmptyNote>
            ) : (
              <div className="grid grid-cols-10 gap-1.5" role="img" aria-label="Grid of task completions for the last 30 days">
                {streakCells.map((c) => (
                  <div
                    key={c.key}
                    title={`${c.label}: ${c.count} task${c.count === 1 ? "" : "s"} completed`}
                    className="aspect-square rounded-sm border"
                    style={{
                      backgroundColor:
                        c.count === 0
                          ? "hsl(var(--muted))"
                          : `color-mix(in srgb, hsl(var(--chart-pine)) ${Math.min(100, 25 + c.count * 25)}%, hsl(var(--muted)))`,
                    }}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* 13 — recent gamification activity */}
          <SectionCard
            title="Recent gamification activity"
            icon={<Bell className="h-4 w-4" />}
            action={
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/dashboard/notifications">All notifications</Link>
              </Button>
            }
          >
            {gamificationActivity.length > 0 ? (
              <ul className="space-y-1.5">
                {gamificationActivity.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs">
                    <span className="min-w-0">
                      <span className="font-medium">{n.title}</span>
                      {n.body && <span className="block truncate text-[10px] text-muted-foreground">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>No gamification notifications yet — create a skill tree or redeem a reward to generate some.</EmptyNote>
            )}
          </SectionCard>

          {/* 14 — configure snapshot */}
          <SectionCard
            title="Configuration snapshot"
            icon={<Settings className="h-4 w-4" />}
            action={
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                <Link href="/dashboard/gamification/configure">Edit settings</Link>
              </Button>
            }
          >
            {settings ? (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <Badge variant="outline">XP per level: {settings.xpPerLevel}</Badge>
                <Badge variant={settings.settings.enableGamification === false ? "outline" : "secondary"}>
                  Gamification {settings.settings.enableGamification === false ? "off" : "on"}
                </Badge>
                <Badge variant={settings.settings.publicLeaderboard === false ? "outline" : "secondary"}>
                  Leaderboard {settings.settings.publicLeaderboard === false ? "private" : "public"}
                </Badge>
                <Badge variant={settings.settings.notifySkillTree === false ? "outline" : "secondary"}>
                  Skill-tree notices {settings.settings.notifySkillTree === false ? "muted" : "on"}
                </Badge>
                <Badge variant={settings.settings.notifyRedeem === false ? "outline" : "secondary"}>
                  Redeem notices {settings.settings.notifyRedeem === false ? "muted" : "on"}
                </Badge>
                <Badge variant={settings.settings.notifyAchievement === false ? "outline" : "secondary"}>
                  Achievement notices {settings.settings.notifyAchievement === false ? "muted" : "on"}
                </Badge>
              </div>
            ) : (
              <EmptyNote>Settings unavailable.</EmptyNote>
            )}
          </SectionCard>
        </>
      )}

      {/* redeem confirm dialog */}
      <Dialog open={redeemTarget !== null} onOpenChange={(open) => !open && setRedeemTarget(null)}>
        {redeemTarget && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redeem “{redeemTarget.name}”?</DialogTitle>
              <DialogDescription>
                This spends {redeemTarget.cost} XP from your balance of {rewards?.balance ?? 0} XP, records the redemption on
                your gamification row and sends you a notification. Your stored XP (and next-level progress) will drop.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRedeemTarget(null)} disabled={redeeming}>
                Cancel
              </Button>
              <Button onClick={() => redeem(redeemTarget)} disabled={redeeming}>
                {redeeming ? "Redeeming…" : `Redeem for ${redeemTarget.cost} XP`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
