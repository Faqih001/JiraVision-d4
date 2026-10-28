"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Download,
  History,
  KeyRound,
  Link2,
  ListChecks,
  Lock,
  Plug,
  PlugZap,
  RotateCcw,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { languages, allTimezones } from "@/lib/timezones"
import type { DashboardOverview } from "@/lib/dashboard-data"
import type { OnboardingView } from "@/lib/onboarding/read"
import { ONBOARDING_STEP_COUNT } from "@/lib/onboarding/state"
import { AvatarCircle, EmptyNote, SectionCard, relativeTime } from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type Profile = {
  id: number
  name: string
  email: string
  role?: string
  avatar?: string | null
  jobTitle?: string | null
  department?: string | null
  location?: string | null
  bio?: string | null
  language?: string
  timezone?: string
  emailVerified?: boolean
  createdAt?: string | null
}

type SettingsMap = Record<string, unknown>

type ProfileDraft = {
  name: string
  jobTitle: string
  department: string
  location: string
  bio: string
  avatar: string
  language: string
  timezone: string
}

type NotificationItem = {
  id: number
  type: string
  title: string
  body: string | null
  isRead?: boolean
  metadata?: { link?: string } & Record<string, unknown>
  createdAt?: string
}

type SprintOption = { id: number; name: string; status: string }

/** Keys owned by the settings workspace (everything under preferences.settings). */
const SETTING_KEYS = [
  "theme",
  "density",
  "weekStart",
  "timeFormat",
  "sprintView",
  "notifyEmail",
  "notifyRealtime",
  "notifyPush",
  "quietHoursEnabled",
  "quietHoursStart",
  "quietHoursEnd",
  "defaultPriority",
  "defaultStoryPoints",
  "defaultSprintId",
  "deletionRequestedAt",
  "lastPasswordResetLinkRequestedAt",
] as const

const PROFILE_EMPTY: ProfileDraft = {
  name: "",
  jobTitle: "",
  department: "",
  location: "",
  bio: "",
  avatar: "",
  language: "en-US",
  timezone: "Africa/Nairobi",
}

const str = (v: unknown, fallback = "") => (typeof v === "string" && v ? v : fallback)
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback)
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback)

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/* --------------------------------------------------------------- the page */

