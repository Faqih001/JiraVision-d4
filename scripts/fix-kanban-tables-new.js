// Script to fix Kanban tables in the database
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Creating Kanban tables and seeding sample data...');

// Function to run a SQL file
function runSqlFile(filePath) {
  try {
    // Get the database URL from .env file or use a default
    const envPath = path.join(__dirname, '..', '.env');
    let databaseUrl = 'postgresql://postgres:postgres@localhost:5432/jiravisiondb_local';
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=(.+)/);
      if (match && match[1]) {
        databaseUrl = match[1];
      }
    }
    
    // Read SQL file
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Use psql to execute the SQL (assumes psql is installed)
    execSync(`psql "${databaseUrl}" -c "${sql.replace(/"/g, '\\"')}"`);
    console.log(`SQL file ${filePath} executed successfully`);
    return true;
  } catch (error) {
    console.error(`Error running SQL file ${filePath}:`, error.message);
    return false;
  }
}

// Path to the PostgreSQL-specific SQL file
const sqlFilePath = path.join(__dirname, 'kanban-tables-pg.sql');

// Run the SQL file
if (runSqlFile(sqlFilePath)) {
  console.log('Kanban tables created and seeded successfully!');
} else {
  console.error('Failed to create or seed Kanban tables.');
  process.exit(1);
}
