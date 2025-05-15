const { randomUUID } = require('crypto');
const postgres = require('postgres');
require('dotenv').config();

// Get database connection
const getDbClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  return postgres(connectionString, { max: 1 });
};

async function seedChats() {
  console.log('Starting chat data seeding process...');
  
  const client = getDbClient();
  
  try {
    // First, check if we have users
    const users = await client`SELECT id, name, avatar FROM users`;
    
    if (users.length < 2) {
      console.error('Need at least 2 users to seed chat data. Please seed users first.');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users.`);
    
    // Check if we already have chats
    const existingChats = await client`SELECT COUNT(*) as count FROM chats`;
    
    if (existingChats[0].count > 0) {
      console.log(`Found ${existingChats[0].count} existing chats. Skipping seed to avoid duplicates.`);
      console.log('To force reseeding, first delete existing chat data.');
      process.exit(0);
    }
    
    // Create chat data for the first user
    const mainUser = users[0];
    
    for (let i = 1; i < Math.min(users.length, 6); i++) {
      const otherUser = users[i];
      
      // Create a chat between the main user and this user
      const chatId = randomUUID();
      const chatName = `${otherUser.name}`;
      
      console.log(`Creating individual chat between ${mainUser.name} and ${otherUser.name}`);
      
      // Insert chat
      await client`
        INSERT INTO chats (
          id, type, name, avatar, is_pinned, is_muted, is_archived, created_at, updated_at
        ) VALUES (
          ${chatId}, 'individual', ${chatName}, ${otherUser.avatar}, false, false, false, now(), now()
        )
      `;
      
      // Add participants
      await client`
        INSERT INTO chat_participants (
          chat_id, user_id, joined_at
        ) VALUES (
          ${chatId}, ${mainUser.id}, now()
        )
      `;
      
      await client`
        INSERT INTO chat_participants (
          chat_id, user_id, joined_at
        ) VALUES (
          ${chatId}, ${otherUser.id}, now()
        )
      `;
      
      // Add some messages
      const messageCount = Math.floor(Math.random() * 10) + 2; // 2-11 messages
      
      for (let j = 0; j < messageCount; j++) {
        const senderId = Math.random() > 0.5 ? mainUser.id : otherUser.id;
        const messageContent = getRandomMessage(j === 0);
        
        await client`
          INSERT INTO messages (
            id, content, type, timestamp, is_read, deleted, chat_id, sender_id
          ) VALUES (
            ${randomUUID()}, ${messageContent}, 'text', 
            now() - INTERVAL '${messageCount - j} hours', 
            true, false, ${chatId}, ${senderId}
          )
        `;
      }
    }
    
    // Create a group chat with a few users
    if (users.length >= 3) {
      const groupChatId = randomUUID();
      const groupMembers = users.slice(0, Math.min(users.length, 5));
      const groupName = "Team JiraVision";
      
      console.log(`Creating group chat "${groupName}" with ${groupMembers.length} members`);
      
      // Insert group chat
      await client`
        INSERT INTO chats (
          id, type, name, is_pinned, is_muted, is_archived, created_at, updated_at
        ) VALUES (
          ${groupChatId}, 'group', ${groupName}, false, false, false, now(), now()
        )
      `;
      
      // Add participants
      for (const member of groupMembers) {
        await client`
          INSERT INTO chat_participants (
            chat_id, user_id, joined_at
          ) VALUES (
            ${groupChatId}, ${member.id}, now()
          )
        `;
      }
      
      // Add group messages
      const groupMessageCount = Math.floor(Math.random() * 15) + 5; // 5-19 messages
      
      for (let j = 0; j < groupMessageCount; j++) {
        const sender = groupMembers[Math.floor(Math.random() * groupMembers.length)];
        const messageContent = getRandomMessage(j === 0);
        
        await client`
          INSERT INTO messages (
            id, content, type, timestamp, is_read, deleted, chat_id, sender_id
          ) VALUES (
            ${randomUUID()}, ${messageContent}, 'text', 
            now() - INTERVAL '${groupMessageCount - j} hours', 
            true, false, ${groupChatId}, ${sender.id}
          )
        `;
      }
    }
    
    console.log('Chat seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding chat data:', error);
  } finally {
    await client.end();
  }
}

function getRandomMessage(isFirst = false) {
  if (isFirst) {
    return "Hey there! How's it going?";
  }
  
  const messages = [
    "Have you seen the new Sprint plan?",
    "When's the next meeting?",
    "I just pushed my changes to the repo.",
    "Could you review my PR when you get a chance?",
    "The new UI looks great!",
    "Let's discuss this at the stand-up tomorrow.",
    "I think we need to refactor that component.",
    "Did you see that bug report from QA?",
    "I'll be working from home today.",
    "The client loved our presentation!",
    "Should we schedule a call to discuss this?",
    "I updated the documentation.",
    "What do you think about the new design?",
    "Let me know when you're free to chat about this.",
    "I just resolved that issue you mentioned.",
    "Great work on that feature!",
    "I'm stuck on this problem, could use your help.",
    "Thanks for your help with that!",
    "Let's wrap this up before the deadline.",
    "Do you have time to go over the requirements?"
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

// Run the seeding function
seedChats().catch(console.error); 