import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// Connect to the database
// Use connection string from environment variable
const connectionString = process.env.DATABASE_URL || "postgres://jiravision_dev:devpassword@localhost:5432/jiravisiondb_local";
const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log("Starting calendar events table migration...");
  
  try {
    // Check if the table already exists
    const checkTable = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'calendar_events'
      );
    `;
    
    if (checkTable[0].exists) {
      console.log("Table calendar_events already exists, skipping creation");
    } else {
      // Create the calendar_events table
      await client`
        CREATE TABLE calendar_events (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          location TEXT,
          event_type VARCHAR(50) NOT NULL DEFAULT 'meeting',
          organizer_id INTEGER NOT NULL REFERENCES users(id),
          is_all_day BOOLEAN DEFAULT FALSE,
          is_recurring BOOLEAN DEFAULT FALSE,
          recurring_pattern JSONB DEFAULT '{}',
          attendees JSONB DEFAULT '[]',
          color VARCHAR(50) DEFAULT 'blue',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      console.log("Table calendar_events created successfully");
      
      // Add index on start_time and end_time for better query performance
      await client`
        CREATE INDEX calendar_events_start_time_idx ON calendar_events(start_time);
      `;
      
      await client`
        CREATE INDEX calendar_events_end_time_idx ON calendar_events(end_time);
      `;
      
      console.log("Indexes created for calendar_events table");
    }
    
    // Seed some sample calendar events
    // First check if we already have events
    const existingEvents = await client`SELECT COUNT(*) FROM calendar_events`;
    
    if (existingEvents[0].count > 0) {
      console.log(`Calendar events table already has ${existingEvents[0].count} records, skipping seeding`);
    } else {
      // Get some user IDs to use as organizers
      const users = await client`SELECT id FROM users LIMIT 5`;
      
      if (users.length === 0) {
        console.log("No users found for event organizers, skipping event seeding");
      } else {
        const organizer1 = users[0].id;
        const organizer2 = users.length > 1 ? users[1].id : users[0].id;
        
        // Create attendees array with all user IDs
        const attendees = users.map(user => user.id);
        
        // Insert sample calendar events
        await client`
          INSERT INTO calendar_events 
            (title, description, start_time, end_time, location, event_type, organizer_id, is_all_day, attendees, color)
          VALUES
            ('Sprint Planning', 'Define goals and tasks for the next sprint', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours', 'Conference Room A', 'planning', ${organizer1}, FALSE, ${JSON.stringify(attendees)}::jsonb, 'blue'),
            ('Team Retrospective', 'Review the completed sprint and identify improvements', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 1 hour 30 minutes', 'Virtual Meeting Room', 'retrospective', ${organizer2}, FALSE, ${JSON.stringify(attendees.slice(0, 3))}::jsonb, 'green'),
            ('Product Demo', 'Showcase new features to stakeholders', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 1 hour', 'Main Conference Room', 'demo', ${organizer1}, FALSE, ${JSON.stringify(attendees)}::jsonb, 'purple'),
            ('Stakeholder Meeting', 'Quarterly business review with stakeholders', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 2 hours', 'Executive Boardroom', 'meeting', ${organizer2}, FALSE, ${JSON.stringify(attendees.slice(0, 2))}::jsonb, 'amber'),
            ('Team Building', 'Outdoor team building activity', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days 8 hours', 'City Park', 'other', ${organizer1}, TRUE, ${JSON.stringify(attendees)}::jsonb, 'pink')
        `;
        
        console.log("Sample calendar events inserted successfully");
      }
    }
    
    console.log("Calendar events migration completed successfully");
  } catch (error) {
    console.error("Error in calendar events migration:", error);
  } finally {
    // Close the database connection
    await client.end();
  }
}

main();
