// The register page's controls and its query string, using the same grammar as the work log:
// unknown or hand-edited values fall back rather than erroring, so a shared link opens
// something sensible (design §4, §12 item 2).

import {
  isRegisterCustody,
  isRegisterStatus,
  REGISTER_STATUS_LABEL,
  type RegisterCustody,
  type RegisterStatus,
} from "./rules"
import { isStale, stalenessOf, type Staleness } from "./staleness"

export const REGISTER_VIEWS = ["list", "grid", "board"] as const
export type RegisterView = (typeof REGISTER_VIEWS)[number]

export const REGISTER_VIEW_LABEL: Record<RegisterView, string> = {
  list: "List",
  grid: "Grid",
  board: "By kind",
}

export function isRegisterView(value: unknown): value is RegisterView {
  return typeof value === "string" && (REGISTER_VIEWS as readonly string[]).includes(value)
}

export type RegisterViewState = {
  view: RegisterView
  q: string
  kind: string
  status: RegisterStatus | "all"
  custody: RegisterCustody | "all"
  owner: number | null
  mine: boolean
  stale: boolean
}

const MAX_QUERY = 120

export function defaultRegisterView(): RegisterViewState {
  return {
    view: "list",
    q: "",
    kind: "all",
    status: "all",
    custody: "all",
    owner: null,
    mine: false,
    stale: false,
  }
}

export function parseRegisterView(search: URLSearchParams): RegisterViewState {
  const state = defaultRegisterView()

  const view = search.get("v")
  if (isRegisterView(view)) state.view = view

  state.q = (search.get("q") ?? "").slice(0, MAX_QUERY)

  const kind = (search.get("kind") ?? "").trim()
  if (kind) state.kind = kind.slice(0, 40)

  const status = search.get("status")
  if (isRegisterStatus(status)) state.status = status

  const custody = search.get("custody")
  if (isRegisterCustody(custody)) state.custody = custody

  const owner = search.get("owner")
  if (owner && /^\d+$/u.test(owner)) state.owner = Number(owner)

  state.mine = search.get("mine") === "1"
  state.stale = search.get("stale") === "1"

  return state
}

export function serializeRegisterView(state: RegisterViewState): string {
  const out = new URLSearchParams()
  if (state.view !== "list") out.set("v", state.view)
  if (state.q.trim()) out.set("q", state.q.trim())
  if (state.kind !== "all") out.set("kind", state.kind)
  if (state.status !== "all") out.set("status", state.status)
  if (state.custody !== "all") out.set("custody", state.custody)
  if (state.owner !== null) out.set("owner", String(state.owner))
  if (state.mine) out.set("mine", "1")
  if (state.stale) out.set("stale", "1")
  return out.toString()
}

export type RegisterFilterRow = {
  title: string
  kind: string
  status: RegisterStatus
  custody: RegisterCustody
  ownerId: number | null
  lastVerifiedAt: string | null
  verifyIntervalDays: number | null
  fields?: Record<string, string>
}

const haystack = (row: RegisterFilterRow): string =>
  `${row.title} ${row.kind} ${Object.values(row.fields ?? {}).join(" ")}`.toLowerCase()

export function matchesRegister(
  row: RegisterFilterRow,
  state: RegisterViewState,
  viewerId: number,
  todayIso: string,
): boolean {
  if (state.kind !== "all" && row.kind !== state.kind) return false
  if (state.status !== "all" && row.status !== state.status) return false
  if (state.custody !== "all" && row.custody !== state.custody) return false
  if (state.owner !== null && row.ownerId !== state.owner) return false
  if (state.mine && row.ownerId !== viewerId) return false
  if (state.stale && !isStale(row, todayIso)) return false

  const query = state.q.trim().toLowerCase()
  if (query) {
    const text = haystack(row)
    if (!text.includes(query)) return false
  }
  return true
}

export function filterRegisters<T extends RegisterFilterRow>(
  rows: readonly T[],
  state: RegisterViewState,
  viewerId: number,
  todayIso: string,
): T[] {
  return rows.filter((row) => matchesRegister(row, state, viewerId, todayIso))
}

export function groupRegistersByKind<T extends { kind: string }>(
  rows: readonly T[],
): { kind: string; rows: T[] }[] {
  const buckets = new Map<string, T[]>()
  for (const row of rows) {
    const bucket = buckets.get(row.kind)
    if (bucket) bucket.push(row)
    else buckets.set(row.kind, [row])
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, group]) => ({ kind, rows: group }))
}

export type RegisterExportRow = RegisterFilterRow & {
  id: number
  packKey: string
  ownerName: string | null
}

const CSV_HEADER = [
  "id",
  "pack",
  "kind",
  "title",
  "status",
  "custody",
  "owner",
  "last_verified",
  "verify_interval_days",
  "staleness",
  "fields",
] as const

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function registersToCsv(rows: readonly RegisterExportRow[], todayIso: string): string {
  const body = rows.map((row) => {
    const state: Staleness = stalenessOf(row, todayIso)
    return [
      row.id,
      row.packKey,
      row.kind,
      row.title,
      REGISTER_STATUS_LABEL[row.status],
      row.custody,
      row.ownerName ?? "",
      row.lastVerifiedAt ?? "",
      row.verifyIntervalDays ?? "",
      state,
      JSON.stringify(row.fields ?? {}),
    ]
      .map(csvCell)
      .join(",")
  })
  return [CSV_HEADER.map(csvCell).join(","), ...body].join("\n")
}
