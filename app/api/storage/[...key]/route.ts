import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { getAvatarSignedUrl, neonStorageEnabled } from "@/lib/neon-storage"

export const dynamic = "force-dynamic"

// Serves private-bucket objects by redirecting to a short-lived presigned URL.
export async function GET(request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!neonStorageEnabled()) {
    return NextResponse.json({ error: "Object storage not configured" }, { status: 503 })
  }

  const { key: segments } = await context.params
  const key = segments.join("/")
  if (!key.startsWith("avatars/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const url = await getAvatarSignedUrl(key)
  if (!url) return NextResponse.json({ error: "Object storage not configured" }, { status: 503 })
  return NextResponse.redirect(url, 307)
}
