// This script repairs any invalid skills JSON data in the database
const { Client } = require('pg');
require('dotenv').config();

async function repairSkillsData() {
  console.log("Connecting to database to repair skills data...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("✅ Database connection successful!");
    
    // Use a transaction for safety
    await client.query('BEGIN');
    
    // First check if the skills column exists
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

    // Update any NULL skills to empty array
    const updateNullSkills = await client.query(`
      UPDATE users
      SET skills = '[]'::jsonb
      WHERE skills IS NULL;
    `);
    console.log(`Updated ${updateNullSkills.rowCount} rows with NULL skills to empty arrays.`);

    // Fix any malformed JSON
    const validateSkills = await client.query(`
      SELECT id, skills, 
      (jsonb_typeof(skills) = 'array') as is_valid_array
      FROM users;
    `);

    let fixedCount = 0;
    for (const row of validateSkills.rows) {
      if (!row.is_valid_array) {
        console.log(`User ID ${row.id} has invalid skills format: ${row.skills}`);
        // Fix by setting to empty array
        await client.query(`
          UPDATE users 
          SET skills = '[]'::jsonb 
          WHERE id = $1;
        `, [row.id]);
        fixedCount++;
      }
    }
    console.log(`Fixed ${fixedCount} rows with invalid skills JSON.`);

    // Commit the transaction
    await client.query('COMMIT');
    console.log("✅ Skills data repair completed successfully!");

  } catch (error) {
    // Rollback the transaction if an error occurs
    await client.query('ROLLBACK');
    console.error("❌ Error repairing skills data:", error);
  } finally {
    // Close the client connection
    await client.end();
    console.log("Database connection closed.");
  }
}

// Run the function
repairSkillsData();
