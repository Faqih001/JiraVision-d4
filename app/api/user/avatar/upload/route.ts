import { NextResponse } from "next/server"
import { writeFile, mkdir, access } from "fs/promises"
import { join } from "path"
import { constants } from "fs"
import sharp from "sharp"
import { getSession } from "@/lib/auth-actions"
import { updateUserProfile } from "@/lib/data-access"
import { avatarServeUrl, neonStorageEnabled, uploadAvatar } from "@/lib/neon-storage"

// For profile picture uploads: sharp-processed, then stored in the Neon
// Object Storage `assets` bucket. Falls back to public/uploads when the
// bucket env vars are absent (e.g. a deployment without storage wired).
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.id

    const formData = await request.formData()
    const file = formData.get("avatar") as File | null

    if (!file) {
      return NextResponse.json({ error: "No avatar file provided" }, { status: 400 })
    }

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image file (jpg, png, gif, webp)" },
        { status: 400 },
      )
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    let processed: Buffer
    let contentType = file.type
    try {
      const useWebP = formData.get("useWebp") === "true"
      const format = useWebP ? "webp" : file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : "jpeg"
      processed = await sharp(buffer, { failOn: "none", unlimited: true })
        .rotate()
        .resize({ width: 300, height: 300, fit: "cover", position: "centre", withoutEnlargement: true })
        .toFormat(format === "jpeg" ? "jpeg" : format === "gif" ? "jpeg" : format, {
          quality: format === "webp" ? 85 : 80,
          progressive: true,
          ...(format === "jpeg" ? { mozjpeg: true } : {}),
        })
        .toBuffer()
      if (format === "gif") contentType = "image/jpeg" // sharp cannot write gif
      else contentType = `image/${format}`
    } catch (sharpError) {
      console.error("Error optimizing image with Sharp:", sharpError)
      processed = buffer
    }

    let avatarUrl: string
    if (neonStorageEnabled()) {
      const uploaded = await uploadAvatar(userId, new Uint8Array(processed), contentType)
      if (!uploaded) {
        return NextResponse.json({ error: "Failed to upload to object storage" }, { status: 502 })
      }
      avatarUrl = avatarServeUrl(uploaded.key)
    } else {
      const bytes = new Uint8Array(8)
      crypto.getRandomValues(bytes)
      const uniqueId = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
      const fileExtension = file.name.split(".").pop() || "jpg"
      const fileName = `avatar-${userId}-${uniqueId}.${fileExtension}`
      const uploadsDir = join(process.cwd(), "public", "uploads")
      try {
        await access(uploadsDir, constants.F_OK).catch(() => mkdir(uploadsDir, { recursive: true }))
      } catch (dirError) {
        console.error("Failed to check/create uploads directory:", dirError)
        throw new Error(`Directory access error: ${dirError instanceof Error ? dirError.message : "Unknown error"}`)
      }
      await writeFile(join(uploadsDir, fileName), processed)
      avatarUrl = `/uploads/${fileName}`
    }

    const updateResult = await updateUserProfile(userId, { avatar: avatarUrl })
    if (!updateResult) {
      console.error("Failed to update user profile with new avatar")
      return NextResponse.json({ error: "Failed to update profile with new avatar" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Profile picture uploaded successfully",
      avatar: avatarUrl,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to process avatar upload:", error)
    return NextResponse.json({ error: `Failed to process avatar upload: ${errorMessage}` }, { status: 500 })
  }
}
