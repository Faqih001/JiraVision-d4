import { promises as fs } from "fs"
import path from "path"

// Typed, swappable data layer per the v2 brief: a small interface with a local
// JSON-file adapter now; a Supabase/Postgres adapter can implement the same
// interface later without touching callers.
// NOTE(deploy): on serverless (Vercel) the JSON file is instance-local and
// ephemeral — replace with a real database adapter before relying on this in production.

export interface SubscriberRecord {
  email: string
  source: string
  createdAt: string
}

export interface SubscriberStore {
  add(record: SubscriberRecord): Promise<{ ok: true; exists: boolean }>
}

const FILE = path.join(process.cwd(), "data", "subscribers.json")

async function readAll(): Promise<SubscriberRecord[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SubscriberRecord[]) : []
  } catch {
    return []
  }
}

export const jsonFileSubscriberStore: SubscriberStore = {
  async add(record) {
    const all = await readAll()
    if (all.some((r) => r.email.toLowerCase() === record.email.toLowerCase())) {
      return { ok: true, exists: true }
    }
    all.push(record)
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(all, null, 2))
    return { ok: true, exists: false }
  },
}

export const subscriberStore = jsonFileSubscriberStore
