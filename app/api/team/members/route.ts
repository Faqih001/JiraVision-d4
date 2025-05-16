import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { sql } from 'drizzle-orm';
import { eq, ne } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession()
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized", details: "No valid session found" },
        { status: 401 }
      )
    }

    // Fetch team members from database with all required fields
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.jobTitle,
        department: users.department,
        status: users.status,
        avatar: users.avatar,
        currentSprint: sql<{ name: string, tasks: number } | null>`NULL`, // You can implement this later if needed
        skills: sql<string[]>`NULL`, // You can implement this later if needed
        utilization: sql<number>`100` // Default utilization
      })
      .from(users)
      .where(ne(users.role, 'admin'))
      
    if (!teamMembers || !Array.isArray(teamMembers)) {
      throw new Error("Failed to fetch team members")
    }

    // Transform the data to match the expected format while handling null values
    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name || 'Unknown User',
      email: member.email || '',
      role: member.role || 'Team Member',
      department: member.department || 'General',
      status: member.status || 'offline',
      avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=random`,
      currentSprint: member.currentSprint,
      skills: member.skills || [],
      utilization: member.utilization,
    }))

    // Log success
    console.log(`Successfully fetched ${formattedTeamMembers.length} team members`)

    return NextResponse.json({ 
      success: true,
      teamMembers: formattedTeamMembers 
    })
  } catch (error) {
    console.error("Error fetching team members:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch team members" },
      { status: 500 }
    )
  }
}
