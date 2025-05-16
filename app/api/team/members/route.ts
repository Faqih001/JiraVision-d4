import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"
import { sql } from 'drizzle-orm';
import { eq, ne } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    // Fetch team members from database
    const teamMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.jobTitle,
        department: users.department,
        status: users.status,
        avatar: users.avatar,
      })
      .from(users)
      // Exclude admin users
      .where(ne(users.role, 'admin'))
    
    // Transform the data to match the expected format
    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role || 'Team Member',
      department: member.department || 'General',
      status: member.status || 'offline',
      avatar: member.avatar || `https://randomuser.me/api/portraits/men/${member.id}.jpg`,
    }))

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
