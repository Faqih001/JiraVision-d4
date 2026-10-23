import { createJsonCollection, newId } from "@/lib/data/json-store"

// Double opt-in: records start as "pending" until the confirmation link in the
// email is opened, then flip to "confirmed". Only confirmed addresses count.

export interface SubscriberRecord {
  id: string
  email: string
  source: string
  createdAt: string
  status: "pending" | "confirmed"
  confirmToken: string
  confirmedAt?: string
}

const subscribers = createJsonCollection<SubscriberRecord>("subscribers")

function normalize(record: SubscriberRecord): SubscriberRecord {
  // Legacy rows (pre double opt-in) had no id/status/token.
  return {
    ...record,
    id: record.id ?? newId(),
    status: record.status ?? "confirmed",
    confirmToken: record.confirmToken ?? newId(),
  }
}

export const subscriberStore = {
  async add(email: string, source: string): Promise<{ record: SubscriberRecord; exists: boolean }> {
    const all = (await subscribers.list()).map(normalize)
    const existing = all.find((r) => r.email.toLowerCase() === email.toLowerCase())
    if (existing) return { record: existing, exists: true }
    const record = await subscribers.add({
      email,
      source,
      createdAt: new Date().toISOString(),
      status: "pending",
      confirmToken: newId(),
    })
    return { record, exists: false }
  },

  async confirm(token: string): Promise<SubscriberRecord | undefined> {
    const all = (await subscribers.list()).map(normalize)
    const target = all.find((r) => r.confirmToken === token)
    if (!target) return undefined
    if (target.status === "confirmed") return target
    return subscribers.update(target, { status: "confirmed", confirmedAt: new Date().toISOString() })
  },
}
