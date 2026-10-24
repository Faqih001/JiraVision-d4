import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables (.env.local first, then .env)
dotenv.config({ path: '.env.local' });
dotenv.config();

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;

