const fetch = require('node-fetch');
require('dotenv').config();

// Since we can't access browser cookies from Node.js directly, let's try the browser approach
// This will actually just help debug the issue
console.log("In browser debugging steps:");
console.log("1. Open your browser's console");
console.log("2. Run this fetch command to test API:");
console.log(`
fetch('/api/chat', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Cache-Control': 'no-cache'
  }
})
.then(response => {
  console.log('Status:', response.status);
  return response.json().catch(e => response.text());
})
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
`);

console.log("\nLet's also try a different approach with the API:");
console.log("Try this in browser console to debug current user issues:");
console.log(`
fetch('/api/user/current', {
  credentials: 'include',
  headers: {
    'Cache-Control': 'no-cache'
  }
})
.then(r => r.json())
.then(data => console.log('Current user:', data))
.catch(e => console.error('Error:', e));
`);

// Let's also test the API directly using HTTP
async function testChatAPI() {
  try {
    console.log('\nChecking if server is responding to basic requests...');
    const response = await fetch('http://localhost:3000/api/auth/session');
    console.log('Auth session status:', response.status);
    const data = await response.text();
    console.log('Response:', data.slice(0, 100) + (data.length > 100 ? '...' : ''));
  } catch (error) {
    console.error('Error checking server:', error);
  }
}

testChatAPI(); 