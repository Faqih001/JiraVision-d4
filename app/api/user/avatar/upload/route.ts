import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { getSession } from "@/lib/auth-actions"
import { updateUserProfile } from "@/lib/data-access"

// For profile picture uploads
export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.id
    
    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get("avatar") as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: "No avatar file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image file (jpg, png, gif, webp)" },
        { status: 400 }
      )
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      )
    }
    
    // Create a unique filename
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    const uniqueId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatar-${userId}-${uniqueId}.${fileExtension}`
    
    // Ensure the directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    
    try {
      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer())
      
      // Write the file
      await writeFile(join(uploadsDir, fileName), buffer)
      
      // Update user profile with avatar URL
      const avatarUrl = `/uploads/${fileName}`
      await updateUserProfile(userId, { avatar: avatarUrl })
      
      return NextResponse.json({
        success: true,
        message: "Profile picture uploaded successfully",
        avatar: avatarUrl
      })
    } catch (error) {
      console.error("Error writing file:", error)
      return NextResponse.json(
        { error: "Failed to upload profile picture" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Failed to process avatar upload:", error)
    return NextResponse.json(
      { error: "Failed to process avatar upload" },
      { status: 500 }
    )
  }
}
