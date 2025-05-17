import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kanbanColumns, kanbanTasks, users } from "@/drizzle/schema"
import { asc, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    // Fetch kanban columns from the database
    const columnsResult = await db
      .select()
      .from(kanbanColumns)
      .orderBy(asc(kanbanColumns.order))
    
    // Prepare an array to hold our formatted columns with their tasks
    const columns = [];
    
    // Fetch tasks for each column and format response
    for (const column of columnsResult) {
      // Fetch tasks for this column
      const tasksResult = await db
        .select({
          id: kanbanTasks.id,
          title: kanbanTasks.title,
          description: kanbanTasks.description,
          priority: kanbanTasks.priority,
          status: kanbanTasks.status,
          dueDate: kanbanTasks.dueDate,
          assigneeId: kanbanTasks.assigneeId,
          tags: kanbanTasks.tags,
          attachments: kanbanTasks.attachments,
          comments: kanbanTasks.comments,
          subtasks: kanbanTasks.subtasks,
          order: kanbanTasks.order,
        })
        .from(kanbanTasks)
        .where(eq(kanbanTasks.columnId, column.id))
        .orderBy(asc(kanbanTasks.order))
      
      // Format tasks with assignee information
      const formattedTasks = [];
      
      for (const task of tasksResult) {
        let assignee = null;
        
        if (task.assigneeId) {
          // Fetch assignee info
          const assigneeResult = await db
            .select({
              id: users.id,
              name: users.name,
              avatar: users.avatar,
            })
            .from(users)
            .where(eq(users.id, task.assigneeId))
            .limit(1)
          
          if (assigneeResult.length > 0) {
            assignee = {
              id: assigneeResult[0].id,
              name: assigneeResult[0].name,
              avatar: assigneeResult[0].avatar || "",
            }
          }
        }
        
        // Format subtasks if it exists as JSON
        let subtasksFormatted = null;
        if (task.subtasks) {
          try {
            // Assuming subtasks is stored as JSON with total and completed properties
            const parsed = typeof task.subtasks === 'string' 
              ? JSON.parse(task.subtasks) 
              : task.subtasks;
            
            subtasksFormatted = {
              total: parsed.total || 0,
              completed: parsed.completed || 0,
            }
          } catch (error) {
            console.error('Error parsing subtasks JSON:', error);
            // Provide default values if parsing fails
            subtasksFormatted = {
              total: 0,
              completed: 0,
            }
          }
        }

        // Format due date if it exists
        let formattedDueDate;
        if (task.dueDate) {
          // Check if it's a Date object by seeing if it has toISOString function
          if (typeof task.dueDate === 'object' && task.dueDate !== null && 'toISOString' in task.dueDate) {
            formattedDueDate = (task.dueDate as Date).toISOString().split('T')[0];
          } else {
            // Otherwise, use it as is (assuming it's already formatted or a string)
            formattedDueDate = String(task.dueDate);
          }
        }
        
        // Add formatted task to array
        formattedTasks.push({
          id: task.id.toString(),
          title: task.title,
          description: task.description || "",
          priority: task.priority as 'low' | 'medium' | 'high',
          dueDate: formattedDueDate,
          assignee: assignee,
          tags: task.tags || [],
          attachments: task.attachments || 0,
          comments: task.comments || 0,
          subtasks: subtasksFormatted,
        });
      }
      
      // Add column with its tasks to the columns array
      columns.push({
        id: column.id.toString(),
        title: column.title,
        color: column.color,
        tasks: formattedTasks,
      });
    }
    
    // If no columns found in the database, provide default columns
    if (columns.length === 0) {
      columns.push(
        {
          id: "backlog",
          title: "Backlog",
          color: "bg-slate-400",
          tasks: [],
        },
        {
          id: "todo", 
          title: "To Do",
          color: "bg-blue-500",
          tasks: [],
        },
        {
          id: "in-progress",
          title: "In Progress",
          color: "bg-amber-500",
          tasks: [],
        },
        {
          id: "review",
          title: "Review",
          color: "bg-purple-500",
          tasks: [],
        },
        {
          id: "done",
          title: "Done",
          color: "bg-green-500",
          tasks: [],
        }
      );
    }

    return NextResponse.json({ success: true, data: { columns } })
  } catch (error) {
    console.error("Error fetching Kanban data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Kanban data" },
      { status: 500 }
    )
  }
}
