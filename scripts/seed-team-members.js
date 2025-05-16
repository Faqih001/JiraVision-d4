// This script seeds team members into the users table
const { Client } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function seedTeamMembers() {
  console.log("Connecting to database to seed team members...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("✅ Database connection successful!");
    
    // Use a transaction for safety
    await client.query('BEGIN');
    
    // First check if the skills column exists, if not add it
    const checkSkillsColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'skills';
    `);
    
    if (checkSkillsColumn.rows.length === 0) {
      console.log("⚠️ Skills column does not exist in users table. Adding it now...");
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
      `);
      console.log("✅ Skills column added successfully!");
    }

    // Generate a consistent password hash for all team members
    const defaultPassword = bcrypt.hashSync('password123', 10);

    // Team members data
    const teamMembers = [
      {
        name: "You (Current User)",
        role: "user",
        jobTitle: "Product Manager",
        email: "you@example.com",
        department: "Product",
        status: "active",
        skills: ["Product Management", "UX", "Strategy"],
        avatar: "https://randomuser.me/api/portraits/men/32.jpg"
      },
      {
        name: "Herbert Strayhorn",
        role: "user",
        jobTitle: "Project Lead",
        email: "herbert.strayhorn@example.com",
        department: "Management",
        status: "busy",
        skills: ["Leadership", "Strategy", "Project Management"],
        avatar: "https://randomuser.me/api/portraits/men/32.jpg"
      },
      {
        name: "Jitu Chauhan",
        role: "user",
        jobTitle: "Frontend Developer",
        email: "jitu.chauhan@example.com",
        department: "Engineering",
        status: "online",
        skills: ["React", "TypeScript", "CSS", "UI Design"],
        avatar: "https://randomuser.me/api/portraits/men/44.jpg"
      },
      {
        name: "Denise Reece",
        role: "user",
        jobTitle: "UX Designer",
        email: "denise.reece@example.com",
        department: "Design",
        status: "active",
        skills: ["Figma", "User Research", "Wireframing", "Prototyping"],
        avatar: "https://randomuser.me/api/portraits/women/65.jpg"
      },
      {
        name: "Kevin White",
        role: "user",
        jobTitle: "Backend Developer",
        email: "kevin.white@example.com",
        department: "Engineering",
        status: "active",
        skills: ["Node.js", "Express", "PostgreSQL", "API Design"],
        avatar: "https://randomuser.me/api/portraits/men/22.jpg"
      },
      {
        name: "Mary Newton",
        role: "user",
        jobTitle: "Project Manager",
        email: "mary.newton@example.com",
        department: "Product",
        status: "active",
        skills: ["Agile", "JIRA", "Roadmapping", "Stakeholder Management"],
        avatar: "https://randomuser.me/api/portraits/women/45.jpg"
      },
      {
        name: "Richard Sousa",
        role: "user",
        jobTitle: "QA Engineer",
        email: "richard.sousa@example.com",
        department: "Engineering",
        status: "away",
        skills: ["Test Automation", "Selenium", "Cypress", "Manual Testing"],
        avatar: "https://randomuser.me/api/portraits/men/46.jpg"
      },
      {
        name: "Melissa Westbrook",
        role: "user",
        jobTitle: "UI Designer",
        email: "melissa.westbrook@example.com",
        department: "Design",
        status: "active",
        skills: ["UI Design", "Wireframing", "Prototyping"],
        avatar: "https://randomuser.me/api/portraits/women/28.jpg"
      },
      {
        name: "Christy Obrien",
        role: "user",
        jobTitle: "UX Researcher",
        email: "christy.obrien@example.com",
        department: "Design",
        status: "active",
        skills: ["User Research", "User Testing", "Wireframing"],
        avatar: "https://randomuser.me/api/portraits/women/36.jpg"
      },
      {
        name: "Joe Lindahl",
        role: "user",
        jobTitle: "DevOps Engineer",
        email: "joe.lindahl@example.com",
        department: "Engineering",
        status: "active",
        skills: ["Docker", "Kubernetes", "AWS", "CI/CD"],
        avatar: "https://randomuser.me/api/portraits/men/53.jpg"
      }
    ];

    // Process each team member
    for (const member of teamMembers) {
      // Check if user already exists
      const userCheck = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [member.email]
      );

      if (userCheck.rows.length === 0) {
        // Insert new user
        await client.query(
          `INSERT INTO users (
            name, 
            email, 
            password_hash, 
            role, 
            job_title, 
            department, 
            status, 
            skills, 
            avatar,
            email_verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            member.name,
            member.email,
            defaultPassword,
            member.role,
            member.jobTitle,
            member.department,
            member.status,
            JSON.stringify(member.skills), // Store skills as JSONB in PostgreSQL
            member.avatar,
            true // Set email_verified to true for all team members
          ]
        );
        console.log(`✅ Added team member: ${member.name}`);
      } else {
        // Update existing user with team member data
        await client.query(
          `UPDATE users SET 
            job_title = $1, 
            department = $2, 
            status = $3, 
            skills = $4, 
            avatar = $5
          WHERE email = $6`,
          [
            member.jobTitle,
            member.department,
            member.status,
            JSON.stringify(member.skills),
            member.avatar,
            member.email
          ]
        );
        console.log(`✅ Updated team member: ${member.name}`);
      }
    }

    console.log("✅ Team members seeding completed successfully!");
    
    // Commit the transaction
    await client.query('COMMIT');

  } catch (err) {
    // Rollback transaction in case of error
    await client.query('ROLLBACK');
    console.error("❌ Error seeding team members:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

seedTeamMembers().catch(err => {
  console.error("Script error:", err);
});
