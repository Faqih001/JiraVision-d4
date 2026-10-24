"use client"

// Team workspace settings (/dashboard/team/settings).
//
// Governance for the team workspace, backed by /api/team/settings and
// /api/team/members/[id]/role. Every control here changes real behaviour:
//   - team name          → used in team notification copy
//   - default access     → the role POST /api/team/members assigns
//   - notification prefs → checked server-side before each team notification
//   - access roles       → users.role, which gates /admin/cms and this page
// Non-admins get the same page read-only; the write endpoints return 403.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Check,
  Clock,
  IdCard,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AvatarCircle, SectionCard, relativeTime } from "@/components/dashboard-kit"

/* ------------------------------------------------------------------ types */

type NotificationKey = "memberJoined" | "memberRemoved" | "profileUpdated" | "roleChanged" | "wellbeingAlert"

type Settings = {
  teamName: string
  defaultMemberRole: string
  notifications: Record<NotificationKey, boolean>
  updatedBy: number | null
  updatedByName: string | null
  updatedAt: string | null
}

type Member = {
  id: number
  name: string
  email: string
  role: string
  jobTitle: string | null
  avatar: string | null
  joinedOn: string | null
}

type RoleChange = {
  id: number
  memberId: number
  memberName: string | null
  fromRole: string | null
  toRole: string
  changedBy: number | null
  changedByName: string | null
  createdAt: string
}

type Viewer = { id: number; name: string; role: string }

type Payload = {
  success: boolean
  error?: string
  settings: Settings
  defaults: Settings
  roles: string[]
  canManage: boolean
  viewer: Viewer
  members: Member[]
  roleChanges: RoleChange[]
  adminEmailsConfigured: boolean
}

const NOTIFICATION_ROWS: { key: NotificationKey; label: string; hint: string }[] = [
  {
    key: "memberJoined",
    label: "New member added",
    hint: "Receipt to whoever adds a member, naming the access role they were given.",
  },
  {
    key: "memberRemoved",
    label: "Member removed",
    hint: "Receipt to whoever removes a member. The removed account is deleted, so they cannot be notified.",
  },
  {
    key: "profileUpdated",
    label: "Profile edited by someone else",
    hint: "Tells a member when a teammate changes their name or job title.",
  },
  {
    key: "roleChanged",
    label: "Access role changed",
    hint: "Notifies the member and the admin when users.role changes.",
  },
  {
    key: "wellbeingAlert",
    label: "Wellbeing threshold crossed",
    hint: "Check-in scores dropping below 40 or rising above 85 notify that member.",
  },
]

const ROLE_HELP: Record<string, string> = {
  user: "Standard member. Full access to the dashboard, no governance controls.",
  admin: "Admin. Can edit team settings, change access roles and open /admin/cms.",
  superadmin: "Super-admin. Same powers as admin, kept as a distinct break-glass role.",
}

const GUARDRAILS: { rule: string; detail: string }[] = [
  { rule: "No self-service role changes", detail: "An admin cannot change their own access role — ask another admin." },
  { rule: "The last admin cannot be demoted", detail: "Demotion is rejected with 409 while no other admin exists." },
  { rule: "You cannot remove yourself", detail: "DELETE /api/team/members/{id} rejects your own id." },
  { rule: "Members owning tasks cannot be removed", detail: "Reassign or delete their tasks first; the API returns the counts." },
  { rule: "Only declared fields are written", detail: "Unknown keys in a settings payload are dropped before the UPDATE." },
]

const isPrivileged = (role: string) => role === "admin" || role === "superadmin"

/* ------------------------------------------------------------------- page */

