// Test database connection
require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
console.log(`Using database URL: ${connectionString}`);

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  debug: true,
  onnotice: msg => console.log('DB Notice:', msg)
});

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // Try to connect and run a simple query
    const result = await sql`SELECT NOW() as current_time`;
    console.log('Database connection successful!');
    console.log('Current time from database:', result[0].current_time);
    
    // Now test the kanban_columns table
    console.log('Testing kanban_columns table...');
    const columnsResult = await sql`SELECT * FROM kanban_columns ORDER BY "order"`;
    console.log(`Found ${columnsResult.length} kanban columns:`);
    columnsResult.forEach(col => {
      console.log(`  - ID: ${col.id}, Title: ${col.title}, Color: ${col.color}, Order: ${col.order}`);
    });
    
    // Test kanban_tasks table if columns exist
    if (columnsResult.length > 0) {
      console.log('Testing kanban_tasks table...');
      const tasksResult = await sql`
        SELECT t.*, c.title as column_title 
        FROM kanban_tasks t
        JOIN kanban_columns c ON t.column_id = c.id
        ORDER BY c.order, t.order
      `;
      console.log(`Found ${tasksResult.length} kanban tasks:`);
      tasksResult.forEach(task => {
        console.log(`  - ID: ${task.id}, Title: ${task.title}, Column: ${task.column_title}, Priority: ${task.priority}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  } finally {
    // Always close the connection
    await sql.end();
    console.log('Database connection closed');
  }
}

testDatabaseConnection()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