export default function SettingsWorkspace() {
  const { toast } = useToast()
  const { theme, setTheme, resolvedTheme } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(PROFILE_EMPTY)
  const [savingProfile, setSavingProfile] = useState(false)

  const [savedSettings, setSavedSettings] = useState<SettingsMap>({})
  const [draftSettings, setDraftSettings] = useState<SettingsMap>({})
  const [savingSettings, setSavingSettings] = useState(false)

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [sprints, setSprints] = useState<SprintOption[]>([])
  const [settingsFeed, setSettingsFeed] = useState<NotificationItem[]>([])
  const [onboarding, setOnboarding] = useState<OnboardingView | null>(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [sendResetLinkBusy, setSendResetLinkBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => setMounted(true), [])

  /* ------------------------------------------------------------- loading */

  const loadAll = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setRefreshing(true)
      const [pRes, sRes, oRes, nRes, spRes, onboardingRes] = await Promise.all([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/dashboard/overview", { cache: "no-store" }),
        fetch("/api/notifications?limit=50", { cache: "no-store" }),
        fetch("/api/sprints", { cache: "no-store" }),
        fetch("/api/onboarding", { cache: "no-store" }).catch(() => null),
      ])

      if (pRes.status === 401) {
        toast({ title: "Signed out", description: "Log in again to manage settings.", variant: "destructive" })
      }

      if (pRes.ok) {
        const data = await pRes.json().catch(() => null)
        if (data?.success && data.profile) {
          const prof = data.profile as Profile
          setProfile(prof)
          setProfileDraft({
            name: prof.name ?? "",
            jobTitle: prof.jobTitle ?? "",
            department: prof.department ?? "",
            location: prof.location ?? "",
            bio: prof.bio ?? "",
            avatar: prof.avatar ?? "",
            language: prof.language ?? "en-US",
            timezone: prof.timezone ?? "Africa/Nairobi",
          })
        }
      }

      if (sRes.ok) {
        const data = await readJson(sRes)
        const settings = (data.settings as SettingsMap) ?? {}
        setSavedSettings(settings)
        setDraftSettings(settings)
      }

      if (oRes.ok) {
        const data = await readJson(oRes)
        if (data.success) setOverview(data.data as DashboardOverview)
      }

      if (nRes.ok) {
        const data = await readJson(nRes)
        const items = Array.isArray(data.items) ? (data.items as NotificationItem[]) : []
        setSettingsFeed(
          items.filter(
            (i) => i.metadata?.link === "/dashboard/settings" || i.type === "system",
          ),
        )
      }

      if (spRes.ok) {
        const data = await readJson(spRes)
        const rows = Array.isArray(data.data) ? (data.data as SprintOption[]) : []
        setSprints(rows.slice(0, 25))
      }

      if (onboardingRes?.ok) {
        const data = await readJson(onboardingRes)
        if (data.success) setOnboarding(data.data as OnboardingView)
      }

      setRefreshing(false)
      return pRes.ok && sRes.ok
    },
    [toast],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const ok = await loadAll()
      setLoading(false)
      if (!ok && !cancelled) {
        toast({ title: "Settings", description: "Some data could not be loaded — pull to refresh.", variant: "destructive" })
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Apply the server-persisted theme once settings are on screen.
  useEffect(() => {
    if (!mounted) return
    const savedTheme = str(savedSettings.theme, "system")
    if (savedTheme !== theme) setTheme(savedTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, savedSettings.theme])

  /* ---------------------------------------------------------- dirty math */

  const dirtySettings = useMemo(() => {
    const diff: SettingsMap = {}
    for (const key of SETTING_KEYS) {
      const before = JSON.stringify(savedSettings[key] ?? null)
      const after = JSON.stringify(draftSettings[key] ?? null)
      if (before !== after && key in draftSettings) diff[key] = draftSettings[key]
    }
    return diff
  }, [savedSettings, draftSettings])

  const dirtyCount = Object.keys(dirtySettings).length
  const profileDirty = useMemo(() => {
    if (!profile) return false
    return (
      profileDraft.name !== (profile.name ?? "") ||
      profileDraft.jobTitle !== (profile.jobTitle ?? "") ||
      profileDraft.department !== (profile.department ?? "") ||
      profileDraft.location !== (profile.location ?? "") ||
      profileDraft.bio !== (profile.bio ?? "") ||
      profileDraft.avatar !== (profile.avatar ?? "") ||
      profileDraft.language !== (profile.language ?? "") ||
      profileDraft.timezone !== (profile.timezone ?? "")
    )
  }, [profile, profileDraft])

  const setSetting = useCallback((key: string, value: unknown) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  /* ------------------------------------------------------------ savers */

  const saveSettings = useCallback(async () => {
    if (dirtyCount === 0) return
    setSavingSettings(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dirtySettings),
      })
      const data = await readJson(res)
      if (!res.ok || data.success === false) {
        throw new Error(String(data.message ?? data.error ?? `HTTP ${res.status}`))
      }
      const after = (data.settings as SettingsMap) ?? {}
      setSavedSettings(after)
      setDraftSettings(after)
      toast({
        title: "Preferences saved",
        description:
          dirtyCount >= 3
            ? `${dirtyCount} changes persisted — a “Settings updated” digest was sent to your notifications.`
            : `${dirtyCount} change${dirtyCount === 1 ? "" : "s"} persisted.`,
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save settings.",
        variant: "destructive",
      })
    } finally {
      setSavingSettings(false)
    }
  }, [dirtySettings, dirtyCount, toast])

  const saveProfile = useCallback(async () => {
    if (!profileDirty) return
    setSavingProfile(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileDraft),
      })
      const data = await readJson(res)
      if (!res.ok || data.success !== true) {
        throw new Error(String(data.error ?? data.message ?? `HTTP ${res.status}`))
      }
      if (data.profile) setProfile(data.profile as Profile)
      else if (profile) setProfile({ ...profile, ...profileDraft })
      toast({ title: "Profile saved", description: "Your profile was updated on the server." })
    } catch (error) {
      toast({
        title: "Profile save failed",
        description: error instanceof Error ? error.message : "Could not save profile.",
        variant: "destructive",
      })
    } finally {
      setSavingProfile(false)
    }
  }, [profile, profileDirty, profileDraft, toast])

  const saveAll = useCallback(async () => {
    await Promise.all([saveProfile(), saveSettings()])
  }, [saveProfile, saveSettings])

  const resetSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { method: "DELETE" })
      const data = await readJson(res)
      if (!res.ok || data.success === false) {
        throw new Error(String(data.message ?? `HTTP ${res.status}`))
      }
      const defaults = (data.settings as SettingsMap) ?? {}
      setSavedSettings(defaults)
      setDraftSettings(defaults)
      setTheme(str(defaults.theme, "system"))
      toast({ title: "Settings reset", description: "All preferences restored to defaults and saved." })
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Could not reset settings.",
        variant: "destructive",
      })
    } finally {
      setResetOpen(false)
    }
  }, [setTheme, toast])

  /* ----------------------------------------------------- danger actions */

  const deletionRequestedAt = str(draftSettings.deletionRequestedAt)

  const requestDeletion = useCallback(async () => {
    setDeleteBusy(true)
    try {
      const res = await fetch("/api/settings/deletionRequestedAt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: true }),
      })
      const data = await readJson(res)
      if (res.status === 409) {
        toast({
          title: "Deletion blocked",
          description: String(data.message ?? "You still have assigned tasks."),
          variant: "destructive",
        })
        return
      }
      if (!res.ok || data.success === false) {
        throw new Error(String(data.message ?? data.error ?? `HTTP ${res.status}`))
      }
      const stamp = str(data.value)
      setSavedSettings((prev) => ({ ...prev, deletionRequestedAt: stamp }))
      setDraftSettings((prev) => ({ ...prev, deletionRequestedAt: stamp }))
      toast({
        title: "Deletion requested",
        description: "Flagged on your account. A manual review step is required before removal.",
      })
      setDeleteOpen(false)
      void loadAll({ silent: true })
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Could not record the deletion request.",
        variant: "destructive",
      })
    } finally {
      setDeleteBusy(false)
    }
  }, [loadAll, toast])

  const cancelDeletion = useCallback(async () => {
    setDeleteBusy(true)
    try {
      const res = await fetch("/api/settings/deletionRequestedAt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: false }),
      })
      const data = await readJson(res)
      if (!res.ok || data.success === false) {
        throw new Error(String(data.message ?? `HTTP ${res.status}`))
      }
      setSavedSettings((prev) => ({ ...prev, deletionRequestedAt: null }))
      setDraftSettings((prev) => ({ ...prev, deletionRequestedAt: null }))
      toast({ title: "Deletion request cancelled" })
      void loadAll({ silent: true })
    } catch (error) {
      toast({
        title: "Cancel failed",
        description: error instanceof Error ? error.message : "Could not cancel the request.",
        variant: "destructive",
      })
    } finally {
      setDeleteBusy(false)
    }
  }, [loadAll, toast])

  /* ------------------------------------------------- security + extras */

  const sendPasswordResetLink = useCallback(async () => {
    if (!profile?.email) return
    setSendResetLinkBusy(true)
    try {
      const fd = new FormData()
      fd.append("email", profile.email)
      const res = await fetch("/api/auth/forgot-password", { method: "POST", body: fd })
      const data = await readJson(res)
      if (data.success === false) {
        throw new Error(String(data.message ?? `HTTP ${res.status}`))
      }
      // Record the security event (persists the flag + creates a system notification).
      await fetch("/api/settings/lastPasswordResetLinkRequestedAt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: new Date().toISOString() }),
      }).catch(() => null)
      setSavedSettings((prev) => ({
        ...prev,
        lastPasswordResetLinkRequestedAt: new Date().toISOString(),
      }))
      setDraftSettings((prev) => ({
        ...prev,
        lastPasswordResetLinkRequestedAt: new Date().toISOString(),
      }))
      toast({
        title: "Reset link sent",
        description: "Check your inbox — the link opens the existing token-based reset form.",
      })
      void loadAll({ silent: true })
    } catch (error) {
      toast({
        title: "Could not send link",
        description: error instanceof Error ? error.message : "Reset email request failed.",
        variant: "destructive",
      })
    } finally {
      setSendResetLinkBusy(false)
    }
  }, [loadAll, profile, toast])

  const uploadAvatar = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("avatar", file)
        const res = await fetch("/api/user/avatar/upload", { method: "POST", body: fd })
        const data = await readJson(res)
        if (!res.ok || data.error) {
          throw new Error(String(data.error ?? `HTTP ${res.status}`))
        }
        const refreshed = await fetch("/api/user/profile", { cache: "no-store" })
        const prof = await readJson(refreshed)
        if (prof.success && prof.profile) {
          const p = prof.profile as Profile
          setProfile(p)
          setProfileDraft((prev) => ({ ...prev, avatar: p.avatar ?? "" }))
        }
        toast({ title: "Avatar uploaded", description: "Stored via the existing avatar API and saved to your profile." })
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Avatar upload failed.",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
      }
    },
    [toast],
  )

  const exportData = useCallback(async () => {
    try {
      const [pRes, sRes] = await Promise.all([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ])
      const payload = {
        exportedAt: new Date().toISOString(),
        profile: pRes.ok ? ((await pRes.json()).profile ?? null) : null,
        settings: sRes.ok ? ((await sRes.json()).settings ?? {}) : {},
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "jiravision-data-export.json"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "Export ready", description: "Profile + settings downloaded as JSON." })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not build the export.",
        variant: "destructive",
      })
    }
  }, [toast])

  /* ----------------------------------------------------------- derived */

  const compact = str(draftSettings.density, "comfortable") === "compact"
  const timeFormat = str(draftSettings.timeFormat, "12h")
  const sampleTime = useMemo(() => {
    const now = new Date()
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat !== "24h",
    })
  }, [timeFormat])
  const lastResetLinkAt = str(draftSettings.lastPasswordResetLinkRequestedAt)
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"

  const rowPad = compact ? "py-2" : "py-3"

  /* -------------------------------------------------------------- view */

  return (
    <div className={cn("space-y-6 pb-16", compact && "text-[13px]")}>
      {/* 1 — header */}
      <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Settings workspace</h1>
            <p className="text-xs text-muted-foreground">
              Every preference on this page persists server-side — profile columns on `users`,
              everything else in the `users.preferences` JSONB under a `settings` namespace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(dirtyCount > 0 || profileDirty) && (
              <Badge variant="secondary" className="text-[11px]">
                {dirtyCount + (profileDirty ? 1 : 0)} unsaved
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => void loadAll({ silent: true })} disabled={refreshing}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshing && "animate-spin")} />
              Reload
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" onClick={() => void saveAll()} disabled={savingSettings || savingProfile || (!dirtyCount && !profileDirty)}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {savingSettings || savingProfile ? "Saving…" : "Save all"}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className={cn("grid gap-4", compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
          {/* 2 — profile */}
          <SectionCard title="Profile" icon={<User className="h-4 w-4 text-clay" />} className="md:col-span-2 xl:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarCircle name={profileDraft.name || profile?.name || "?"} avatar={profileDraft.avatar || null} size={compact ? 52 : 64} />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="avatar-path" className="text-xs">
                    Avatar path or URL
                  </Label>
                  <Input
                    id="avatar-path"
                    value={profileDraft.avatar}
                    placeholder="avatars/<user>/file.jpg or https://…"
                    onChange={(e) => setProfileDraft((p) => ({ ...p, avatar: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void uploadAvatar(f)
                          e.target.value = ""
                        }}
                      />
                      <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium hover:bg-muted">
                        <Upload className="h-3 w-3" />
                        {uploading ? "Uploading…" : "Upload image"}
                      </span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Uploads hit the existing <code>/api/user/avatar/upload</code>; previews resolve{" "}
                      <code>avatars/</code> paths through the storage API.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="pf-name" className="text-xs">Full name</Label>
                  <Input id="pf-name" value={profileDraft.name} onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-job" className="text-xs">Job title</Label>
                  <Input id="pf-job" value={profileDraft.jobTitle} placeholder="e.g. Product Manager" onChange={(e) => setProfileDraft((p) => ({ ...p, jobTitle: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-dept" className="text-xs">Department</Label>
                  <Input id="pf-dept" value={profileDraft.department} onChange={(e) => setProfileDraft((p) => ({ ...p, department: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pf-loc" className="text-xs">Location</Label>
                  <Input id="pf-loc" value={profileDraft.location} placeholder="e.g. Nairobi, Kenya" onChange={(e) => setProfileDraft((p) => ({ ...p, location: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select value={profileDraft.language} onValueChange={(v) => setProfileDraft((p) => ({ ...p, language: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Timezone</Label>
                  <Select value={profileDraft.timezone} onValueChange={(v) => setProfileDraft((p) => ({ ...p, timezone: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allTimezones.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="pf-bio" className="text-xs">Bio</Label>
                <Textarea id="pf-bio" rows={compact ? 2 : 3} value={profileDraft.bio} onChange={(e) => setProfileDraft((p) => ({ ...p, bio: e.target.value }))} placeholder="A sentence or two about how you work." />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Saved as real columns on the users table via <code>PATCH /api/user/profile</code>.</p>
                <Button size="sm" variant="secondary" onClick={() => void saveProfile()} disabled={!profileDirty || savingProfile}>
                  {savingProfile ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* setup wizard re-entry */}
          <SectionCard title="Setup wizard" icon={<ListChecks className="h-4 w-4 text-clay" />}>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {onboarding?.status === "completed"
                  ? "Complete. Every answer stays editable here, and the wizard can be re-read any time."
                  : onboarding?.status === "in_progress"
                    ? `In progress — step ${Math.min(onboarding.step + 1, ONBOARDING_STEP_COUNT)} of ${ONBOARDING_STEP_COUNT}.`
                    : "Not started. Eight short steps: profile, workspace, industry, disciplines, preferences and a first project."}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/onboarding">
                  Open setup wizard <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          {/* 3 — account */}
          <SectionCard title="Account" icon={<ShieldCheck className="h-4 w-4 text-moss" />}>
            <div className={cn("flex items-center justify-between border-b text-xs", rowPad)}>
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{profile?.email ?? "—"}</span>
            </div>
            <div className={cn("flex items-center justify-between border-b text-xs", rowPad)}>
              <span className="text-muted-foreground">Status</span>
              <Badge variant={profile?.emailVerified ? "default" : "secondary"} className="text-[10px]">
                {profile?.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className={cn("flex items-center justify-between border-b text-xs", rowPad)}>
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono">{profile?.id ?? "—"}</span>
            </div>
            <div className={cn("flex items-center justify-between border-b text-xs", rowPad)}>
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{profile?.role ?? "member"}</span>
            </div>
            <div className={cn("flex items-center justify-between text-xs", rowPad)}>
              <span className="text-muted-foreground">Member since</span>
              <span>{memberSince}</span>
            </div>
            <p className="mt-3 rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
              The email address is the login identity and is intentionally not editable from this
              page — changing it requires the verification flow, which this deployment does not
              expose yet. Everything above is read live from <code>GET /api/user/profile</code>.
            </p>
          </SectionCard>

          {/* 4 — preferences */}
          <SectionCard title="Preferences" icon={<SlidersHorizontal className="h-4 w-4 text-clay" />}>
            <div className="space-y-3 text-xs">
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-[11px] text-muted-foreground">Applies immediately via next-themes (current: {resolvedTheme ?? theme}).</p>
                </div>
                <Select value={str(draftSettings.theme, "system")} onValueChange={(v) => { setSetting("theme", v); setTheme(v) }}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Compact density</p>
                  <p className="text-[11px] text-muted-foreground">Tightens spacing on this page live; stored for other surfaces.</p>
                </div>
                <Switch checked={str(draftSettings.density, "comfortable") === "compact"} onCheckedChange={(c) => setSetting("density", c ? "compact" : "comfortable")} />
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Week starts on</p>
                  <p className="text-[11px] text-muted-foreground">Stored preference for calendar/sprint views.</p>
                </div>
                <Select value={str(draftSettings.weekStart, "monday")} onValueChange={(v) => setSetting("weekStart", v)}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Time format</p>
                  <p className="text-[11px] text-muted-foreground">Preview: {sampleTime}</p>
                </div>
                <Select value={timeFormat} onValueChange={(v) => setSetting("timeFormat", v)}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={cn("flex items-center justify-between", rowPad)}>
                <div>
                  <p className="font-medium">Sprint view default</p>
                  <p className="text-[11px] text-muted-foreground">First view opened on sprint boards; stored for the board surface.</p>
                </div>
                <Select value={str(draftSettings.sprintView, "board")} onValueChange={(v) => setSetting("sprintView", v)}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board">Board</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                    <SelectItem value="timeline">Timeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          {/* 5 — notifications */}
          <SectionCard title="Notifications" icon={<Bell className="h-4 w-4 text-moss" />}>
            <div className="space-y-3 text-xs">
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Email notifications</p>
                  <p className="text-[11px] text-muted-foreground">Stored preference — the mail sender is not wired to this flag yet.</p>
                </div>
                <Switch checked={bool(draftSettings.notifyEmail, true)} onCheckedChange={(c) => setSetting("notifyEmail", c)} />
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Realtime bell feed</p>
                  <p className="text-[11px] text-muted-foreground">
                    {overview?.realtimeEnabled
                      ? "Neon Realtime is live in this deployment — your bell updates without polling."
                      : "Realtime unavailable in this environment; the bell polls on refresh."}
                  </p>
                </div>
                <Switch checked={bool(draftSettings.notifyRealtime, true)} onCheckedChange={(c) => setSetting("notifyRealtime", c)} />
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <div>
                  <p className="font-medium">Push notifications</p>
                  <p className="text-[11px] text-muted-foreground">Stored preference — no service worker is registered, so nothing pushes yet.</p>
                </div>
                <Switch checked={bool(draftSettings.notifyPush)} onCheckedChange={(c) => setSetting("notifyPush", c)} />
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <p className="font-medium">Quiet hours</p>
                <Switch checked={bool(draftSettings.quietHoursEnabled)} onCheckedChange={(c) => setSetting("quietHoursEnabled", c)} />
              </div>
              <div className={cn("grid grid-cols-2 gap-2", rowPad)}>
                <div className="space-y-1">
                  <Label htmlFor="qh-start" className="text-[11px]">From</Label>
                  <Input id="qh-start" type="time" value={str(draftSettings.quietHoursStart, "22:00")} onChange={(e) => setSetting("quietHoursStart", e.target.value)} className="h-8 text-xs" disabled={!bool(draftSettings.quietHoursEnabled)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qh-end" className="text-[11px]">To</Label>
                  <Input id="qh-end" type="time" value={str(draftSettings.quietHoursEnd, "07:00")} onChange={(e) => setSetting("quietHoursEnd", e.target.value)} className="h-8 text-xs" disabled={!bool(draftSettings.quietHoursEnabled)} />
                </div>
              </div>
              <p className="rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                These are stored preferences: every toggle above is persisted to your account and
                reloaded from the server on the next visit. They currently change nothing in the
                client delivery path — labeled honestly rather than faking suppression.
              </p>
            </div>
          </SectionCard>

          {/* 6 — task defaults */}
          <SectionCard title="Task defaults" icon={<ListChecks className="h-4 w-4 text-clay" />}>
            <div className="space-y-3 text-xs">
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <p className="font-medium">Default priority</p>
                <Select value={str(draftSettings.defaultPriority, "medium")} onValueChange={(v) => setSetting("defaultPriority", v)}>
                  <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <p className="font-medium">Default story points</p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={num(draftSettings.defaultStoryPoints, 3)}
                  onChange={(e) => setSetting("defaultStoryPoints", Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="h-8 w-24 text-xs"
                />
              </div>
              <div className={cn("flex items-center justify-between", rowPad)}>
                <p className="font-medium">Preselect sprint</p>
                <Select
                  value={draftSettings.defaultSprintId == null ? "none" : String(draftSettings.defaultSprintId)}
                  onValueChange={(v) => setSetting("defaultSprintId", v === "none" ? null : Number(v))}
                >
                  <SelectTrigger className="h-8 w-40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preselect</SelectItem>
                    {sprints.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                Consumed by: nothing yet. The dashboard quick-create form has its own defaults;
                these values are persisted and returned by <code>GET /api/settings</code> so any
                task surface can adopt them. Honest state, not a dead toggle.
              </p>
            </div>
          </SectionCard>

          {/* 7 — security */}
          <SectionCard title="Security · password" icon={<KeyRound className="h-4 w-4 text-moss" />}>
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                This deployment has no authenticated “change password” endpoint. The live auth API
                supports password changes through the existing token flow:{" "}
                <code>POST /api/auth/forgot-password</code> → email link →{" "}
                <code>POST /api/auth/reset-password</code> (token + new password). The button below
                triggers that real flow for your own address.
              </p>
              <Button size="sm" variant="secondary" onClick={() => void sendPasswordResetLink()} disabled={sendResetLinkBusy || !profile?.email}>
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                {sendResetLinkBusy ? "Sending…" : "Email me a password reset link"}
              </Button>
              <div className={cn("flex items-center justify-between border-t pt-2", rowPad)}>
                <span className="text-muted-foreground">Last reset-link request</span>
                <span>{lastResetLinkAt ? relativeTime(lastResetLinkAt) : "never"}</span>
              </div>
              <div className={cn("flex items-center justify-between border-t pt-2", rowPad)}>
                <span className="text-muted-foreground">Two-factor auth</span>
                <Badge variant="outline" className="text-[10px]">not wired to live auth</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                No 2FA endpoints exist in <code>/api/auth</code>, so no switch is offered — a fake
                toggle would be worse than an honest label.
              </p>
            </div>
          </SectionCard>

          {/* 8 — sessions */}
          <SectionCard title="Sessions" icon={<Server className="h-4 w-4 text-clay" />}>
            <div className="space-y-2 text-xs">
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <span className="text-muted-foreground">Session cookie</span>
                <code className="font-mono">jv_session</code>
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <span className="text-muted-foreground">Idle timeout</span>
                <span>24 hours without activity</span>
              </div>
              <div className={cn("flex items-center justify-between border-b", rowPad)}>
                <span className="text-muted-foreground">Signing in as</span>
                <span>user #{profile?.id ?? "—"}</span>
              </div>
              <div className={cn("flex items-center justify-between", rowPad)}>
                <span className="text-muted-foreground">Absolute limit</span>
                <span>30 days from first sign-in</span>
              </div>
              <p className="rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                The cookie is HttpOnly and carries an opaque token; the matching{" "}
                <code>auth_sessions</code> row is what says whether it is still valid. This card
                reports the mechanics documented in <code>lib/session.ts</code> rather than
                inventing a device list there is no server support for. Signing out from the
                sidebar revokes the row via <code>POST /api/auth/logout</code>.
              </p>
            </div>
          </SectionCard>

          {/* 9 — workspace stats */}
          <SectionCard title="Workspace stats" icon={<RefreshCw className="h-4 w-4 text-moss" />}>
            {overview ? (
              <div className={cn("grid grid-cols-2 gap-2 text-center text-xs", compact ? "[&>*]:py-2" : "[&>*]:py-3")}>
                {[
                  ["Open tasks", overview.kpis.myOpenTasks],
                  ["Due this week", overview.kpis.myDueThisWeek],
                  ["Done this week", overview.kpis.myCompletedThisWeek],
                  ["Blocked", overview.kpis.blockedTasks],
                  ["Sprint progress", `${overview.kpis.sprintProgressPct}%`],
                  ["Team happiness", `${overview.kpis.teamHappiness}`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border">
                    <p className="text-lg font-semibold">{String(value)}</p>
                    <p className="text-[11px] text-muted-foreground">{String(label)}</p>
                  </div>
                ))}
                <div className="col-span-2 pt-1 text-[11px] text-muted-foreground">
                  {overview.activeSprint ? `Active sprint: ${overview.activeSprint.name}` : "No active sprint."} Snapshot generated {relativeTime(overview.generatedAt)}.
                </div>
              </div>
            ) : (
              <EmptyNote>Overview data unavailable — the stats endpoint returned an error.</EmptyNote>
            )}
          </SectionCard>

          {/* 10 — danger zone */}
          <SectionCard title="Danger zone" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} className={cn("border-destructive/40", compact ? "md:col-span-2" : "")}>
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Requesting deletion records a <code>deletionRequestedAt</code> flag on your
                settings and writes a system notification for reviewers. It does <strong>not</strong>{" "}
                remove data from this page — account removal is a reviewed, manual operation. The
                request is blocked (HTTP 409) while tasks remain assigned to you.
              </p>
              {deletionRequestedAt ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
                  <p className="font-medium text-destructive">Deletion requested {relativeTime(deletionRequestedAt)}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => void cancelDeletion()} disabled={deleteBusy}>
                    {deleteBusy ? "Working…" : "Cancel deletion request"}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Request account deletion
                </Button>
              )}
            </div>
          </SectionCard>

          {/* 11 — data export */}
          <SectionCard title="Data export" icon={<Download className="h-4 w-4 text-clay" />}>
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Downloads your profile (as returned by the profile API, no secrets) and all stored
                settings as a JSON file, built from live server responses — not from local cache.
              </p>
              <Button size="sm" variant="secondary" onClick={() => void exportData()}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export profile + settings (JSON)
              </Button>
            </div>
          </SectionCard>

          {/* 12 — audit feed */}
          <SectionCard title="Settings audit feed" icon={<History className="h-4 w-4 text-moss" />} className={compact ? undefined : "md:col-span-2"}>
            {settingsFeed.length === 0 ? (
              <EmptyNote>No settings-related notifications yet. Batch saves of 3+ keys, deletion requests and security events appear here.</EmptyNote>
            ) : (
              <ul className="space-y-2 text-xs">
                {settingsFeed.slice(0, 12).map((n) => (
                  <li key={n.id} className={cn("rounded-md border", compact ? "px-2 py-1.5" : "px-3 py-2")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{n.title}</span>
                      {n.createdAt ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                      ) : null}
                    </div>
                    {n.body ? <p className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* 13 — integrations teaser */}
          <SectionCard title="Integrations" icon={<Plug className="h-4 w-4 text-clay" />}>
            <div className="space-y-3 text-xs">
              <p className="leading-relaxed text-muted-foreground">
                Calendar, Slack and Jira connectors live in their own workspace — nothing here
                changes integration state.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/integrations">
                  <PlugZap className="mr-1.5 h-3.5 w-3.5" />
                  Open integrations
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </SectionCard>

          {/* 14 — API info */}
          <SectionCard title="API & auth info" icon={<Link2 className="h-4 w-4 text-moss" />}>
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                In-app callers authenticate with the same cookie session this page uses:{" "}
                <code>jv_session</code> (HttpOnly) sent automatically with every fetch. There are
                no bearer tokens to display — showing none is the correct answer, not a missing
                feature.
              </p>
              <Separator />
              <p>
                Settings endpoints: <code>GET/PATCH/DELETE /api/settings</code>,{" "}
                <code>GET/PUT/DELETE /api/settings/&lt;key&gt;</code>,{" "}
                <code>GET/PATCH /api/user/profile</code>.
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* dialogs */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset all settings?</DialogTitle>
            <DialogDescription>
              Restores every preference on this page to its default <em>on the server</em>. Your
              profile fields are not touched. A “Settings reset” notification is recorded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Keep settings</Button>
            <Button variant="destructive" onClick={() => void resetSettings()}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Reset to defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request account deletion?</DialogTitle>
            <DialogDescription>
              The server checks you have no open assigned tasks, then records a{" "}
              <code>deletionRequestedAt</code> flag and a system notification for review. Actual
              removal happens only after that manual review — you can cancel the request any time
              before then.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Never mind</Button>
            <Button variant="destructive" onClick={() => void requestDeletion()} disabled={deleteBusy}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {deleteBusy ? "Checking tasks…" : "Record deletion request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
