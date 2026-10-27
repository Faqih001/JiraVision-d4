// /api/packs — role packs as data (design §12 item 1). Every signed-in member reads the
// active packs; a super-admin may read inactive ones and author new ones. Creating a pack
// here is the whole mechanism by which "every role across companies" needs no code change.

import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { rolePacks } from "@/drizzle/schema"
import { getSession } from "@/lib/auth-actions"
import { isSuperAdmin } from "@/lib/roles"
import { readPackInput } from "@/lib/packs/pack"
import { loadPacks } from "@/lib/registers/read"

export const dynamic = "force-dynamic"

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET(request: Request) {
  const session = await getSession()
  if (!session?.id) return bad("Unauthorized", 401)

  const admin = isSuperAdmin(session)
  const wantsAll = new URL(request.url).searchParams.get("all") === "1"

  try {
    const packs = await loadPacks(wantsAll && admin)
    return NextResponse.json({ success: true, data: { packs, admin } })
  } catch (error) {
    console.error("Packs read error:", error)
    return bad("Failed to load role packs", 500)
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session?.id) return bad("Unauthorized", 401)
  if (!isSuperAdmin(session)) return bad("Super-admin access required", 403)

  const body = await request.json().catch(() => null)
  const parsed = readPackInput(body)
  if (!parsed.ok) return bad(parsed.error)

  try {
    const [existing] = await db
      .select({ id: rolePacks.id })
      .from(rolePacks)
      .where(eq(rolePacks.packKey, parsed.value.packKey))
      .limit(1)
    if (existing) return bad(`A pack with the key "${parsed.value.packKey}" already exists.`, 409)

    const pack = parsed.value
    const [row] = await db
      .insert(rolePacks)
      .values({
        packKey: pack.packKey,
        title: pack.title,
        disciplines: pack.disciplines,
        registerKinds: pack.registerKinds,
        sections: pack.sections,
        reportTemplate: pack.reportTemplate,
        ladderDiscipline: pack.ladderDiscipline,
        onboarding: pack.onboarding,
        method: pack.method,
        isActive: pack.isActive,
      })
      .returning({ id: rolePacks.id })

    return NextResponse.json({ success: true, data: { id: row.id, pack } }, { status: 201 })
  } catch (error) {
    console.error("Pack create error:", error)
    return bad("Failed to create the pack", 500)
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session?.id) return bad("Unauthorized", 401)
  if (!isSuperAdmin(session)) return bad("Super-admin access required", 403)

  const body = await request.json().catch(() => null)
  const parsed = readPackInput(body)
  if (!parsed.ok) return bad(parsed.error)

  try {
    const pack = parsed.value
    const updated = await db
      .update(rolePacks)
      .set({
        title: pack.title,
        disciplines: pack.disciplines,
        registerKinds: pack.registerKinds,
        sections: pack.sections,
        reportTemplate: pack.reportTemplate,
        ladderDiscipline: pack.ladderDiscipline,
        onboarding: pack.onboarding,
        method: pack.method,
        isActive: pack.isActive,
        updatedAt: new Date(),
      })
      .where(eq(rolePacks.packKey, pack.packKey))
      .returning({ id: rolePacks.id })

    if (updated.length === 0) return bad("Pack not found", 404)
    return NextResponse.json({ success: true, data: { pack } })
  } catch (error) {
    console.error("Pack update error:", error)
    return bad("Failed to save the pack", 500)
  }
}
