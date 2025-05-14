// Create missing chat tables script

const postgres = require('postgres');
require('dotenv').config();

async function createMissingTables() {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Creating missing chat tables...');
  
  // Create connection
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Define SQL for missing tables
    const createChatParticipantsTable = `
    CREATE TABLE IF NOT EXISTS "chat_participants" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
      "user_id" integer NOT NULL REFERENCES "users"("id"),
      "joined_at" timestamp DEFAULT now(),
      "last_read" timestamp,
      "is_admin" boolean DEFAULT false,
      "is_blocked" boolean DEFAULT false,
      "is_muted" boolean DEFAULT false,
      "notification_level" varchar(20) DEFAULT 'all',
      "theme" varchar(20) DEFAULT 'default'
    );
    `;
    
    const createReactionsTable = `
    CREATE TABLE IF NOT EXISTS "reactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "emoji" text NOT NULL,
      "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
      "user_id" integer NOT NULL REFERENCES "users"("id")
    );
    `;
    
    // Create the chat_participants table
    console.log('Creating chat_participants table...');
    await client.unsafe(createChatParticipantsTable);
    
    // Create the reactions table
    console.log('Creating reactions table...');
    await client.unsafe(createReactionsTable);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "chat_participants_chat_user_idx" 
      ON "chat_participants" ("chat_id", "user_id");
    `);
    
    await client.unsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "reactions_message_user_emoji_idx" 
      ON "reactions" ("message_id", "user_id", "emoji");
    `);
    
    // Verify tables were created
    const tablesResult = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('chats', 'messages', 'chat_participants', 'reactions')
    `;
    
    const existingTables = tablesResult.map(row => row.table_name);
    console.log('Tables now in database:', existingTables);
    
    // Check for required tables
    const requiredTables = ['chats', 'messages', 'chat_participants', 'reactions'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`❌ Error: The following tables are still missing: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All required tables now exist!');
    }
    
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
  }
}

// Run the function
createMissingTables(); 