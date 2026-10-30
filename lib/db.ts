import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { users, passwordResetTokens } from '@/drizzle/schema';
import { resetTokenHash } from '@/lib/auth/reset-token';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// User type for authentication
export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  avatar: string | null;
  emailVerified: boolean;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  bio: string | null;
  language: string | null;
  timezone: string | null;
  skills: string[] | null;
  preferences: Record<string, unknown>;
  status: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// users.skills is a jsonb column, so postgres-js hands back a parsed array — but
// rows written before the column existed, and the raw-SQL paths in
// app/api/team/members/[id], can surface a JSON string or a list of non-strings.
// Accepted values are stringified rather than dropped so a malformed row degrades
// to usable text instead of silently emptying a profile.
function toSkills(value: unknown): string[] | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.map((s) => String(s));
}

// Use Neon connection string from .env
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env file.');
}

console.log('Database connection: Using Neon PostgreSQL Database');

// A cold handshake to the Neon pooler measures 3.6-9.0s while the compute wakes,
// even though TCP and TLS to the same host are clean (~250ms / ~500ms). The old
// 20s idle / 10s connect pair discarded warm sockets between requests and then
// killed the replacement handshake at the exact bound it was measured against, so
// nearly every dev request paid a cold connect and some failed it outright.
const connectionOptions: postgres.Options<{}> = {
  max: 10, // Maximum pool size for Neon
  idle_timeout: 300,
  connect_timeout: 30,
  // Neon requires SSL
  ssl: 'require',
  // Connection pooling for better performance
  connection: {
    application_name: 'jiravision'
  }
};

// Next re-evaluates this module on every HMR pass. Without the globalThis cache each
// pass built a fresh ten-slot pool and abandoned the previous one, leaving sockets
// whose stalled queries reject with nobody awaiting them — the unhandledRejection
// flood that follows every timeout in the dev log.
const globalForDb = globalThis as unknown as { jiravisionQueryClient?: postgres.Sql<{}> };

// Initialize a singleton Postgres client for Neon
export const queryClient =
  globalForDb.jiravisionQueryClient ?? postgres(connectionString, connectionOptions);

globalForDb.jiravisionQueryClient = queryClient;

// Query logging is off by default. Drizzle's built-in logger printed every statement with its
// bound parameters, and the auth writes bind a bcrypt hash and a session-token hash — so the dev
// log was leaking secret material on every sign-in. Opt in with DATABASE_LOG_SQL to see the
// statement text (parameters still withheld); DATABASE_LOG_PARAMS additionally, for a deliberate
// local debug session, prints the values too. Neither is on in production.
const logSql = process.env.DATABASE_LOG_SQL === "1";
const logParams = logSql && process.env.DATABASE_LOG_PARAMS === "1";

const dbLogger = logSql
  ? {
      logQuery(query: string, params: unknown[]) {
        if (logParams) console.log("[db]", query, params);
        else console.log("[db]", query, `(${params.length} params redacted)`);
      },
    }
  : false;

// Initialize and export a singleton Drizzle instance
export const db = drizzle(queryClient, {
  schema,
  logger: dbLogger,
});

// Create a separate connection for one-off operations that is immediately closed
export async function withDb<T>(callback: (db: PostgresJsDatabase<typeof schema>) => Promise<T>): Promise<T> {
  const singleClient = postgres(connectionString, connectionOptions);
  const singleDb = drizzle(singleClient, { schema });
  
  try {
    return await callback(singleDb);
  } catch (error) {
    console.error('Error in database operation:', error);
    throw error;
  } finally {
    await singleClient.end();
  }
}

// Helper functions for common database operations

// The compute frequently answers on the second attempt, once the wake that stalled
// the first one has finished — measured back-to-back connects of 6189ms then
// 3644ms, and 5078ms then 9037ms. Drizzle wraps the driver error, so the code is
// found by walking `cause` rather than read off the top-level object.
const CONNECTION_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'CONNECT_TIMEOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'EAI_AGAIN',
  '57P01',
  '57P02',
  '57P03',
]);

function isConnectionFailure(error: unknown): boolean {
  let current = error as { code?: unknown; cause?: unknown } | null;
  while (current) {
    if (current.code && CONNECTION_ERROR_CODES.has(String(current.code))) return true;
    current = current.cause as { code?: unknown; cause?: unknown } | null;
  }
  return false;
}

