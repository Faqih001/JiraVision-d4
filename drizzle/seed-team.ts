const { db } = require("../lib/db");
const { users } = require("./schema");
const bcrypt = require("bcryptjs");

async function seedTeamMembers() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10)

    // Insert team members
    const teamMembers = [
      {
        name: "Herbert Strayhorn",
        email: "herbert.strayhorn@example.com",
        passwordHash: hashedPassword,
        role: "manager",
        jobTitle: "Project Lead",
        department: "Management",
        avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        emailVerified: true,
        status: "busy",
        skills: ["Leadership", "Strategy", "Project Management"]
      },
      {
        name: "Jitu Chauhan",
        email: "jitu.chauhan@example.com",
        passwordHash: hashedPassword,
        role: "user",
        jobTitle: "Frontend Developer",
        department: "Engineering",
        avatar: "https://randomuser.me/api/portraits/men/44.jpg",
        emailVerified: true,
        status: "online",
        skills: ["React", "TypeScript", "CSS", "UI Design"]
      },
      {
        name: "Denise Reece",
        email: "denise.reece@example.com",
        passwordHash: hashedPassword,
        role: "user",
        jobTitle: "UX Designer",
        department: "Design",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg",
        emailVerified: true,
        status: "online",
        skills: ["Figma", "User Research", "Wireframing", "Prototyping"]
      },
      {
        name: "Kevin White",
        email: "kevin.white@example.com",
        passwordHash: hashedPassword,
        role: "user",
        jobTitle: "Backend Developer",
        department: "Engineering",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg",
        emailVerified: true,
        status: "online",
        skills: ["Node.js", "Express", "PostgreSQL", "API Design"]
      }
    ];

    // Clear existing team members
    await db.delete(users);

    // Insert team members
    for (const member of teamMembers) {
      await db.insert(users).values(member);
    }

    console.log('Team members seeded successfully');
  } catch (error) {
    console.error('Error seeding team members:', error);
    throw error;
  }
}

module.exports = {
  seedTeamMembers
};
