import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, we would fetch data from the database
    // For demo purposes, we're returning mock data
    
    // Example database query implementation:
    // const columns = await db.query.kanbanColumns.findMany({
    //   include: { tasks: true },
    //   orderBy: { order: 'asc' },
    // });
    
    // Define mock data
    const columns = [
      {
        id: "backlog",
        title: "Backlog",
        color: "bg-slate-400",
        tasks: [
          {
            id: "task1",
            title: "Research competitor pricing",
            description: "Analyze pricing structures of main competitors",
            priority: "medium",
            dueDate: "2025-05-20",
            assignee: {
              id: "1",
              name: "John Doe",
              avatar: "",
            },
            tags: ["Research", "Marketing"],
            attachments: 2,
            comments: 3,
            subtasks: {
              total: 4,
              completed: 1,
            },
          },
          {
            id: "task2",
            title: "Update API documentation",
            priority: "low",
            tags: ["Documentation", "API"],
            attachments: 1,
            comments: 0,
          },
        ],
      },
      {
        id: "todo",
        title: "To Do",
        color: "bg-blue-500",
        tasks: [
          {
            id: "task3",
            title: "Create onboarding flow wireframes",
            priority: "high",
            dueDate: "2025-05-18",
            assignee: {
              id: "2",
              name: "Alice Smith",
              avatar: "",
            },
            tags: ["Design", "UI/UX"],
            attachments: 5,
            comments: 8,
            subtasks: {
              total: 3,
              completed: 0,
            },
          },
          {
            id: "task4",
            title: "Implement authentication service",
            priority: "high",
            tags: ["Backend", "Security"],
            comments: 2,
          },
        ],
      },
      {
        id: "in-progress",
        title: "In Progress",
        color: "bg-amber-500",
        tasks: [
          {
            id: "task5",
            title: "Implement dashboard charts",
            priority: "medium",
            dueDate: "2025-05-15",
            assignee: {
              id: "1",
              name: "John Doe",
              avatar: "",
            },
            tags: ["Frontend", "Data Visualization"],
            attachments: 1,
            comments: 4,
            subtasks: {
              total: 5,
              completed: 2,
            },
          },
        ],
      },
      {
        id: "review",
        title: "Review",
        color: "bg-purple-500",
        tasks: [
          {
            id: "task6",
            title: "Review landing page design",
            priority: "medium",
            assignee: {
              id: "3",
              name: "Bob Johnson",
              avatar: "",
            },
            tags: ["Design", "Marketing"],
            comments: 7,
          },
        ],
      },
      {
        id: "done",
        title: "Done",
        color: "bg-green-500",
        tasks: [
          {
            id: "task7",
            title: "Setup CI/CD pipeline",
            priority: "high",
            assignee: {
              id: "4",
              name: "Carol Williams",
              avatar: "",
            },
            tags: ["DevOps", "Infrastructure"],
            attachments: 2,
            subtasks: {
              total: 3,
              completed: 3,
            },
          },
          {
            id: "task8",
            title: "Create project documentation",
            priority: "low",
            tags: ["Documentation"],
            comments: 1,
          },
        ],
      },
    ]

    return NextResponse.json({ success: true, data: { columns } })
  } catch (error) {
    console.error("Error fetching Kanban data:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Kanban data" },
      { status: 500 }
    )
  }
}
