// Test the sprint API endpoints

const fetch = require('node-fetch');

async function testSprintAPI() {
  try {
    console.log('Testing sprint API endpoints...');
    
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
    
    // 1. Test getting all sprints
    console.log('\n1. Testing GET /api/sprints');
    const allSprintsUrl = 'http://localhost:3001/api/sprints';
    const allSprintsResponse = await fetch(allSprintsUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const allSprintsStatus = allSprintsResponse.status;
    console.log(`GET /api/sprints status code: ${allSprintsStatus}`);
    
    if (allSprintsResponse.ok) {
      const allSprintsData = await allSprintsResponse.json();
      console.log('Sprint list response:', JSON.stringify(allSprintsData, null, 2));
    } else {
      console.log('Response not OK. Body:', await allSprintsResponse.text());
    }
    
    // 2. Test getting a single sprint
    console.log('\n2. Testing GET /api/sprints/1');
    const singleSprintUrl = 'http://localhost:3001/api/sprints/1';
    const singleSprintResponse = await fetch(singleSprintUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const singleSprintStatus = singleSprintResponse.status;
    console.log(`GET /api/sprints/1 status code: ${singleSprintStatus}`);
    
    if (singleSprintResponse.ok) {
      const singleSprintData = await singleSprintResponse.json();
      console.log('Sprint details response:', JSON.stringify(singleSprintData, null, 2));
    } else {
      console.log('Response not OK. Body:', await singleSprintResponse.text());
    }
    
    // 3. Test getting sprint tasks
    console.log('\n3. Testing GET /api/sprints/1/tasks');
    const sprintTasksUrl = 'http://localhost:3001/api/sprints/1/tasks';
    const sprintTasksResponse = await fetch(sprintTasksUrl, {
      headers: {
        Cookie: cookies.join('; ')
      }
    });
    
    const sprintTasksStatus = sprintTasksResponse.status;
    console.log(`GET /api/sprints/1/tasks status code: ${sprintTasksStatus}`);
    
    if (sprintTasksResponse.ok) {
      const sprintTasksData = await sprintTasksResponse.json();
      console.log('Sprint tasks response:', JSON.stringify(sprintTasksData, null, 2));
    } else {
      console.log('Response not OK. Body:', await sprintTasksResponse.text());
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSprintAPI();
