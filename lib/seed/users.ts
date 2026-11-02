// lib/seed/users.ts
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { type SeedResult } from "./types";

const NEW_TEAM_MEMBERS = [
  {
    name: "Amina Hassan",
    email: "amina.hassan@example.com",
    role: "user",
    jobTitle: "Finance Analyst",
    department: "Finance",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    status: "online",
    skills: ["QuickBooks", "Excel", "Financial Reporting"],
  },
  {
    name: "Brian Ochieng",
    email: "brian.ochieng@example.com",
    role: "user",
    jobTitle: "Operations Coordinator",
    department: "Operations",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    status: "online",
    skills: ["Server Management", "Backup Operations"],
  },
  {
    name: "Catherine Wanjiku",
    email: "catherine.wanjiku@example.com",
    role: "user",
    jobTitle: "HR Specialist",
    department: "HR",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    status: "online",
    skills: ["Onboarding", "Employee Relations"],
  },
  {
    name: "David Kimani",
    email: "david.kimani@example.com",
    role: "user",
    jobTitle: "Sales Representative",
    department: "Sales",
    avatar: "https://randomuser.me/api/portraits/men/66.jpg",
    status: "offline",
    skills: ["CRM", "Remote Work Tools"],
  },
  {
    name: "Esther Njeri",
    email: "esther.njeri@example.com",
    role: "manager",
    jobTitle: "Operations Manager",
    department: "Management",
    avatar: "https://randomuser.me/api/portraits/women/22.jpg",
    status: "busy",
    skills: ["Leadership", "Strategy", "Budget Management"],
  },
  {
    name: "Francis Mwangi",
    email: "francis.mwangi@example.com",
    role: "user",
    jobTitle: "Software Developer",
    department: "Engineering",
    avatar: "https://randomuser.me/api/portraits/men/77.jpg",
    status: "online",
    skills: ["React", "Node.js", "TypeScript"],
  },
  {
    name: "Grace Akinyi",
    email: "grace.akinyi@example.com",
    role: "user",
    jobTitle: "Marketing Designer",
    department: "Marketing",
    avatar: "https://randomuser.me/api/portraits/women/88.jpg",
    status: "online",
    skills: ["Adobe Creative Suite", "UI Design"],
  },
  {
    name: "Henry Kipchoge",
    email: "henry.kipchoge@example.com",
    role: "user",
    jobTitle: "Factory Operations",
    department: "Operations",
    avatar: "https://randomuser.me/api/portraits/men/99.jpg",
    status: "online",
    skills: ["Equipment Operation", "Safety Protocols"],
  },
  {
    name: "Irene Chebet",
    email: "irene.chebet@example.com",
    role: "user",
    jobTitle: "Finance Officer",
    department: "Finance",
    avatar: "https://randomuser.me/api/portraits/women/11.jpg",
    status: "online",
    skills: ["Accounting", "License Management"],
  },
  {
    name: "James Otieno",
    email: "james.otieno@example.com",
    role: "user",
    jobTitle: "IT Support Specialist",
    department: "IT Support",
    avatar: "https://randomuser.me/api/portraits/men/12.jpg",
    status: "online",
    skills: ["Technical Support", "Troubleshooting", "Network Administration"],
  },
];

export async function seedUsers(): Promise<SeedResult> {
  try {
    // Check if users already exist by looking for one of the new departments
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.department, "Finance"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Users already seeded, skipping");
      return { module: "users", status: "skipped", count: 0 };
    }

    console.log("Seeding users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    for (const member of NEW_TEAM_MEMBERS) {
      await db
        .insert(users)
        .values({
          ...member,
          passwordHash: hashedPassword,
          emailVerified: true,
        })
        .onConflictDoNothing({ target: users.email });
    }

    console.log(`Seeded ${NEW_TEAM_MEMBERS.length} users`);
    return { module: "users", status: "seeded", count: NEW_TEAM_MEMBERS.length };
  } catch (error) {
    console.error("Failed to seed users:", error);
    return {
      module: "users",
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
