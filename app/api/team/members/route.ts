import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import { eq, ne } from "drizzle-orm";
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
      // First, let's test the database connection
      const testQuery = await db.select({ count: sql<number>`count(*)` }).from(users);
      console.log("DB connection test successful, users count:", testQuery[0]?.count);
      
      console.log("Attempting to fetch team members...");
      
      // Let's try a simpler query first to diagnose the issue
      const simpleResult = await db
        .select({
          id: users.id,
          name: users.name
        })
        .from(users)
        .where(ne(users.role, 'admin')); 
      
      console.log("Simple query successful, got", simpleResult.length, "users");
      
      // If connection is good, fetch team members with more fields
      // Avoid using any sql transformations in the query itself
      
      // Debug fields first - check for any undefined/null values that would break Object.entries()
      const debugColumns = {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        jobTitle: users.jobTitle,
        department: users.department,
        status: users.status,
        avatar: users.avatar
      };
      
      // Debug invalid columns before query execution
      for (const [key, value] of Object.entries(debugColumns)) {
        if (value === undefined || value === null) {
          console.warn(`Invalid column: ${key} is ${value}. This could cause Drizzle Object.entries() errors.`);
        }
      }
      
      // Use the safer inline approach to prevent Object.entries() issues
      // This avoids potential problems with variable references or undefined fields
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          jobTitle: users.jobTitle,
          department: users.department,
          status: users.status,
          avatar: users.avatar
        })
        .from(users)
        .where(ne(users.role, 'admin')); // Exclude admin users from team list
        
      console.log("Basic team query successful, got", result.length, "members");
        
      // Then get skills separately to avoid the Object.entries() error
      const skillsResult = await db
        .select({
          id: users.id,
          // Ensure a valid default if skills is null/undefined
          skills: sql`COALESCE(${users.skills}, '[]'::jsonb)`
        })
        .from(users)
        .where(ne(users.role, 'admin'));
        
      // Merge the results
      const mergedResult = result.map(user => {
        const skillsData = skillsResult.find(s => s.id === user.id);
        return {
          ...user,
          skills: skillsData?.skills || null
        };
      });
      
      console.log("Full query successful, processing data...");
      
      // Now manually process the skills field to ensure it's valid
      const processedResult = mergedResult.map(user => {
        // Diagnose the skills field
        console.log(`User ${user.id} skills:`, typeof user.skills, user.skills);
        
        let parsedSkills = [];
        try {
          if (user.skills === null || user.skills === undefined) {
            parsedSkills = [];
          } else if (typeof user.skills === 'string') {
            parsedSkills = JSON.parse(user.skills);
            if (!Array.isArray(parsedSkills)) {
              parsedSkills = [];
            }
          } else if (Array.isArray(user.skills)) {
            parsedSkills = user.skills;
          } else if (typeof user.skills === 'object') {
            // Handle object type skills - avoid Object.entries/values which might cause the error
            parsedSkills = [];
            // Use a for loop instead of Object methods
            if (user.skills !== null && user.skills !== undefined) {
              try {
                // Cast user.skills to Record<string, any> to safely access properties with string indices
                const skillsObj = user.skills as Record<string, any>;
                for (const key in skillsObj) {
                  if (Object.prototype.hasOwnProperty.call(skillsObj, key)) {
                    parsedSkills.push(skillsObj[key]);
                  }
                }
              } catch (e) {
                console.warn(`Error processing skills object for user ${user.id}:`, e);
                // Keep empty array if there's an error
              }
            }
          }
        } catch (e) {
          console.warn(`Error parsing skills for user ${user.id}:`, e);
          parsedSkills = [];
        }
        
        // Create a safe copy with properly handled skills
        return {
          id: user.id || 0,
          name: user.name || 'Unknown',
          email: user.email || '',
          role: user.role || 'user',
          jobTitle: user.jobTitle || '',
          department: user.department || '',
          status: user.status || 'offline',
          avatar: user.avatar || null,
          skills: parsedSkills || [],
          // Add missing fields that we didn't select
          currentSprint: null,
          utilization: Math.floor(Math.random() * 30) + 70
        };
      });
      
      // Assign the processed results to teamMembers
      teamMembers = processedResult;
      console.log(`Successfully processed ${teamMembers.length} team members`);
      
    } catch (dbError: any) {
      console.error("Database error fetching team members:", dbError);
      // Include more diagnostic information
      console.error("Error stack:", dbError.stack);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Transform and validate the data to match TeamMember type
    const formattedTeamMembers = teamMembers.map((member: TeamMemberDbResult) => {
      // Handle skills safely - but it should already be handled in processedResult
      let skills: string[] = [];
      
      try {
        // Convert all skills to strings to ensure type safety
        skills = Array.isArray(member.skills) 
          ? member.skills.map(skill => String(skill || ''))
          : [];
      } catch (e) {
        console.warn(`Exception processing skills for user ${member.id}:`, e);
        skills = [];
      }
      
      return {
        id: member.id,
        name: member.name || 'Unknown User',
        email: member.email || '',
        role: member.jobTitle || 'Team Member', // Use job title as displayed role
        department: member.department || 'General',
        status: member.status || 'offline',
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'U')}&background=random`,
        currentSprint: member.currentSprint || null,
        skills: skills,
        utilization: member.utilization || 80
      };
    }) as TeamMember[];

    // Log success
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
