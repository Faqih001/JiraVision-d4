import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-actions";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sprints } from "@/drizzle/schema";
import { getSprintById } from "@/lib/data-access";

// GET handler for /api/sprints/[id] - Returns a specific sprint by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sprint ID" },
        { status: 400 }
      );
    }

    // Get sprint by ID
    const sprint = await getSprintById(id);
    
    if (!sprint) {
      return NextResponse.json(
        { success: false, message: "Sprint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sprint
    });
  } catch (error) {
    console.error(`Error fetching sprint with ID ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch sprint with ID ${params.id}`,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
