import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/drizzle/schema"

const DEMO_TEAM = [
  {
    name: "Herbert Strayhorn",
    email: "herbert.strayhorn@example.com",
    role: "manager",
    jobTitle: "Project Lead",
    department: "Management",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    status: "busy",
    skills: ["Leadership", "Strategy", "Project Management"],
  },
  {
    name: "Jitu Chauhan",
    email: "jitu.chauhan@example.com",
    role: "user",
    jobTitle: "Frontend Developer",
    department: "Engineering",
    avatar: "https://randomuser.me/api/portraits/men/44.jpg",
    status: "online",
    skills: ["React", "TypeScript", "CSS", "UI Design"],
  },
  {
    name: "Denise Reece",
    email: "denise.reece@example.com",
    role: "user",
    jobTitle: "UX Designer",
    department: "Design",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    status: "online",
    skills: ["Figma", "User Research", "Wireframing", "Prototyping"],
  },
  {
    name: "Kevin White",
    email: "kevin.white@example.com",
    role: "user",
    jobTitle: "Backend Developer",
    department: "Engineering",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
    status: "online",
    skills: ["Node.js", "Express", "PostgreSQL", "API Design"],
  },
]

/**
 * Idempotent demo-account seed. Matched on the unique email column so a
 * re-run adds nothing instead of refreshing anything.
 *
 * This used to begin with `db.delete(users)` — an unconditional truncate of
 * the whole table — and it was reached from signup(), forgotPassword(),
 * verifyResetToken() and resetPassword() via initializeDatabase(), so a single
 * registration deleted every account in the database. Both halves are gone:
 * seeding is now insert-if-absent, and auth no longer bootstraps the schema
 * (that is what GET /api/setup and the drizzle scripts are for).
 */
export async function seedTeamMembers(): Promise<void> {
  const hashedPassword = await bcrypt.hash("password123", 10)

  for (const member of DEMO_TEAM) {
    await db
      .insert(users)
      .values({ ...member, passwordHash: hashedPassword, emailVerified: true })
      .onConflictDoNothing({ target: users.email })
  }

  console.log("Team members seeded successfully")
}
