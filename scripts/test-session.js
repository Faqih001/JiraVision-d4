// Test the session API endpoint

const fetch = require('node-fetch');

async function testSession() {
  try {
    console.log('Testing session endpoint...');
    
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
    
    // Now try to access the session API with these cookies
    const sessionUrl = 'http://localhost:3001/api/auth/session';
    const sessionResponse = await fetch(sessionUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const status = sessionResponse.status;
    console.log(`Session API Status code: ${status}`);
    
    const responseData = await sessionResponse.json();
    console.log('Session API Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSession();
