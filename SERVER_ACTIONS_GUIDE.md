# Server Actions Quick Reference

## Usage Pattern

All server actions are defined in `/app/actions.ts` and can be imported and used in any component.

```typescript
"use client"; // Required for components using hooks

import { getUsers, getTasks } from "@/app/actions";
import { useEffect, useState } from "react";
```

## Available Actions

### 1. `getData()`
Test connection and get current database time.

```typescript
const result = await getData();
// Returns: [{ current_time: Date }]
```

### 2. `getUsers()`
Get all users with their basic information.

```typescript
const users = await getUsers();
// Returns: Array of users with id, name, email, role, avatar, etc.
```

### 3. `getUserById(userId: number)`
Get a specific user by their ID.

```typescript
const user = await getUserById(1);
// Returns: User object or null if not found
```

### 4. `getTasks()`
Get all tasks with assignee and sprint information.

```typescript
const tasks = await getTasks();
// Returns: Array of tasks with assignee_name and sprint_name
```

### 5. `getSprints()`
Get all sprints ordered by start date.

```typescript
const sprints = await getSprints();
// Returns: Array of sprint objects
```

### 6. `getWellbeingMetrics(userId: number)`
Get wellbeing metrics for a specific user (last 30 days).

```typescript
const metrics = await getWellbeingMetrics(1);
// Returns: Array of wellbeing metric records
```

### 7. `getGamificationData(userId: number)`
Get gamification stats for a user.

```typescript
const gameData = await getGamificationData(1);
// Returns: Object with level, xp, achievements, etc.
```

### 8. `getCalendarEvents()`
Get all calendar events with organizer information.

```typescript
const events = await getCalendarEvents();
// Returns: Array of calendar events
```

### 9. `getChatMessages(chatId: string)`
Get all messages for a specific chat.

```typescript
const messages = await getChatMessages("chat-uuid-here");
// Returns: Array of messages with sender info
```

### 10. `getUserChats(userId: number)`
Get all chats for a user with unread count.

```typescript
const chats = await getUserChats(1);
// Returns: Array of chats with unread_count and last_message
```

## Complete Component Example

```typescript
"use client";

import { getTasks } from "@/app/actions";
import { useEffect, useState } from "react";

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee_name: string | null;
  sprint_name: string | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const data = await getTasks();
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <div className="grid gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="border rounded-lg p-4">
            <h3 className="font-semibold">{task.title}</h3>
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>Status: {task.status}</span>
              <span>Priority: {task.priority}</span>
              {task.assignee_name && (
                <span>Assigned to: {task.assignee_name}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Creating New Server Actions

To add a new server action:

1. Open `/app/actions.ts`
2. Add your function with `"use server"` at the top of the file
3. Use the Neon SQL template literal syntax

Example:

```typescript
export async function getTasksByStatus(status: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const tasks = await sql`
      SELECT * FROM tasks 
      WHERE status = ${status}
      ORDER BY created_at DESC
    `;
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw new Error("Failed to fetch tasks");
  }
}
```

## Best Practices

1. **Always validate input** - Check parameters before using them
2. **Handle errors gracefully** - Use try-catch blocks
3. **Return meaningful data** - Include only necessary fields
4. **Use TypeScript types** - Define return types for better DX
5. **Log errors** - Use console.error for debugging
6. **Check environment variables** - Ensure DATABASE_URL exists

## Security Notes

- ✅ Server actions run on the server only
- ✅ Database credentials are never exposed to the client
- ✅ Use parameterized queries to prevent SQL injection
- ✅ Validate and sanitize user input
- ✅ Implement proper authentication before accessing data

## Error Handling

```typescript
"use client";

import { getTasks } from "@/app/actions";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function TasksList() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await getTasks();
        setTasks(data);
      } catch (error) {
        toast.error("Failed to load tasks");
        console.error(error);
      }
    }
    loadTasks();
  }, []);

  return <div>{/* Your UI */}</div>;
}
```

## Performance Tips

1. **Use loading states** - Show spinners while fetching
2. **Implement caching** - Use React Query or SWR for caching
3. **Paginate results** - Don't load all data at once
4. **Optimize queries** - Use indexes and efficient SQL
5. **Debounce searches** - Avoid excessive API calls

## Testing Server Actions

```typescript
// test-actions.ts
import { getData, getUsers } from "@/app/actions";

async function testActions() {
  console.log("Testing getData...");
  const timeData = await getData();
  console.log("✅ getData works:", timeData);

  console.log("\nTesting getUsers...");
  const users = await getUsers();
  console.log("✅ getUsers works:", users.length, "users found");
}

testActions();
```

---

**💡 Tip:** Keep all database operations in server actions to maintain security and separation of concerns.
