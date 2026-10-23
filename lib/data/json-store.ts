import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

// Typed, swappable data layer per the v2 brief: a small interface with a local
// JSON-file adapter now; a Supabase/Postgres adapter can implement the same
// interface later without touching callers.
// NOTE(deploy): on serverless (Vercel) the JSON file is instance-local and
// ephemeral — replace with a real database adapter before relying on this in production.

export interface Entity {
  id: string
}

export interface Collection<T extends Entity> {
  list(): Promise<T[]>
  add(record: Omit<T, "id"> & { id?: string }): Promise<T>
  findBy(predicate: (record: T) => boolean): Promise<T | undefined>
  update(target: T, patch: Partial<Omit<T, "id">>): Promise<T>
}

export function newId(): string {
  return randomUUID()
}

export function createJsonCollection<T extends Entity>(name: string): Collection<T> {
  const file = path.join(process.cwd(), "data", `${name}.json`)

  async function readAll(): Promise<T[]> {
    try {
      const raw = await fs.readFile(file, "utf8")
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }

  async function writeAll(records: T[]): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(records, null, 2))
  }

  return {
    list: readAll,
    async add(record) {
      const all = await readAll()
      const entity = { ...record, id: record.id ?? newId() } as T
      all.push(entity)
      await writeAll(all)
      return entity
    },
    async findBy(predicate) {
      const all = await readAll()
      return all.find(predicate)
    },
    async update(target, patch) {
      const all = await readAll()
      const index = all.findIndex((r) => r.id === target.id)
      if (index === -1) throw new Error(`${name}: record ${target.id} not found`)
      const updated = { ...all[index], ...patch }
      all[index] = updated
      await writeAll(all)
      return updated
    },
  }
}
