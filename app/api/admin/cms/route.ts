// /api/admin/cms — super-admin content overrides for landing pages.
// GET    → registry (pages/sections/fields) + every stored override.
// PUT    → upsert one section's override { pageId, sectionId, fields, isPublished }.
// DELETE → reset one section (?pageId=&sectionId=) back to code defaults.
// Every mutation writes cms_audit_log and notifies the other super-admins.

import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { CMS_PAGES, findPage, findSection, sanitizeOverrideFields } from "@/lib/cms-registry"
import {
  badRequest,
  fetchOverride,
  fetchOverrides,
  notifyOtherAdmins,
  requireSuperAdmin,
  serverError,
  writeAudit,
} from "./_shared"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireSuperAdmin()
  if ("error" in gate) return gate.error
  const { user } = gate

  try {
    const overrides = await fetchOverrides()
    return NextResponse.json({
      success: true,
      data: {
        pages: CMS_PAGES,
        overrides,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    })
  } catch (error) {
    return serverError(error, "list overrides")
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireSuperAdmin()
  if ("error" in gate) return gate.error
  const { user } = gate

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") return badRequest("Request body must be a JSON object")

    const pageId = typeof body.pageId === "string" ? body.pageId : ""
    const sectionId = typeof body.sectionId === "string" ? body.sectionId : ""
    const page = findPage(pageId)
    const section = findSection(pageId, sectionId)
    if (!page || !section) return badRequest("Unknown page or section")

    const fields = sanitizeOverrideFields(pageId, sectionId, body.fields)
    if (!fields) return badRequest("fields must be an object")
    if (Object.keys(fields).length === 0) return badRequest("No valid fields to save")

    const isPublished = body.isPublished === undefined ? true : body.isPublished === true

    const previous = await fetchOverride(pageId, sectionId)
    await db.execute(sql`
      INSERT INTO cms_content_overrides (page_id, section_id, fields, is_published, updated_by, updated_at)
      VALUES (${pageId}, ${sectionId}, ${JSON.stringify(fields)}::jsonb, ${isPublished}, ${user.id}, now())
      ON CONFLICT (page_id, section_id) DO UPDATE
      SET fields = EXCLUDED.fields, is_published = EXCLUDED.is_published,
          updated_by = EXCLUDED.updated_by, updated_at = now()
    `)

    let action = "save"
    if (previous && previous.isPublished !== isPublished) action = isPublished ? "publish" : "unpublish"
    else if (!previous) action = isPublished ? "publish" : "save"
    await writeAudit(pageId, sectionId, action, user.id, {
      fieldCount: Object.keys(fields).length,
      fields: Object.keys(fields),
      isPublished,
      wasPublished: previous?.isPublished ?? null,
    })

    const verb = isPublished ? "published" : "saved as draft"
    await notifyOtherAdmins(user, {
      title: `CMS: "${section.label}" ${verb}`,
      body: `${user.name} ${verb} the ${section.label} section on the ${page.label} page (${Object.keys(fields).length} field${Object.keys(fields).length === 1 ? "" : "s"}).`,
    })

    const override = await fetchOverride(pageId, sectionId)
    return NextResponse.json({ success: true, data: { override, action } }, { status: 201 })
  } catch (error) {
    return serverError(error, "save override")
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireSuperAdmin()
  if ("error" in gate) return gate.error
  const { user } = gate

  try {
    const pageId = request.nextUrl.searchParams.get("pageId") ?? ""
    const sectionId = request.nextUrl.searchParams.get("sectionId") ?? ""
    const page = findPage(pageId)
    const section = findSection(pageId, sectionId)
    if (!page || !section) return badRequest("Unknown page or section")

    const previous = await fetchOverride(pageId, sectionId)
    if (!previous) {
      return NextResponse.json({ success: false, message: "No override exists for this section" }, { status: 404 })
    }

    await db.execute(sql`
      DELETE FROM cms_content_overrides WHERE page_id = ${pageId} AND section_id = ${sectionId}
    `)
    await writeAudit(pageId, sectionId, "reset", user.id, {
      removedFields: Object.keys(previous.fields),
      wasPublished: previous.isPublished,
    })
    await notifyOtherAdmins(user, {
      title: `CMS: "${section.label}" reset to defaults`,
      body: `${user.name} removed the override for the ${section.label} section on the ${page.label} page — code defaults are live again.`,
    })

    return NextResponse.json({ success: true, data: { reset: true, pageId, sectionId } })
  } catch (error) {
    return serverError(error, "reset override")
  }
}
