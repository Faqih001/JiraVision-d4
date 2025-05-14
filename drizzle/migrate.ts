import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const runMigrations = async () => {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Running migrations...');
  
  // Create connection
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  try {
    // Run migrations
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close connection
    await migrationClient.end();
  }
};

// Run the migration function
runMigrations(); 