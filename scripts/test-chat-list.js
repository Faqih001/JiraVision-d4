// Test the chat list API endpoint

const fetch = require('node-fetch');

async function testChatList() {
  try {
    console.log('Testing chat list API...');
    
    // First login to establish a session
    const loginUrl = 'http://localhost:3001/api/auth/login';
    const params = new URLSearchParams();
    params.append('email', 'admin@example.com');
    params.append('password', 'Test123!');
    
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      body: params
    });
    
    // Get cookies from the response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    console.log('Session cookies received:', cookies);
    
    // Now try to access the chat API with these cookies
    const chatUrl = 'http://localhost:3001/api/chat';
    const chatResponse = await fetch(chatUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const status = chatResponse.status;
    console.log(`Chat API Status code: ${status}`);
    
    if (!chatResponse.ok) {
      console.log('Response not OK. Body:', await chatResponse.text());
      return;
    }
    
    const responseData = await chatResponse.json();
    console.log('Chat API Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testChatList();
