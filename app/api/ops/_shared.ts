// Shared helpers for /api/ops/* routes.

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"

export function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message }, { status: 400 })
}

export function notFound(message = "Not found") {
  return NextResponse.json({ success: false, message }, { status: 404 })
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ success: false, message }, { status: 403 })
}

export function serverError(error: unknown, action: string) {
  console.error(`Error during ${action}:`, error)
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json(
    { success: false, message: `Failed to ${action}`, error: message },
    { status: 500 },
  )
}

export async function opsSession() {
  const session = await getSession()
  if (!session || typeof session.id !== "number") return null
  return {
    id: session.id,
    email: session.email,
    role: session.role,
    timezone: session.timezone ?? null,
    admin: session.role === "admin" || session.role === "super_admin",
  }
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}
