// filepath: /home/amirul/Desktop/Career/MERN/2025 Projects/JiraVision-d4/scripts/fix-kanban-tables.js
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
    
    // Execute the SQL file directly using the -f flag
    // This is more reliable for larger SQL files than passing content via -c
    execSync(`psql "${databaseUrl}" -f "${filePath}"`, { stdio: 'inherit' });
    console.log(`SQL file ${filePath} executed successfully`);
    return true;
  } catch (error) {
    console.error(`Error running SQL file ${filePath}:`, error.message);
    return false;
  }
}

// Use existing SQL file for kanban tables
let kanbanTablesSql = path.join(__dirname, 'kanban-tables-pg.sql');

// If the PostgreSQL-specific file doesn't exist, use the regular one
if (!fs.existsSync(kanbanTablesSql)) {
  console.log('PostgreSQL-specific SQL file not found, using regular file');
  kanbanTablesSql = path.join(__dirname, 'kanban-tables.sql');
}

// Run the SQL file
if (runSqlFile(kanbanTablesSql)) {
  console.log('Kanban tables created and seeded successfully!');
} else {
  console.error('Failed to create or seed Kanban tables.');
  process.exit(1);
}
