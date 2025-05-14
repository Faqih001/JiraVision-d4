import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const generateMigration = async () => {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Generating migrations...');
  
  // Create connection for migration generation
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  try {
    await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    
    // Generate migrations
    // Note: In production, you would typically use drizzle-kit CLI instead
    console.log('To generate migrations, run the following command:');
    console.log('npx drizzle-kit generate:pg --schema=./drizzle/schema.ts --out=./drizzle/migrations');
  } catch (error) {
    console.error('Error setting up for migrations:', error);
    process.exit(1);
  } finally {
    // Close connection
    await migrationClient.end();
  }
};

// Run the migration generation function
generateMigration(); 