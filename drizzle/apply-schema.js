// Direct database schema application

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get the migration SQL
const MIGRATION_FILE = path.join(__dirname, 'migrations', '0000_wandering_edwin_jarvis.sql');

async function applySchema() {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Applying schema directly...');
  
  // Create connection
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Read the SQL file
    console.log(`Reading migration file: ${MIGRATION_FILE}`);
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    
    // Split into statements (simple approach)
    const statements = sql.split(';').filter(s => s.trim());
    
    // Execute each statement
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.unsafe(statement);
      } catch (error) {
        // Log but continue - the error might be that the table already exists
        console.warn(`Warning executing statement ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('Schema application completed!');
    
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
    console.error('Error applying schema:', error);
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
  }
}

// Run the apply schema function
applySchema(); 