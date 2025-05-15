import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-actions";
import { getTasksBySprintId } from "@/lib/data-access";

// GET handler for /api/sprints/[id]/tasks - Returns tasks for a specific sprint
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

    // Get tasks for this sprint
    const tasks = await getTasksBySprintId(id);
    
    return NextResponse.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error(`Error fetching tasks for sprint with ID ${params.id}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to fetch tasks for sprint with ID ${params.id}`,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
