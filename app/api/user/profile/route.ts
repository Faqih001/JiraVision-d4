import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"
import { getUserProfile, updateUserProfile } from "@/lib/data-access"
import { africanTimezones, internationalTimezones, languages } from "@/lib/timezones"

// GET user profile data
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
    
    // Get user profile using the helper function
    const userProfile = await getUserProfile(userId).catch(error => {
      console.error(`Error fetching profile for user ${userId}:`, error)
      throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    })
    
    if (!userProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      profile: userProfile
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch user profile:", error)
    return NextResponse.json(
      { error: `Failed to fetch user profile: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// PUT/Update user profile data
export async function PUT(request: Request) {
  try {
    const session = await getSession()
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.id
    const body = await request.json()
    
    // Fields that can be updated
    const { name, avatar, jobTitle, department, location, bio, language, timezone } = body      // Validate input
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }
    
    // Validate language (if provided)
    if (language) {
      const validLanguages = languages.map(lang => lang.value);
      if (!validLanguages.includes(language)) {
        return NextResponse.json(
          { 
            error: "Invalid language selected. Please choose a valid language.", 
            validOptions: validLanguages,
            supportedLanguages: languages
          },
          { status: 400 }
        )
      }
    }
    
    // Validate timezone (if provided)
    if (timezone) {
      // Create a list of all valid timezone values from both arrays
      const validTimezones = [
        ...africanTimezones.map(tz => tz.value),
        ...internationalTimezones.map(tz => tz.value)
      ];
      
      if (!validTimezones.includes(timezone)) {
        return NextResponse.json(
          { 
            error: "Invalid timezone selected. Please choose a valid timezone.",
            validOptions: validTimezones,
            africanTimezones,
            internationalTimezones
          },
          { status: 400 }
        )
      }
    }
    
    // Update user profile using the helper function
    const success = await updateUserProfile(userId, {
      name,
      avatar: avatar || null,
      jobTitle,
      department, 
      location, 
      bio,
      language: body.language,
      timezone: body.timezone,
      updatedAt: new Date()
    }).catch(error => {
      console.error(`Error updating profile for user ${userId}:`, error)
      throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    })
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully"
    })
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to update user profile:", error)
    return NextResponse.json(
      { error: `Failed to update user profile: ${errorMessage}` },
      { status: 500 }
    )
  }
}