export default function TeamSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [roleBusy, setRoleBusy] = useState<number | null>(null)
  const [resetArmed, setResetArmed] = useState(false)
  const [data, setData] = useState<Payload | null>(null)
  const [draft, setDraft] = useState<Settings | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/team/settings", { cache: "no-store" })
      const json = (await res.json()) as Payload
      if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`)
      setData(json)
      setDraft({ ...json.settings, notifications: { ...json.settings.notifications } })
    } catch (error) {
      toast({
        title: "Could not load team settings",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    return (
      draft.teamName !== data.settings.teamName ||
      draft.defaultMemberRole !== data.settings.defaultMemberRole ||
      NOTIFICATION_ROWS.some((row) => draft.notifications[row.key] !== data.settings.notifications[row.key])
    )
  }, [data, draft])

  const stats = useMemo(() => {
    const members = data?.members ?? []
    const admins = members.filter((m) => isPrivileged(m.role))
    const switchesOn = draft
      ? NOTIFICATION_ROWS.filter((row) => draft.notifications[row.key]).length
      : 0
    return {
      members: members.length,
      admins: admins.length,
      switchesOn,
      changes: data?.roleChanges.length ?? 0,
    }
  }, [data, draft])

  const save = useCallback(async () => {
    if (!draft || !data) return
    setSaving(true)
    try {
      const res = await fetch("/api/team/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: draft.teamName,
          defaultMemberRole: draft.defaultMemberRole,
          notifications: draft.notifications,
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: string; settings: Settings; changes?: string[] }
      if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`)
      setData({ ...data, settings: json.settings })
      setDraft({ ...json.settings, notifications: { ...json.settings.notifications } })
      toast({
        title: "Team settings saved",
        description: json.changes?.length ? json.changes.join(" · ") : "No values changed.",
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [data, draft, toast])

  const resetToDefaults = useCallback(async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await fetch("/api/team/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: data.defaults.teamName,
          defaultMemberRole: data.defaults.defaultMemberRole,
          notifications: data.defaults.notifications,
        }),
      })
      const json = (await res.json()) as { success: boolean; error?: string; settings: Settings }
      if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`)
      setData({ ...data, settings: json.settings })
      setDraft({ ...json.settings, notifications: { ...json.settings.notifications } })
      setResetArmed(false)
      toast({ title: "Preferences reset", description: "Team settings are back to their defaults." })
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [data, toast])

  const changeRole = useCallback(
    async (member: Member, role: string) => {
      if (!data) return
      setRoleBusy(member.id)
      try {
        const res = await fetch(`/api/team/members/${member.id}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        })
        const json = (await res.json()) as {
          success: boolean
          error?: string
          unchanged?: boolean
          member?: { id: number; role: string }
          fromRole?: string
          roleChanges?: RoleChange[]
        }
        if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`)
        setData({
          ...data,
          members: data.members.map((m) => (m.id === member.id ? { ...m, role } : m)),
          roleChanges: json.roleChanges ?? data.roleChanges,
        })
        toast({
          title: json.unchanged ? "Role unchanged" : `Access role updated`,
          description: json.unchanged
            ? `${member.name} already had ${role} access.`
            : `${member.name}: ${json.fromRole} → ${role}.`,
        })
      } catch (error) {
        toast({
          title: "Could not change access role",
          description: error instanceof Error ? error.message : "Unexpected error",
          variant: "destructive",
        })
      } finally {
        setRoleBusy(null)
      }
    },
    [data, toast],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        if (!dirty || !data?.canManage) return
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dirty, data, save])

  if (loading && !data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data || !draft) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Team settings could not be loaded. You need to be signed in to view this page.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => void load()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard/team">Back to team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const readOnly = !data.canManage

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* 1 — header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Team settings</h1>
            {dirty && <Badge variant="secondary">Unsaved changes</Badge>}
            {readOnly && (
              <Badge variant="outline" className="gap-1">
                <KeyRound className="h-3 w-3" /> Read-only
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Access roles, defaults for new members and the notifications the team workspace sends.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/team">
              <ArrowLeft className="mr-2 h-4 w-4" /> Team overview
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> {loading ? "Loading" : "Refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft({ ...data.settings, notifications: { ...data.settings.notifications } })
              setResetArmed(false)
            }}
            disabled={!dirty || saving || readOnly}
          >
            Discard
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving || readOnly}>
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      {readOnly && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You are signed in as <strong>{data.viewer.name}</strong> ({data.viewer.role}). Changing access roles or
            team defaults needs an <code className="rounded bg-black/5 px-1 dark:bg-white/10">admin</code> role — or an
            email listed in the <code className="rounded bg-black/5 px-1 dark:bg-white/10">ADMIN_EMAILS</code>{" "}
            environment variable. Everything below is live data, shown read-only.
          </p>
        </div>
      )}

      {/* 2 — stat strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Members", value: stats.members, icon: <Users className="h-4 w-4" />, note: "including admins" },
          {
            label: "Privileged",
            value: stats.admins,
            icon: <ShieldCheck className="h-4 w-4" />,
            note: stats.admins <= 1 ? "one admin — no spare" : "admins and super-admins",
            warn: stats.admins <= 1,
          },
          {
            label: "Notifications on",
            value: `${stats.switchesOn}/${NOTIFICATION_ROWS.length}`,
            icon: <BellRing className="h-4 w-4" />,
            note: "team workspace switches",
          },
          {
            label: "Access changes",
            value: stats.changes,
            icon: <Clock className="h-4 w-4" />,
            note: "recent audit entries",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
                <p className={`text-xs ${stat.warn ? "text-amber-600" : "text-muted-foreground"}`}>{stat.note}</p>
              </div>
              <span className="rounded-md bg-muted p-2 text-muted-foreground">{stat.icon}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3 — workspace identity */}
        <SectionCard title="Workspace name" icon={<IdCard className="h-4 w-4" />}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Name used in team notifications</Label>
              <Input
                id="team-name"
                value={draft.teamName}
                maxLength={120}
                disabled={readOnly}
                onChange={(event) => setDraft({ ...draft, teamName: event.target.value })}
                placeholder="Team"
              />
            </div>
            <p className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
              Preview: <span className="font-medium text-foreground">“Ada joined {draft.teamName || "Team"}”</span> ·{" "}
              <span className="font-medium text-foreground">
                “Mia no longer has access to the {draft.teamName || "Team"} workspace.”
              </span>
            </p>
          </div>
        </SectionCard>

        {/* 4 — default access for new members */}
        <SectionCard title="Default access for new members" icon={<UserPlus className="h-4 w-4" />}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="default-role">Role assigned by “Add member”</Label>
              <Select
                value={draft.defaultMemberRole}
                disabled={readOnly}
                onValueChange={(value) => setDraft({ ...draft, defaultMemberRole: value })}
              >
                <SelectTrigger id="default-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {data.roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{ROLE_HELP[draft.defaultMemberRole]}</p>
            {isPrivileged(draft.defaultMemberRole) && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Every member added from now on will be able to change access roles and edit the landing pages in
                /admin/cms. Use <code className="rounded bg-black/5 px-1 dark:bg-white/10">user</code> unless the team
                is tiny and fully trusted.
              </div>
            )}
          </div>
        </SectionCard>

        {/* 5 — notification preferences */}
        <SectionCard
          title="Team notifications"
          icon={<BellRing className="h-4 w-4" />}
          action={
            <Badge variant="outline">
              {stats.switchesOn}/{NOTIFICATION_ROWS.length} on
            </Badge>
          }
          className="lg:col-span-2"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {NOTIFICATION_ROWS.map((row) => (
              <div key={row.key} className="flex items-start gap-3 rounded-md border p-3">
                <Switch
                  id={`notif-${row.key}`}
                  checked={draft.notifications[row.key]}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, notifications: { ...draft.notifications, [row.key]: checked } })
                  }
                />
                <div className="min-w-0">
                  <Label htmlFor={`notif-${row.key}`} className="cursor-pointer text-sm font-medium">
                    {row.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{row.hint}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            These switches are read by the team APIs before each notification is written — turning one off stops the
            notification, it does not hide it.
          </p>
        </SectionCard>

        {/* 6 — access roles */}
        <SectionCard
          title="Access roles"
          icon={<ShieldCheck className="h-4 w-4" />}
          action={<Badge variant="secondary">{data.members.length} members</Badge>}
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Member</th>
                  <th className="py-2 pr-3 font-medium">Job title</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 font-medium">Access role</th>
                  <th className="py-2 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((member) => {
                  const isSelf = member.id === data.viewer.id
                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <AvatarCircle name={member.name} avatar={member.avatar} size={28} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {member.name}
                              {isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{member.jobTitle || "—"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{member.joinedOn || "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={isPrivileged(member.role) ? "default" : "outline"}>{member.role}</Badge>
                      </td>
                      <td className="py-2">
                        <Select
                          value={member.role}
                          disabled={readOnly || isSelf || roleBusy === member.id}
                          onValueChange={(value) => void changeRole(member, value)}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {data.roles.map((role) => (
                              <SelectItem key={role} value={role} className="text-xs">
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isSelf && <p className="mt-1 text-[11px] text-muted-foreground">Own role is locked</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* 7 — recent access changes */}
        <SectionCard title="Recent access changes" icon={<Clock className="h-4 w-4" />}>
          {data.roleChanges.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No access role has been changed yet. Every change is recorded here with who made it.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.roleChanges.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 rounded-md border p-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.memberName ?? `Member #${entry.memberId}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.fromRole ?? "none"} → <span className="font-medium text-foreground">{entry.toRole}</span>{" "}
                      by {entry.changedByName ?? "Unknown"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* 8 — reset */}
        <SectionCard title="Reset preferences" icon={<RotateCcw className="h-4 w-4" />}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Restores the workspace name, the default access role and all five notification switches to the values the
              app shipped with. Access roles already granted to members are left untouched.
            </p>
            {resetArmed ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="destructive" size="sm" onClick={() => void resetToDefaults()} disabled={saving || readOnly}>
                  <Check className="mr-2 h-4 w-4" /> Yes, reset to defaults
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResetArmed(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setResetArmed(true)} disabled={readOnly}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset to defaults
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Last saved {data.settings.updatedAt ? relativeTime(data.settings.updatedAt) : "never"} by{" "}
              {data.settings.updatedByName ?? "—"}.
            </p>
          </div>
        </SectionCard>

        {/* 9 — guardrails */}
        <SectionCard title="Rules the API enforces" icon={<Shield className="h-4 w-4" />}>
          <ul className="space-y-2">
            {GUARDRAILS.map((item) => (
              <li key={item.rule} className="rounded-md border p-2.5">
                <p className="text-sm font-medium">{item.rule}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* 10 — bootstrap admins + where settings apply */}
        <div className="space-y-4">
          <SectionCard title="Bootstrap admins" icon={<KeyRound className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">
              {data.adminEmailsConfigured
                ? "ADMIN_EMAILS is set, so those addresses are treated as super-admins even with the user role — a way back in if every admin row is lost."
                : "ADMIN_EMAILS is not set. Access is decided purely by the role column above."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Set it in <code className="rounded bg-muted px-1">.env.local</code> as a comma-separated list of emails;
              it is never exposed to the browser.
            </p>
          </SectionCard>

          <SectionCard title="Where these settings apply" icon={<Users className="h-4 w-4" />}>
            <ul className="space-y-2 text-sm">
              {[
                { href: "/dashboard/team", label: "Team overview", note: "add and remove members" },
                { href: "/dashboard/team-wellbeing", label: "Team wellbeing", note: "threshold alerts" },
                { href: "/admin/cms", label: "Content Studio", note: "admin-only landing pages" },
              ].map((link) => (
                <li key={link.href} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                  <span>
                    <span className="font-medium">{link.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{link.note}</span>
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={link.href}>Open</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
