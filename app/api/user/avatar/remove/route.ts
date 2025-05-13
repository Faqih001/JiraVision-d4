import { NextResponse } from "next/server"
import { unlink } from "fs/promises"
import { join } from "path"
import { getSession } from "@/lib/auth-actions"
import { updateUserProfile, getUserProfile } from "@/lib/data-access"

// For profile picture deletion
export async function DELETE(request: Request) {
  try {
    const session = await getSession()
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.id
    
    // Get current avatar
    const profile = await getUserProfile(userId)
    if (!profile || !profile.avatar) {
      return NextResponse.json(
        { error: "No avatar to remove" },
        { status: 400 }
      )
    }
    
    // Check if it's a local upload (starts with /uploads/)
    if (profile.avatar.startsWith('/uploads/')) {
      try {
        // Remove the file if it exists
        const filePath = join(process.cwd(), 'public', profile.avatar)
        await unlink(filePath)
      } catch (error) {
        // Ignore file not found errors, just continue to remove from DB
        console.error("Error removing avatar file:", error)
      }
    }
    
    // Update user profile to remove avatar
    await updateUserProfile(userId, { avatar: null })
    
    return NextResponse.json({
      success: true,
      message: "Profile picture removed successfully"
    })
  } catch (error) {
    console.error("Failed to remove avatar:", error)
    return NextResponse.json(
      { error: "Failed to remove profile picture" },
      { status: 500 }
    )
  }
}
