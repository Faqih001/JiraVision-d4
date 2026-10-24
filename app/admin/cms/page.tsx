"use client"

// /admin/cms — super-admin content studio for the landing pages.
// Edits write to cms_content_overrides via /api/admin/cms; only paths declared
// in lib/cms-registry.ts are accepted. Published overrides render immediately
// on the live pages (they resolve content per request); drafts stay hidden.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ExternalLink,
  FileCode2,
  LayoutDashboard,
  Lock,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CircleJVLoader } from "@/components/ui/loader"
import {
  CMS_PAGES,
  buildDefaults,
  getByPath,
  type CmsField,
  type CmsPage,
  type CmsSection,
} from "@/lib/cms-registry"

type AccessState = "loading" | "authed" | "unauthenticated" | "forbidden"

interface OverrideDto {
  id: number
  pageId: string
  sectionId: string
  fields: Record<string, string | number | boolean>
  isPublished: boolean
  updatedBy: number | null
  updatedByName: string
  updatedAt: string
}

interface AuditEntry {
  id: number
  pageId: string
  sectionId: string
  action: string
  userId: number | null
  actorName: string
  detail: Record<string, unknown>
  createdAt: string
}

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
}

type Flash = { kind: "ok" | "err"; text: string } | null

const ACTION_STYLE: Record<string, string> = {
  publish: "bg-primary/10 text-primary",
  save: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  unpublish: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  reset: "bg-destructive/10 text-destructive",
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function defaultValueString(defaults: Record<string, unknown>, sectionId: string, path: string): string {
  const value = getByPath(defaults[sectionId], path)
  if (typeof value === "boolean") return value ? "true" : "false"
  if (value === undefined || value === null) return ""
  return String(value)
}

export default function AdminCmsPage() {
  const [access, setAccess] = useState<AccessState>("loading")
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [overrides, setOverrides] = useState<OverrideDto[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])

  const [activePageId, setActivePageId] = useState<string>(CMS_PAGES[0]?.id ?? "home")
  const [activeSectionId, setActiveSectionId] = useState<string>("")
  const [search, setSearch] = useState("")
  // Only the fields the admin actually typed on; effective values are derived.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [publishDraft, setPublishDraft] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<"save" | "reset" | "publish" | null>(null)
  const [resetArmed, setResetArmed] = useState(false)
  const [flash, setFlash] = useState<Flash>(null)
  const [previewKey, setPreviewKey] = useState(0)

  const activePage: CmsPage | undefined = useMemo(
    () => CMS_PAGES.find((p) => p.id === activePageId),
    [activePageId],
  )
  const defaults = useMemo(() => buildDefaults(activePageId), [activePageId])
  const pageOverrides = useMemo(
    () => overrides.filter((o) => o.pageId === activePageId),
    [overrides, activePageId],
  )

  // Derived selection: fall back to the first section of the active page.
  const effectiveSectionId =
    activePage && activePage.sections.some((s) => s.id === activeSectionId)
      ? activeSectionId
      : activePage?.sections[0]?.id ?? ""
  const activeSection: CmsSection | undefined = activePage?.sections.find(
    (s) => s.id === effectiveSectionId,
  )
  const activeOverride = pageOverrides.find((o) => o.sectionId === effectiveSectionId)

  const effectiveValue = useCallback(
    (sectionId: string, path: string): string => {
      const override = overrides.find((o) => o.pageId === activePageId && o.sectionId === sectionId)
      if (override && path in override.fields) return String(override.fields[path])
      return defaultValueString(defaults, sectionId, path)
    },
    [overrides, activePageId, defaults],
  )

  const draftValue = useCallback(
    (sectionId: string, path: string): string =>
      edits[path] ?? effectiveValue(sectionId, path),
    [edits, effectiveValue],
  )

  const loadOverrides = useCallback(async () => {
    const res = await fetch("/api/admin/cms")
    if (res.status === 401) {
      setAccess("unauthenticated")
      return
    }
    if (res.status === 403) {
      setAccess("forbidden")
      return
    }
    if (!res.ok) throw new Error(`CMS load failed (${res.status})`)
    const json = (await res.json()) as {
      success: boolean
      data: { overrides: OverrideDto[]; user: AdminUser }
    }
    setOverrides(json.data.overrides)
    setAdminUser(json.data.user)
    setAccess("authed")
  }, [])

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cms/audit")
      if (!res.ok) return
      const json = (await res.json()) as { success: boolean; data: { entries: AuditEntry[] } }
      setAudit(json.data.entries)
    } catch {
      // audit is supplementary — never block the editor on it
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/cms")
      .then(async (res) => {
        if (res.status === 401) return { kind: "unauthenticated" as const }
        if (res.status === 403) return { kind: "forbidden" as const }
        if (!res.ok) throw new Error(`CMS load failed (${res.status})`)
        const json = (await res.json()) as {
          success: boolean
          data: { overrides: OverrideDto[]; user: AdminUser }
        }
        return { kind: "authed" as const, json }
      })
      .then(async (result) => {
        if (cancelled) return
        if (result.kind !== "authed") {
          setAccess(result.kind)
          return
        }
        setOverrides(result.json.data.overrides)
        setAdminUser(result.json.data.user)
        setAccess("authed")
        // audit is supplementary — never block the editor on it
        const auditRes = await fetch("/api/admin/cms/audit")
        if (cancelled) return
        if (auditRes.ok) {
          const auditJson = (await auditRes.json()) as { success: boolean; data: { entries: AuditEntry[] } }
          if (!cancelled) setAudit(auditJson.data.entries)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setFlash({ kind: "err", text: e instanceof Error ? e.message : "Could not reach the CMS API." })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([loadOverrides(), loadAudit()])
  }, [loadOverrides, loadAudit])

  const changedFields: CmsField[] = useMemo(() => {
    if (!activeSection) return []
    return activeSection.fields.filter((field) => {
      const draft = edits[field.path]
      return draft !== undefined && draft !== effectiveValue(activeSection.id, field.path)
    })
  }, [activeSection, edits, effectiveValue])

  const fieldsToSend = useMemo(() => {
    if (!activeSection) return {} as Record<string, string>
    const out: Record<string, string> = {}
    for (const field of activeSection.fields) {
      const draft = draftValue(activeSection.id, field.path)
      const def = defaultValueString(defaults, activeSection.id, field.path)
      if (draft !== def && draft.trim() !== "") out[field.path] = draft
    }
    return out
  }, [activeSection, draftValue, defaults])

  const isDirty = changedFields.length > 0
  const effectivePublish = publishDraft ?? activeOverride?.isPublished ?? true

  const clearEditorState = useCallback(() => {
    setEdits({})
    setPublishDraft(null)
    setResetArmed(false)
    setFlash(null)
  }, [])

  const selectSection = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId)
      clearEditorState()
    },
    [clearEditorState],
  )

  const selectPage = useCallback(
    (pageId: string) => {
      setActivePageId(pageId)
      setActiveSectionId("")
      setSearch("")
      clearEditorState()
    },
    [clearEditorState],
  )

  const save = useCallback(async () => {
    if (!activeSection || busy) return
    const sendCount = Object.keys(fieldsToSend).length
    if (sendCount === 0 && !activeOverride) {
      setFlash({ kind: "err", text: "Nothing to save — every value matches the code default." })
      return
    }
    setBusy("save")
    try {
      if (sendCount === 0 && activeOverride) {
        // Editor reverted to defaults → drop the override entirely.
        const res = await fetch(
          `/api/admin/cms?pageId=${encodeURIComponent(activePageId)}&sectionId=${encodeURIComponent(activeSection.id)}`,
          { method: "DELETE" },
        )
        if (!res.ok) throw new Error("Reset failed")
        setFlash({ kind: "ok", text: `"${activeSection.label}" reverted to code defaults.` })
      } else {
        const res = await fetch("/api/admin/cms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: activePageId,
            sectionId: activeSection.id,
            fields: fieldsToSend,
            isPublished: effectivePublish,
          }),
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as { message?: string } | null
          throw new Error(json?.message ?? `Save failed (${res.status})`)
        }
        setFlash({
          kind: "ok",
          text: `"${activeSection.label}" ${effectivePublish ? "published" : "saved as draft"} — ${sendCount} field${sendCount === 1 ? "" : "s"}.`,
        })
      }
      setEdits({})
      setPublishDraft(null)
      setResetArmed(false)
      await refresh()
      setPreviewKey((k) => k + 1)
    } catch (error) {
      setFlash({ kind: "err", text: error instanceof Error ? error.message : "Save failed" })
    } finally {
      setBusy(null)
    }
  }, [activeSection, activeOverride, activePageId, busy, fieldsToSend, effectivePublish, refresh])

  const togglePublish = useCallback(
    async (checked: boolean) => {
      setPublishDraft(checked)
      if (!activeOverride || !activeSection || busy) return
      setBusy("publish")
      try {
        const res = await fetch("/api/admin/cms", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: activePageId,
            sectionId: activeOverride.sectionId,
            fields: activeOverride.fields,
            isPublished: checked,
          }),
        })
        if (!res.ok) throw new Error(`Publish toggle failed (${res.status})`)
        setFlash({
          kind: "ok",
          text: checked
            ? `"${activeSection.label}" is live on ${activePage?.route ?? "the page"}.`
            : `"${activeSection.label}" unpublished — defaults render again.`,
        })
        await refresh()
        setPreviewKey((k) => k + 1)
      } catch (error) {
        setFlash({ kind: "err", text: error instanceof Error ? error.message : "Publish toggle failed" })
      } finally {
        setBusy(null)
      }
    },
    [activeOverride, activeSection, activePageId, activePage, busy, refresh],
  )

  const resetSection = useCallback(async () => {
    if (!activeSection || busy) return
    setBusy("reset")
    try {
      const res = await fetch(
        `/api/admin/cms?pageId=${encodeURIComponent(activePageId)}&sectionId=${encodeURIComponent(activeSection.id)}`,
        { method: "DELETE" },
      )
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(json?.message ?? `Reset failed (${res.status})`)
      }
      setFlash({ kind: "ok", text: `"${activeSection.label}" reset — code defaults are live again.` })
      setEdits({})
      setPublishDraft(null)
      setResetArmed(false)
      await refresh()
      setPreviewKey((k) => k + 1)
    } catch (error) {
      setFlash({ kind: "err", text: error instanceof Error ? error.message : "Reset failed" })
    } finally {
      setBusy(null)
    }
  }, [activeSection, activePageId, busy, refresh])

  // Cmd/Ctrl+S saves the open section.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        if (access === "authed" && isDirty) void save()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [access, isDirty, save])

  const filteredSections = useMemo(() => {
    if (!activePage) return []
    const q = search.trim().toLowerCase()
    if (!q) return activePage.sections
    return activePage.sections.filter(
      (s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    )
  }, [activePage, search])

  const stats = useMemo(() => {
    const sections = activePage?.sections.length ?? 0
    const fields = activePage?.sections.reduce((sum, s) => sum + s.fields.length, 0) ?? 0
    const published = pageOverrides.filter((o) => o.isPublished).length
    return {
      sections,
      fields,
      overridden: pageOverrides.length,
      published,
      drafts: pageOverrides.length - published,
    }
  }, [activePage, pageOverrides])

  if (access === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CircleJVLoader size="md" showText={true} />
      </div>
    )
  }

  if (access === "unauthenticated" || access === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-soft">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
            {access === "unauthenticated" ? "Sign in required" : "Super-admin access required"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {access === "unauthenticated"
              ? "The content studio manages what visitors see on the marketing pages. Sign in with a super-admin account to continue."
              : "The content studio is restricted to super-admins: accounts with the admin role, or emails listed in the server's ADMIN_EMAILS environment variable. Your account has neither right now."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {access === "unauthenticated" ? (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" aria-hidden />
                  Back to dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* 1 — Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <FileCode2 className="h-5 w-5 text-primary" aria-hidden />
          <div className="mr-auto">
            <p className="text-sm font-semibold leading-tight">JiraVision Content Studio</p>
            <p className="text-xs text-muted-foreground">Landing-page copy, without a redeploy</p>
          </div>
          {activePage && (
            <Button asChild variant="outline" size="sm">
              <a href={activePage.route} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                View {activePage.label}
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" aria-hidden />
              Dashboard
            </Link>
          </Button>
          {adminUser && (
            <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-3 pr-1.5">
              <div className="text-right">
                <p className="text-xs font-medium leading-tight">{adminUser.name}</p>
                <p className="text-[10px] leading-tight text-muted-foreground">{adminUser.email}</p>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-wide">
                {adminUser.role}
              </Badge>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        {/* 2 — Flash message */}
        {flash && (
          <Alert variant={flash.kind === "err" ? "destructive" : "default"}>
            {flash.kind === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            ) : undefined}
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{flash.text}</span>
              <button
                type="button"
                onClick={() => setFlash(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* 3 — Page selector */}
        <section aria-label="Landing pages" className="rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            {CMS_PAGES.map((page) => {
              const count = overrides.filter((o) => o.pageId === page.id).length
              const selected = page.id === activePageId
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => selectPage(page.id)}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "flex items-center gap-2 rounded-lg border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
                      : "flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                  }
                >
                  {page.label}
                  <code className="text-[10px] opacity-70">{page.route}</code>
                  {count > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* 4 — Stats strip */}
        <section aria-label="Page statistics" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Sections", value: stats.sections },
            { label: "Editable fields", value: stats.fields },
            { label: "Overridden", value: stats.overridden },
            { label: "Published", value: stats.published },
            { label: "Unpublished drafts", value: stats.drafts },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-soft">
              <p className="font-display text-2xl font-medium tracking-tight">{stat.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* 5 — Section navigator */}
          <section aria-label="Sections" className="rounded-xl border bg-card shadow-soft">
            <div className="border-b p-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter sections…"
                  className="pl-8"
                  aria-label="Filter sections"
                />
              </div>
            </div>
            <ul className="max-h-[560px] divide-y overflow-y-auto">
              {filteredSections.map((section) => {
                const override = pageOverrides.find((o) => o.sectionId === section.id)
                const selected = section.id === effectiveSectionId
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => selectSection(section.id)}
                      aria-current={selected}
                      className={
                        selected
                          ? "flex w-full items-center gap-2 bg-primary/5 px-3 py-2.5 text-left"
                          : "flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className={selected ? "truncate text-sm font-medium text-primary" : "truncate text-sm font-medium"}>
                          {section.label}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">{section.id}</p>
                      </div>
                      {override ? (
                        <Badge
                          variant="outline"
                          className={
                            override.isPublished
                              ? "shrink-0 rounded-full border-primary/40 bg-primary/10 text-[10px] text-primary"
                              : "shrink-0 rounded-full border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                          }
                        >
                          {override.isPublished ? "Live" : "Draft"} · {Object.keys(override.fields).length}
                        </Badge>
                      ) : (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          Default
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
              {filteredSections.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No section matches “{search}”.
                </li>
              )}
            </ul>
          </section>

          {/* 6+7+8 — Field editor, publish control, reset */}
          <section aria-label="Section editor" className="space-y-4">
            {activeSection ? (
              <div className="rounded-xl border bg-card shadow-soft">
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <div className="mr-auto">
                    <h2 className="font-display text-lg font-medium tracking-tight">
                      {activeSection.label}
                    </h2>
                    <p className="font-mono text-xs text-muted-foreground">
                      {activePageId}.{activeSection.id} · {activeSection.fields.length} fields
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="publish-toggle"
                      checked={effectivePublish}
                      onCheckedChange={(checked) => void togglePublish(checked)}
                      disabled={busy !== null}
                      aria-label="Publish this section's override"
                    />
                    <label htmlFor="publish-toggle" className="text-xs font-medium">
                      {effectivePublish ? "Published" : "Draft (hidden)"}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEdits({})
                        setFlash(null)
                      }}
                      disabled={!isDirty || busy !== null}
                    >
                      Discard
                    </Button>
                    <Button size="sm" onClick={() => void save()} disabled={!isDirty || busy !== null}>
                      {busy === "save" ? (
                        <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Save className="mr-1.5 h-4 w-4" aria-hidden />
                      )}
                      {isDirty ? `Save ${changedFields.length} change${changedFields.length === 1 ? "" : "s"}` : "Saved"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {activeSection.fields.map((field) => {
                    const draft = draftValue(activeSection.id, field.path)
                    const def = defaultValueString(defaults, activeSection.id, field.path)
                    const overridden = Boolean(activeOverride && field.path in activeOverride.fields)
                    const modified = draft !== def
                    return (
                      <div
                        key={field.path}
                        className={field.type === "longtext" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}
                      >
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`field-${field.path}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            {field.label}
                          </label>
                          <code className="font-mono text-[10px] text-muted-foreground/70">{field.path}</code>
                          {modified && (
                            <Badge variant="outline" className="ml-auto rounded-full border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                              <Pencil className="mr-1 h-2.5 w-2.5" aria-hidden />
                              Modified
                            </Badge>
                          )}
                          {!modified && overridden && (
                            <Badge variant="outline" className="ml-auto rounded-full text-[10px]">
                              Overridden
                            </Badge>
                          )}
                        </div>
                        {field.type === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`field-${field.path}`}
                              checked={draft === "true"}
                              onCheckedChange={(checked) =>
                                setEdits((prev) => ({ ...prev, [field.path]: checked ? "true" : "false" }))
                              }
                            />
                            <span className="text-xs text-muted-foreground">{draft === "true" ? "Yes" : "No"}</span>
                          </div>
                        ) : field.type === "longtext" ? (
                          <Textarea
                            id={`field-${field.path}`}
                            value={draft}
                            onChange={(event) =>
                              setEdits((prev) => ({ ...prev, [field.path]: event.target.value }))
                            }
                            rows={3}
                            className="text-sm"
                          />
                        ) : (
                          <Input
                            id={`field-${field.path}`}
                            type={field.type === "number" ? "number" : "text"}
                            value={draft}
                            onChange={(event) =>
                              setEdits((prev) => ({ ...prev, [field.path]: event.target.value }))
                            }
                            className="text-sm"
                            placeholder={field.type === "url" ? "/path, #anchor or https://…" : undefined}
                          />
                        )}
                        {modified && def && (
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            <span className="font-medium">Code default:</span>{" "}
                            <span className="line-through decoration-muted-foreground/50">
                              {def.length > 120 ? `${def.slice(0, 120)}…` : def}
                            </span>
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Reset zone */}
                {activeOverride && (
                  <div className="flex flex-wrap items-center gap-3 rounded-b-xl border-t bg-destructive/5 p-4">
                    <div className="mr-auto text-xs text-muted-foreground">
                      Reset removes the stored override for this section — the code default renders
                      immediately. Last edited by {activeOverride.updatedByName} ·{" "}
                      {formatWhen(activeOverride.updatedAt)}.
                    </div>
                    {resetArmed ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void resetSection()}
                          disabled={busy !== null}
                        >
                          {busy === "reset" ? (
                            <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                          )}
                          Confirm reset
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setResetArmed(false)} disabled={busy !== null}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setResetArmed(true)} disabled={busy !== null}>
                        <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
                        Reset to default
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
                Select a section to edit its copy.
              </div>
            )}

            {/* 9 — Live preview */}
            {activePage && (
              <div className="rounded-xl border bg-card shadow-soft">
                <div className="flex items-center gap-3 border-b p-4">
                  <div className="mr-auto">
                    <h2 className="font-display text-lg font-medium tracking-tight">Live preview</h2>
                    <p className="text-xs text-muted-foreground">
                      Published overrides render instantly; drafts stay hidden until published.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPreviewKey((k) => k + 1)}>
                    <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
                    Reload
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href={activePage.route} target="_blank" rel="noreferrer">
                      Open in tab
                      <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden />
                    </a>
                  </Button>
                </div>
                <iframe
                  key={previewKey}
                  src={activePage.route}
                  title={`Live preview of ${activePage.label}`}
                  className="h-[560px] w-full rounded-b-xl bg-white"
                />
              </div>
            )}
          </section>
        </div>

        {/* 10 — Audit log */}
        <section aria-label="Audit log" className="rounded-xl border bg-card shadow-soft">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="mr-auto">
              <h2 className="font-display text-lg font-medium tracking-tight">Recent changes</h2>
              <p className="text-xs text-muted-foreground">
                Last {audit.length} CMS mutations across every landing page.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadAudit()}>
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Refresh
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">CMS audit log, newest first</caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-semibold">When</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Actor</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Page · Section</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Fields</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((entry) => {
                  const fieldCount = typeof entry.detail?.fieldCount === "number" ? entry.detail.fieldCount : null
                  const removed = Array.isArray(entry.detail?.removedFields) ? entry.detail.removedFields.length : null
                  return (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatWhen(entry.createdAt)}</td>
                      <td className="px-4 py-2.5 font-medium">{entry.actorName}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            ACTION_STYLE[entry.action]
                              ? `inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${ACTION_STYLE[entry.action]}`
                              : "inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                          }
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-muted-foreground">{entry.pageId}</span>
                        <span className="mx-1 text-muted-foreground/50">·</span>
                        <code className="font-mono text-xs">{entry.sectionId}</code>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {fieldCount !== null ? `${fieldCount} changed` : removed !== null ? `${removed} removed` : "—"}
                      </td>
                    </tr>
                  )
                })}
                {audit.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No CMS changes yet — the first save will show up here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 11 — Cross-links / footer */}
        <footer className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 text-xs text-muted-foreground shadow-soft">
          <span className="mr-auto">
            Overrides apply to published sections on {CMS_PAGES.map((p) => p.route).join(", ")}.
            Everything else renders from <code className="font-mono">content/*.ts</code> in the repo.
          </span>
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            Dashboard
          </Link>
          <Link href="/status" className="font-medium text-primary hover:underline">
            Service status
          </Link>
          <Link href="/changelog" className="font-medium text-primary hover:underline">
            Changelog
          </Link>
        </footer>
      </main>
    </div>
  )
}
