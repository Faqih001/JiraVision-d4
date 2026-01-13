"use server";

import { neon } from "@neondatabase/serverless";

/**
 * Server action to fetch data from Neon database
 * This ensures database credentials are never exposed to client-side code
 */
export async function getData() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Example query - replace with your actual query
    const data = await sql`SELECT NOW() as current_time`;
    return data;
  } catch (error) {
    console.error("Database query error:", error);
    throw new Error("Failed to fetch data from database");
  }
}

/**
 * Get all users from the database
 */
export async function getUsers() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const users = await sql`
      SELECT id, name, email, role, avatar, job_title, department, location, status, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const result = await sql`
      SELECT * FROM users WHERE id = ${userId}
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }
}

/**
 * Get all tasks
 */
export async function getTasks() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const tasks = await sql`
      SELECT t.*, u.name as assignee_name, s.name as sprint_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN sprints s ON t.sprint_id = s.id
      ORDER BY t.created_at DESC
    `;
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw new Error("Failed to fetch tasks");
  }
}

/**
 * Get all sprints
 */
export async function getSprints() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const sprints = await sql`
      SELECT * FROM sprints 
      ORDER BY start_date DESC
    `;
    return sprints;
  } catch (error) {
    console.error("Error fetching sprints:", error);
    throw new Error("Failed to fetch sprints");
  }
}

/**
 * Get wellbeing metrics for a user
 */
export async function getWellbeingMetrics(userId: number) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const metrics = await sql`
      SELECT * FROM wellbeing_metrics 
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 30
    `;
    return metrics;
  } catch (error) {
    console.error("Error fetching wellbeing metrics:", error);
    throw new Error("Failed to fetch wellbeing metrics");
  }
}

/**
 * Get gamification data for a user
 */
export async function getGamificationData(userId: number) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const result = await sql`
      SELECT * FROM gamification 
      WHERE user_id = ${userId}
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching gamification data:", error);
    throw new Error("Failed to fetch gamification data");
  }
}

/**
 * Get calendar events
 */
export async function getCalendarEvents() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const events = await sql`
      SELECT e.*, u.name as organizer_name
      FROM calendar_events e
      LEFT JOIN users u ON e.organizer_id = u.id
      ORDER BY e.start_time ASC
    `;
    return events;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error("Failed to fetch calendar events");
  }
}

/**
 * Get chat messages for a chat
 */
export async function getChatMessages(chatId: string) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const messages = await sql`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ${chatId} AND m.deleted = false
      ORDER BY m.timestamp ASC
    `;
    return messages;
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    throw new Error("Failed to fetch chat messages");
  }
}

/**
 * Get user chats
 */
export async function getUserChats(userId: number) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    const chats = await sql`
      SELECT c.*, 
        (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND is_read = false) as unread_count,
        (SELECT content FROM messages WHERE chat_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
      FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = ${userId}
      ORDER BY c.updated_at DESC
    `;
    return chats;
  } catch (error) {
    console.error("Error fetching user chats:", error);
    throw new Error("Failed to fetch user chats");
  }
}
