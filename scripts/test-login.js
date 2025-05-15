// Test the login API endpoint with URLSearchParams instead of FormData

const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const url = 'http://localhost:3001/api/auth/login';
    const params = new URLSearchParams();
    params.append('email', 'admin@example.com');
    params.append('password', 'Test123!');
    
    const response = await fetch(url, {
      method: 'POST',
      body: params
    });
    
    const status = response.status;
    console.log(`Status code: ${status}`);
    
    const responseData = await response.json();
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