async function withConnectionRetry<T>(run: () => PromiseLike<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isConnectionFailure(error)) throw error;
    console.warn('Database unreachable, retrying once:', (error as Error).message);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return await run();
  }
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await withConnectionRetry(() => db.select().from(users).where(eq(users.id, id)));
    if (!result || result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified ?? false,
      jobTitle: user.jobTitle,
      department: user.department,
      location: user.location,
      bio: user.bio,
      skills: toSkills(user.skills),
      language: user.language,
      timezone: user.timezone,
      preferences: user.preferences as Record<string, unknown>,
      status: user.status,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt
    };
  } catch (error) {
    // Callers turn a null into 401, so a timeout here reads as "signed out".
    // Say which one happened instead of leaving both looking identical.
    if (isConnectionFailure(error)) {
      console.error(`Database unreachable while loading user ${id}; reporting no session:`, error);
    } else {
      console.error('Error getting user by ID:', error);
    }
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await withConnectionRetry(() => db.select().from(users).where(eq(users.email, email)));
    if (!result || result.length === 0) return null;
    
    const user = result[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified ?? false,
      jobTitle: user.jobTitle,
      department: user.department,
      location: user.location,
      bio: user.bio,
      skills: toSkills(user.skills),
      language: user.language,
      timezone: user.timezone,
      preferences: user.preferences as Record<string, unknown>,
      status: user.status,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt
    };
  } catch (error) {
    // A sign-in form has to be able to tell "no such account" from "we could not look". While
    // the compute wakes, a stall used to answer null, which the form read as a wrong password —
    // and people retried a correct one until the field locked them out conceptually.
    if (isConnectionFailure(error)) {
      console.error(`Database unreachable while loading user by email; not reporting a miss:`, error);
      throw new DatabaseUnreachableError();
    }
    console.error('Error getting user by email:', error);
    return null;
  }
}

/** Thrown by the auth reads when the database did not answer, so a stall is never a miss. */
export class DatabaseUnreachableError extends Error {
  constructor() {
    super('Database unreachable')
    this.name = 'DatabaseUnreachableError'
  }
}

// Helper for database transactions
export async function transaction<T>(
  callback: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  return await withDb(async (db) => {
    try {
      return await db.transaction(async (tx) => {
        return await callback(tx);
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  });
}

// Auth functions
export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  role?: string;
}): Promise<User> {
  try {
    const [newUser] = await db.insert(users)
      .values({
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        avatar: data.avatar,
        role: data.role ?? "user",
        emailVerified: false,
        language: "en-US",
        timezone: "Africa/Nairobi",
        preferences: {},
        status: "offline",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      passwordHash: newUser.passwordHash,
      role: newUser.role,
      avatar: newUser.avatar,
      emailVerified: newUser.emailVerified ?? false,
      jobTitle: newUser.jobTitle,
      department: newUser.department,
      location: newUser.location,
      bio: newUser.bio,
      skills: toSkills(newUser.skills),
      language: newUser.language,
      timezone: newUser.timezone,
      preferences: newUser.preferences as Record<string, unknown>,
      status: newUser.status,
      createdAt: newUser.createdAt ?? new Date(),
      updatedAt: newUser.updatedAt
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function createPasswordResetToken(
  userId: number,
  token: string,
  expiresAt: Date
) {
  try {
    const [result] = await db.insert(passwordResetTokens)
      .values({
        userId: userId,
        token: resetTokenHash(token),
        expiresAt: expiresAt,
        createdAt: new Date()
      })
      .returning();
    
    return result;
  } catch (error) {
    // The caller has just told the visitor to check their inbox. If the insert did not happen, no
    // link exists, so a stall has to surface as "not saved" rather than as a silent success.
    if (isConnectionFailure(error)) {
      console.error("Database unreachable while storing a reset token:", error);
      throw new DatabaseUnreachableError();
    }
    console.error("Error creating password reset token:", error);
    return null;
  }
}

export async function getPasswordResetToken(token: string) {
  try {
    const result = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, resetTokenHash(token))
    });
    
    return result;
  } catch (error) {
    // A cold database is not a bad link. Same rule as getUserByEmail: a stall is never a miss.
    if (isConnectionFailure(error)) {
      console.error("Database unreachable while reading a reset token:", error);
      throw new DatabaseUnreachableError();
    }
    console.error("Error getting password reset token:", error);
    return null;
  }
}

export async function deletePasswordResetToken(token: string) {
  try {
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, resetTokenHash(token)));
  } catch (error) {
    console.error("Error deleting password reset token:", error);
  }
}
