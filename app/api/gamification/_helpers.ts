// Shared server-side helpers for /api/gamification/*.
// All gamification state lives in the existing `gamification` row per user
// (no schema changes this session):
//   - skillTrees jsonb  : map of name -> { level, progress, tasksToNextLevel, description? }
//   - achievements jsonb: array of { name, description?, xp?, unlockedAt?, unlockedByUserId? }
//                         (legacy rows may hold bare strings — normalised on read)
//   - rewards jsonb     : { catalog?: RewardItem[], ledger?: Redemption[], settings?: Config }
//                         The shared reward catalog is stored on the gamification row
//                         with the lowest userId (the deterministic "catalog row").
//   - level / xp / tasksCompleted columns remain the source of truth for XP.
//     XP model matches the main dashboard: 500 XP per level by default, overridable
//     per row via rewards.settings.xpPerLevelOverride.

import { db } from "@/lib/db"
import { gamification, users } from "@/drizzle/schema"
import { asc, eq } from "drizzle-orm"
import { createNotification } from "@/lib/notifications"

export const XP_PER_LEVEL = 500

export type GamificationRow = typeof gamification.$inferSelect

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

export interface RewardsBag {
  catalog: RewardItem[]
  ledger: Redemption[]
  settings: GamificationSettings
}

export type SessionUser = { id: number; name: string; role: string; avatar: string | null }

export function normalizeSkillTrees(value: unknown): SkillTree[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { name: item, level: 1, progress: 0, tasksToNextLevel: 0 }
        const obj = item as Partial<SkillTree>
        if (!obj || typeof obj.name !== "string") return null
        return {
          name: obj.name,
          level: clampInt(obj.level, 1, 99, 1),
          progress: clampInt(obj.progress, 0, 100, 0),
          tasksToNextLevel: clampInt(obj.tasksToNextLevel, 0, 999, 0),
          description: typeof obj.description === "string" ? obj.description : undefined,
        }
      })
      .filter((t): t is SkillTree => t !== null)
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([name, data]) => {
      if (typeof data === "number") {
        // legacy shape: name -> level only
        return { name, level: clampInt(data, 1, 99, 1), progress: 0, tasksToNextLevel: 0 }
      }
      const obj = (data ?? {}) as Partial<SkillTree>
      return {
        name,
        level: clampInt(obj.level, 1, 99, 1),
        progress: clampInt(obj.progress, 0, 100, 0),
        tasksToNextLevel: clampInt(obj.tasksToNextLevel, 0, 999, 0),
        description: typeof obj.description === "string" ? obj.description : undefined,
      }
    })
  }
  return []
}

export function serializeSkillTrees(trees: SkillTree[]): Record<string, Omit<SkillTree, "name">> {
  const out: Record<string, Omit<SkillTree, "name">> = {}
  for (const t of trees) {
    out[t.name] = {
      level: t.level,
      progress: t.progress,
      tasksToNextLevel: t.tasksToNextLevel,
      ...(t.description ? { description: t.description } : {}),
    }
  }
  return out
}

export function normalizeAchievements(value: unknown): AchievementEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item): AchievementEntry | null => {
      if (typeof item === "string") return { name: item, unlockedAt: null }
      const obj = item as Partial<AchievementEntry>
      if (!obj || typeof obj.name !== "string") return null
      return {
        name: obj.name,
        description: typeof obj.description === "string" ? obj.description : undefined,
        xp: typeof obj.xp === "number" ? obj.xp : undefined,
        unlockedAt: typeof obj.unlockedAt === "string" ? obj.unlockedAt : null,
        unlockedByUserId: typeof obj.unlockedByUserId === "number" ? obj.unlockedByUserId : null,
      }
    })
    .filter((a): a is AchievementEntry => a !== null)
}

export function normalizeRewards(value: unknown): RewardsBag {
  if (Array.isArray(value)) {
    // legacy shape: an array of redeemed rewards { name, cost, redeemedAt? }
    const ledger = value
      .map((item) => {
        const obj = item as Partial<Redemption>
        if (!obj || typeof obj.name !== "string") return null
        return {
          id: typeof obj.id === "string" ? obj.id : crypto.randomUUID(),
          rewardId: typeof obj.rewardId === "string" ? obj.rewardId : "legacy",
          name: obj.name,
          cost: typeof obj.cost === "number" ? obj.cost : 0,
          redeemedAt: typeof obj.redeemedAt === "string" ? obj.redeemedAt : new Date().toISOString(),
          userId: typeof obj.userId === "number" ? obj.userId : 0,
        }
      })
      .filter((r): r is Redemption => r !== null)
    return { catalog: [], ledger, settings: {} }
  }
  if (value && typeof value === "object") {
    const obj = value as Partial<RewardsBag>
    return {
      catalog: Array.isArray(obj.catalog) ? (obj.catalog as RewardItem[]) : [],
      ledger: Array.isArray(obj.ledger) ? (obj.ledger as Redemption[]) : [],
      settings: obj.settings && typeof obj.settings === "object" ? obj.settings : {},
    }
  }
  return { catalog: [], ledger: [], settings: {} }
}

