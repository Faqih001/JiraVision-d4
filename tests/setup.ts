import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local for database connection
config({ path: resolve(process.cwd(), ".env.local") });
