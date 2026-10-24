"use client"

// Shared client-side types and helpers for the gamification hub and subpages.
// Mirrors the normalisation done server-side in app/api/gamification/_helpers.ts.

export interface SkillTree {
  name: string
  level: number
  progress: number
  tasksToNextLevel: number
  description?: string
}

export interface AchievementEntry {
  name: string
  description?: string
  xp?: number
  unlockedAt?: string | null
  unlockedByUserId?: number | null
}

export interface RewardItem {
  id: string
  name: string
  cost: number
  description?: string
  active: boolean
  createdAt?: string
}

export interface Redemption {
  id: string
  rewardId: string
  name: string
  cost: number
  redeemedAt: string
  userId: number
}

export interface GamificationSettings {
  xpPerLevelOverride?: number
  enableGamification?: boolean
  publicLeaderboard?: boolean
  notifySkillTree?: boolean
  notifyRedeem?: boolean
  notifyAchievement?: boolean
  notifyConfigure?: boolean
}

export interface RosterPlayer {
  userId: number
  name: string
  avatar: string | null
  role: string
  jobTitle: string | null
  level: number
  xp: number
  tasksCompleted: number
  rank: number
  achievements: AchievementEntry[]
  skillTrees: SkillTree[]
  xpPerLevel: number
  updatedAt: string | null
}

export interface MeSnapshot {
  userId: number
  name: string
  avatar: string | null
  level: number
  xp: number
  rank: number
  tasksCompleted: number
  xpPerLevel: number
}

export const XP_ESTIMATE_PER_DONE_TASK = 50

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const json = await res.json().catch(() => null)
  if (!res.ok || !json || json.success === false) {
    throw new Error(json?.message ?? json?.error ?? `Request failed (${res.status})`)
  }
  return json as T
}

/** Local date key YYYY-MM-DD for streak/calendar bucketing. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function weekKey(d: Date): string {
  const copy = new Date(d.getTime())
  copy.setHours(0, 0, 0, 0)
  const day = (copy.getDay() + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - day)
  return dayKey(copy)
}

export interface DoneTaskLite {
  id: number
  assigneeId: number | null
  updatedAt: string
}

/** Current streak: consecutive days with ≥1 completion ending today (or yesterday). */
export function computeStreak(doneDates: Set<string>): number {
  let streak = 0
  const cursor = new Date()
  if (!doneDates.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (doneDates.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export const SUBPAGES = [
  { href: "/dashboard/gamification/achievements", label: "Achievements" },
  { href: "/dashboard/gamification/leaderboard", label: "Leaderboard" },
  { href: "/dashboard/gamification/skill-tree", label: "Skill trees" },
  { href: "/dashboard/gamification/add-skill", label: "Add skill" },
  { href: "/dashboard/gamification/rewards", label: "Rewards" },
  { href: "/dashboard/gamification/configure", label: "Configure" },
] as const