export function xpPerLevelFor(settings: GamificationSettings): number {
  const override = settings.xpPerLevelOverride
  if (typeof override === "number" && Number.isFinite(override) && override >= 100 && override <= 10_000) {
    return Math.round(override)
  }
  return XP_PER_LEVEL
}

export function levelForXp(xp: number, per: number, storedLevel: number): number {
  return Math.max(storedLevel, Math.floor(Math.max(0, xp) / per) + 1)
}

export function progressWithinLevel(xp: number, per: number): number {
  return Math.round(((Math.max(0, xp) % per) / per) * 100)
}

export function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function canManage(session: SessionUser, targetUserId: number): boolean {
  return session.id === targetUserId || session.role === "admin" || session.role === "manager"
}

export async function getRow(userId: number): Promise<GamificationRow | null> {
  const rows = await db.select().from(gamification).where(eq(gamification.userId, userId)).limit(1)
  return rows[0] ?? null
}

export async function ensureRow(userId: number): Promise<GamificationRow> {
  const existing = await getRow(userId)
  if (existing) return existing
  const [row] = await db
    .insert(gamification)
    .values({ userId, level: 1, xp: 0, tasksCompleted: 0, achievements: [], skillTrees: {}, rewards: [] })
    .returning()
  return row
}

/** Deterministic home for the shared reward catalog: lowest userId that has a row. */
export async function getCatalogRow(): Promise<GamificationRow | null> {
  const rows = await db
    .select()
    .from(gamification)
    .orderBy(asc(gamification.userId))
    .limit(1)
  return rows[0] ?? null
}

export async function writeRewardsBag(row: GamificationRow, bag: RewardsBag) {
  const [updated] = await db
    .update(gamification)
    .set({ rewards: bag, updatedAt: new Date() })
    .where(eq(gamification.id, row.id))
    .returning()
  return updated
}

export async function writeSkillTrees(row: GamificationRow, trees: SkillTree[]) {
  const [updated] = await db
    .update(gamification)
    .set({ skillTrees: serializeSkillTrees(trees), updatedAt: new Date() })
    .where(eq(gamification.id, row.id))
    .returning()
  return updated
}

export async function writeAchievements(row: GamificationRow, entries: AchievementEntry[]) {
  const [updated] = await db
    .update(gamification)
    .set({ achievements: entries, updatedAt: new Date() })
    .where(eq(gamification.id, row.id))
    .returning()
  return updated
}

/** Fire a gamification notification unless the recipient's settings disable that channel. */
export async function gamifyNotify(
  recipientRow: GamificationRow,
  channel: keyof GamificationSettings,
  actor: SessionUser | null,
  title: string,
  body: string,
) {
  const settings = normalizeRewards(recipientRow.rewards).settings
  if (settings[channel] === false) return null
  return createNotification({
    userId: recipientRow.userId,
    type: "gamification",
    title,
    body: actor ? `${body} — via ${actor.name}` : body,
    link: "/dashboard/gamification",
    metadata: { actorId: actor?.id ?? null },
  })
}

export async function rosterWithRank() {
  const rows = await db
    .select({
      id: gamification.id,
      userId: gamification.userId,
      level: gamification.level,
      xp: gamification.xp,
      tasksCompleted: gamification.tasksCompleted,
      achievements: gamification.achievements,
      skillTrees: gamification.skillTrees,
      rewards: gamification.rewards,
      updatedAt: gamification.updatedAt,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      jobTitle: users.jobTitle,
    })
    .from(gamification)
    .innerJoin(users, eq(users.id, gamification.userId))
    .orderBy(asc(gamification.userId))
  const sorted = [...rows].sort((a, b) => b.xp - a.xp || a.userId - b.userId)
  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }))
}

export type RosterRow = Awaited<ReturnType<typeof rosterWithRank>>[number]
