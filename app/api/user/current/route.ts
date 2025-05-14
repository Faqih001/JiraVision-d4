import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile } from "@/lib/data-access"

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.id
    
    // Get user profile
    const userProfile = await getUserProfile(userId)
    
    if (!userProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar,
        role: userProfile.role
      }
    })
    
  } catch (error) {
    console.error("Failed to fetch current user:", error)
    return NextResponse.json(
      { error: "Failed to fetch current user" },
      { status: 500 }
    )
  }
} 