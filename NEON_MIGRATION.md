# JiraVision - Neon Database Migration Guide

## Overview
This guide will help you transition from Supabase to Neon database for JiraVision.

## Prerequisites
- Neon account (sign up at https://neon.tech)
- Database credentials from Neon

## Step 1: Set Up Neon Project

1. Log in to your Neon console at https://console.neon.tech
2. Create a new project or use the existing one
3. Copy your connection string (it should look like):
   ```
   postgresql://neondb_owner:npg_...@ep-...-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2: Update Environment Variables

Your `.env` file should contain your Neon connection string:

```env
DATABASE_URL='postgresql://[username]:[password]@[host].neon.tech/[database]?sslmode=require'
```

**Security Note:** Never commit the `.env` file to version control. Keep your database credentials secure and never share them publicly.

## Step 3: Create Database Tables

Run the SQL script to create all tables in your Neon database:

### Option A: Using Neon SQL Editor (Recommended)
1. Go to your Neon project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Copy the contents of `neon-setup.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the script

### Option B: Using psql Command Line
```bash
psql "$DATABASE_URL" < neon-setup.sql
```

### Option C: Using Drizzle Kit
```bash
npm run db:push
```

## Step 4: Verify Database Setup

Test the connection by running:

```bash
npm run db:test
```

Or create a simple test file:

```typescript
import { getData } from "@/app/actions";

async function testConnection() {
  try {
    const result = await getData();
    console.log("✅ Database connection successful:", result);
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

testConnection();
```

## Step 5: Using Server Actions

All database queries should now use server actions to keep credentials secure:

```typescript
// In your component file
"use client";

import { getData, getUsers, getTasks } from "@/app/actions";
import { useEffect, useState } from "react";

export function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const result = await getData();
      setData(result);
    }
    fetchData();
  }, []);

  return <div>{/* Your component */}</div>;
}
```

## Available Server Actions

The following server actions are available in `/app/actions.ts`:

- `getData()` - Test query to get current time
- `getUsers()` - Get all users
- `getUserById(userId)` - Get user by ID
- `getTasks()` - Get all tasks with assignee and sprint info
- `getSprints()` - Get all sprints
- `getWellbeingMetrics(userId)` - Get wellbeing metrics for a user
- `getGamificationData(userId)` - Get gamification data for a user
- `getCalendarEvents()` - Get all calendar events
- `getChatMessages(chatId)` - Get messages for a specific chat
- `getUserChats(userId)` - Get all chats for a user

## Database Schema

The database includes the following tables:

1. **users** - User accounts and profiles
2. **password_reset_tokens** - Password reset functionality
3. **sprints** - Agile sprint management
4. **tasks** - Task tracking
5. **wellbeing_metrics** - Team wellbeing tracking
6. **gamification** - User gamification data
7. **ethical_metrics** - Ethical workplace metrics
8. **sprint_analytics** - Sprint performance analytics
9. **ai_insights** - AI-generated insights
10. **chats** - Chat conversations
11. **chat_participants** - Chat membership
12. **messages** - Chat messages
13. **reactions** - Message reactions
14. **kanban_columns** - Kanban board columns
15. **kanban_tasks** - Kanban board tasks
16. **kanban_task_comments** - Task comments
17. **kanban_task_attachments** - Task file attachments
18. **calendar_events** - Calendar and events

## Migration from Supabase

If you have existing data in Supabase:

1. Export your data from Supabase:
   ```bash
   pg_dump "your-supabase-connection-string" > supabase_backup.sql
   ```

2. Import to Neon (after running the schema setup):
   ```bash
   psql "your-neon-connection-string" < supabase_backup.sql
   ```

## Neon Advantages

- ✅ **Serverless Postgres** - Scales automatically
- ✅ **Branching** - Create database branches for development
- ✅ **Connection Pooling** - Built-in connection pooling
- ✅ **Instant Setup** - No infrastructure management
- ✅ **Cost-Effective** - Pay only for what you use
- ✅ **Modern Developer Experience** - Great DX with instant databases

## Security Best Practices

1. **Never expose DATABASE_URL to client-side code**
2. **Always use Server Actions** for database queries
3. **Use environment variables** for sensitive data
4. **Enable SSL** (already configured in connection string)
5. **Rotate credentials** regularly in production
6. **Use connection pooling** (already configured)

## Troubleshooting

### Connection Issues
- Verify your DATABASE_URL is correct
- Check that SSL is enabled (should be in connection string)
- Ensure your IP is not blocked by firewall

### Query Errors
- Check table names and column names match the schema
- Verify data types are correct
- Look for SQL syntax errors in console

### Performance Issues
- Use connection pooling (already configured)
- Add indexes for frequently queried columns
- Use EXPLAIN ANALYZE for slow queries

## Next Steps

1. Run the database setup SQL script
2. Test the connection
3. Start using server actions in your components
4. Migrate any existing data from Supabase (if applicable)
5. Update any direct database queries to use server actions

## Support

For Neon-specific issues, visit:
- Neon Documentation: https://neon.tech/docs
- Neon Discord: https://discord.gg/neon
- Neon GitHub: https://github.com/neondatabase

For JiraVision issues, check the main README.md

---

**🎉 Your database is now powered by Neon!**
