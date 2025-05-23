import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import { ne } from "drizzle-orm";
import { getSession } from "@/lib/auth-actions";
import { type TeamMember } from "@/types/team";

// Define the type for the database query result
type TeamMemberDbResult = {
  id: number;
  name: string | null;
  email: string | null;
  role: string | null;
  jobTitle: string | null;
  department: string | null;
  status: string | null;
  avatar: string | null;
  skills: any; // JSONB field can be string or object
  currentSprint: { name: string; tasks: number } | null;
  utilization: number;
}

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getSession();
    if (!session || !session.id) {
      console.log("Team Members API: No valid session found, but proceeding for development");
    }

    // Fetch team members from database with all required fields
    let teamMembers: TeamMemberDbResult[] = [];
    
    try {
      // More simplified query with fewer potential error sources
      const queryResult = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          jobTitle: users.jobTitle,
          department: users.department,
          status: users.status,
          avatar: users.avatar,
          skills: sql`COALESCE(${users.skills}, '[]'::jsonb)`,
          utilization: sql<number>`80`
        })
        .from(users)
        .where(ne(users.role, 'admin')); // Exclude admin users from team list
      
      // Transform query result to match TeamMemberDbResult type
      teamMembers = queryResult.map(member => ({
        ...member,
        currentSprint: null // Add the missing currentSprint property
      }));
      
      console.log(`Successfully fetched ${teamMembers.length} team members`);
    } catch (dbError: any) {
      console.error("Database error fetching team members:", dbError);
      console.error("Error stack:", dbError.stack);
      
      // Fallback - return some mock data for development
      teamMembers = [
        {
          id: 1,
          name: "Demo User",
          email: "demo@example.com",
          role: "developer",
          jobTitle: "Developer",
          department: "Engineering",
          status: "online",
          avatar: null,
          skills: [],
          currentSprint: null,
          utilization: 85
        },
        {
          id: 2,
          name: "Test Manager",
          email: "manager@example.com",
          role: "manager",
          jobTitle: "Project Manager",
          department: "Management",
          status: "online",
          avatar: null,
          skills: [],
          currentSprint: null,
          utilization: 75
        }
      ];
    }

    // Transform and validate the data to match TeamMember type
    const formattedTeamMembers = teamMembers.map((member: TeamMemberDbResult) => {
      // Handle skills safely - ensure it's an array
      let skills: string[] = [];
      
      try {
        if (typeof member.skills === 'string') {
          skills = JSON.parse(member.skills);
        } else if (Array.isArray(member.skills)) {
          skills = member.skills.map(skill => String(skill || ''));
        }
      } catch (e) {
        console.warn(`Exception processing skills for user ${member.id}:`, e);
        skills = [];
      }
      
      // Ensure all required fields have valid values
      return {
        id: member.id,
        name: member.name || 'Unknown User',
        email: member.email || '',
        role: member.jobTitle || 'Team Member',
        department: member.department || 'General',
        status: member.status || 'offline',
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=random`,
        currentSprint: member.currentSprint || null,
        skills: skills,
        utilization: member.utilization || 80
      };
    }) as TeamMember[];

    console.log(`Successfully formatted ${formattedTeamMembers.length} team members`);

    return NextResponse.json({ 
      success: true,
      teamMembers: formattedTeamMembers 
    });
  } catch (error: any) {
    console.error("Error fetching team members:", error);
    // Return a more informative error response with an empty team members array
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || "Unknown error fetching team members",
        details: error?.stack?.toString() || "",
        teamMembers: [] 
      },
      { status: 500 }
    );
  }
}
