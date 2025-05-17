import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { kanbanColumns, kanbanTasks, users } from "@/drizzle/schema"
import { asc, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth-actions"

export async function GET(request: NextRequest) {
  try {
    console.log("Kanban API: Starting request handling");
    
    // Check authentication
    const session = await getSession()
    console.log(`Kanban API: Session check result: ${session ? 'Authenticated' : 'Not authenticated'}`);
    
    if (!session) {
      console.log("Kanban API: Authentication failed - No session");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    console.log("Kanban API: Fetching columns");
    // Fetch kanban columns from the database
    const columnsResult = await db
      .select()
      .from(kanbanColumns)
      .orderBy(asc(kanbanColumns.order))
    
    console.log(`Kanban API: Found ${columnsResult.length} columns`);
    
    // Prepare an array to hold our formatted columns with their tasks
    const columns = [];
    
    // Fetch tasks for each column and format response
    for (const column of columnsResult) {
      console.log(`Kanban API: Processing column ${column.id}: ${column.title}`);
      
      try {
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
        
        console.log(`Kanban API: Found ${tasksResult.length} tasks for column ${column.id}`);
        
        // Format tasks with assignee information
        const formattedTasks = [];
        
        for (const task of tasksResult) {
          try {
            console.log(`Kanban API: Processing task ${task.id}: ${task.title}`);
            let assignee = null;
            
            if (task.assigneeId) {
              // Fetch assignee info
              try {
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
              } catch (error) {
                console.error(`Kanban API: Error fetching assignee for task ${task.id}:`, error);
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
                  total: parsed?.total || 0,
                  completed: parsed?.completed || 0,
                }
              } catch (error) {
                console.error(`Kanban API: Error parsing subtasks JSON for task ${task.id}:`, error);
                // Provide default values if parsing fails
                subtasksFormatted = {
                  total: 0,
                  completed: 0,
                }
              }
            }

            // Format due date if it exists
            let formattedDueDate = undefined;
            if (task.dueDate) {
              try {
                // Try to format date - handle different types safely
                if (Object.prototype.toString.call(task.dueDate) === '[object Date]') {
                  formattedDueDate = new Date(task.dueDate).toISOString().split('T')[0];
                } else if (typeof task.dueDate === 'string') {
                  // If it's already a string, use it directly
                  formattedDueDate = task.dueDate;
                } else {
                  // For any other case, convert to string
                  formattedDueDate = String(task.dueDate);
                }
              } catch (error) {
                console.error(`Kanban API: Error formatting date for task ${task.id}:`, error);
                // If date formatting fails, use the raw value as a string
                formattedDueDate = String(task.dueDate);
              }
            }
            
            // Add formatted task to array
            formattedTasks.push({
              id: task.id.toString(),
              title: task.title || "Untitled Task",
              description: task.description || "",
              priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
              dueDate: formattedDueDate,
              assignee: assignee,
              tags: task.tags || [],
              attachments: task.attachments || 0,
              comments: task.comments || 0,
              subtasks: subtasksFormatted,
            });
          } catch (taskError) {
            console.error(`Kanban API: Error processing task ${task.id}:`, taskError);
            // Skip this task and continue with the next one
          }
        }
        
        // Add column with its tasks to the columns array
        columns.push({
          id: column.id.toString(),
          title: column.title,
          color: column.color,
          tasks: formattedTasks,
        });
      } catch (columnError) {
        console.error(`Kanban API: Error processing column ${column.id}:`, columnError);
        // Skip this column and continue with the next one
      }
    }
    
    console.log(`Kanban API: Finished processing ${columns.length} columns with tasks`);
    
    // If no columns found in the database, provide default columns
    if (columns.length === 0) {
      console.log("Kanban API: No columns found, providing default columns");
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

    console.log("Kanban API: Successfully returning response");
    return NextResponse.json({ success: true, data: { columns } })
  } catch (error) {
    console.error("Kanban API: Error fetching Kanban data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Kanban data" },
      { status: 500 }
    )
  }
}
