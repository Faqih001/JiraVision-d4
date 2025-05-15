// Test the dashboard tasks API endpoint

const fetch = require('node-fetch');

async function testDashboardTasks() {
  try {
    console.log('Testing dashboard tasks API...');
    
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
    
    // Now try to access the dashboard tasks API with these cookies
    const tasksUrl = 'http://localhost:3001/api/dashboard/tasks';
    const tasksResponse = await fetch(tasksUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const status = tasksResponse.status;
    console.log(`Dashboard Tasks API Status code: ${status}`);
    
    if (!tasksResponse.ok) {
      console.log('Response not OK. Body:', await tasksResponse.text());
      return;
    }
    
    const responseData = await tasksResponse.json();
    console.log('Dashboard Tasks API Response:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDashboardTasks();
