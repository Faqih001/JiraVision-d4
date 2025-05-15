// Script to check all tables from the schema

const postgres = require('postgres');
require('dotenv').config();

async function checkAllTables() {
  console.log('Checking all schema tables in the database...');
  
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  // Create connection
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // All tables that should exist according to schema.ts
    const expectedTables = [
      'users', 
      'chats', 
      'chat_participants', 
      'messages', 
      'reactions',
      'password_reset_tokens',
      'sprints',
      'tasks',
      'wellbeing_metrics',
      'gamification',
      'ethical_metrics',
      'sprint_analytics',
      'ai_insights',
      'kanban_columns',
      'kanban_tasks',
      'kanban_task_comments',
      'kanban_task_attachments'
    ];
    
    // Get all tables from the database
    const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const existingTables = result.map(row => row.table_name);
    console.log('\nExisting tables in database:');
    console.log(existingTables);
    
    // Check which tables are missing
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    console.log('\nSchema tables check:');
    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All expected tables exist in the database!');
    }
    
    // Check if there are tables in the database that are not in the schema
    const extraTables = existingTables.filter(table => !expectedTables.includes(table) && table !== 'drizzle_migrations');
    if (extraTables.length > 0) {
      console.log(`\nℹ️ Additional tables found in database (not in schema): ${extraTables.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the function
checkAllTables();
