// Add sample chat data script

const postgres = require('postgres');
require('dotenv').config();

async function addSampleData() {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('Adding sample chat data...');
  
  // Create connection
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Get existing users
    const users = await client`SELECT id, name, email FROM users`;
    
    if (users.length === 0) {
      console.log('No users found. Please create some users first.');
      return;
    }
    
    console.log(`Found ${users.length} users`);
    
    // Create sample chats
    console.log('Creating sample chats...');
    
    // Individual chat
    const [individualChat] = await client`
      INSERT INTO chats (
        type, name, avatar, created_at, updated_at
      ) VALUES (
        'individual', 
        'Direct Message', 
        'https://api.dicebear.com/7.x/avataaars/svg?seed=individual',
        now(),
        now()
      ) RETURNING id, type, name
    `;
    
    console.log(`Created individual chat: ${individualChat.name} (${individualChat.id})`);
    
    // Group chat
    const [groupChat] = await client`
      INSERT INTO chats (
        type, name, avatar, created_at, updated_at
      ) VALUES (
        'group', 
        'Team Chat', 
        'https://api.dicebear.com/7.x/avataaars/svg?seed=group',
        now(),
        now()
      ) RETURNING id, type, name
    `;
    
    console.log(`Created group chat: ${groupChat.name} (${groupChat.id})`);
    
    // Add participants
    console.log('Adding participants...');
    for (const user of users) {
      // Add to individual chat
      await client`
        INSERT INTO chat_participants (
          chat_id, user_id, joined_at, is_admin
        ) VALUES (
          ${individualChat.id}, ${user.id}, now(), ${user.id === 1}
        )
      `;
      
      // Add to group chat
      await client`
        INSERT INTO chat_participants (
          chat_id, user_id, joined_at, is_admin
        ) VALUES (
          ${groupChat.id}, ${user.id}, now(), ${user.id === 1}
        )
      `;
    }
    
    console.log(`Added ${users.length} participants to each chat`);
    
    // Add messages
    console.log('Adding sample messages...');
    
    // Messages for individual chat
    const [message1] = await client`
      INSERT INTO messages (
        chat_id, sender_id, content, type, timestamp
      ) VALUES (
        ${individualChat.id}, 
        ${users[0].id}, 
        'Hello! This is a direct message.', 
        'text',
        now() - INTERVAL '1 hour'
      ) RETURNING id
    `;
    
    const [message2] = await client`
      INSERT INTO messages (
        chat_id, sender_id, content, type, timestamp
      ) VALUES (
        ${individualChat.id}, 
        ${users.length > 1 ? users[1].id : users[0].id}, 
        'Hi there! Nice to chat with you.', 
        'text',
        now() - INTERVAL '30 minutes'
      ) RETURNING id
    `;
    
    // Messages for group chat
    const [message3] = await client`
      INSERT INTO messages (
        chat_id, sender_id, content, type, timestamp
      ) VALUES (
        ${groupChat.id}, 
        ${users[0].id}, 
        'Welcome to the group chat everyone!', 
        'text',
        now() - INTERVAL '2 hours'
      ) RETURNING id
    `;
    
    const [message4] = await client`
      INSERT INTO messages (
        chat_id, sender_id, content, type, timestamp
      ) VALUES (
        ${groupChat.id}, 
        ${users.length > 1 ? users[1].id : users[0].id}, 
        'Thanks for creating this group!', 
        'text',
        now() - INTERVAL '1 hour 45 minutes'
      ) RETURNING id
    `;
    
    console.log(`Added sample messages to chats`);
    
    // Add a reaction
    await client`
      INSERT INTO reactions (
        message_id, user_id, emoji
      ) VALUES (
        ${message3.id},
        ${users[0].id},
        '👍'
      )
    `;
    
    console.log('Added sample reaction');
    
    // Count data in tables
    const chatCount = await client`SELECT COUNT(*) FROM chats`;
    const messageCount = await client`SELECT COUNT(*) FROM messages`;
    const participantCount = await client`SELECT COUNT(*) FROM chat_participants`;
    const reactionCount = await client`SELECT COUNT(*) FROM reactions`;
    
    console.log('\nDatabase now contains:');
    console.log(`- ${chatCount[0].count} chats`);
    console.log(`- ${messageCount[0].count} messages`);
    console.log(`- ${participantCount[0].count} chat participants`);
    console.log(`- ${reactionCount[0].count} reactions`);
    
  } catch (error) {
    console.error('Error adding sample data:', error);
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
  }
}

// Run the function
addSampleData(); 