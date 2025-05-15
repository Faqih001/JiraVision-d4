// Script to test the task API endpoints
const fetch = require('node-fetch');

// Helper function to get cookies
async function getCookies() {
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'email': 'admin@example.com',
        'password': 'password123'
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    // Extract cookies from response headers
    const cookies = response.headers.raw()['set-cookie'];
    console.log('Session cookies received:', cookies);
    return cookies;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
}

// Main test function
async function testTaskAPI() {
  console.log('Testing task API endpoints...');

  // Get session cookies
  const cookies = await getCookies();

  // Create a test task
  console.log('\n1. Testing POST /api/tasks (Create a task)');
  const createResponse = await fetch('http://localhost:3001/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      title: 'Test task from API',
      description: 'This is a test task created via the API',
      status: 'todo',
      priority: 'high',
      storyPoints: 3,
      dueDate: '2025-06-01',
      tags: ['testing', 'api']
    })
  });
  
  const createData = await createResponse.json();
  console.log(`POST /api/tasks status code: ${createResponse.status}`);
  console.log('Create task response:', JSON.stringify(createData, null, 2));
  
  if (!createData.success || !createData.data) {
    throw new Error('Failed to create test task');
  }
  
  const createdTaskId = createData.data.id;
  
  // Get the created task by ID
  console.log(`\n2. Testing GET /api/tasks/${createdTaskId}`);
  const getResponse = await fetch(`http://localhost:3001/api/tasks/${createdTaskId}`, {
    method: 'GET',
    headers: {
      'Cookie': cookies
    }
  });
  
  const getData = await getResponse.json();
  console.log(`GET /api/tasks/${createdTaskId} status code: ${getResponse.status}`);
  console.log('Get task response:', JSON.stringify(getData, null, 2));
  
  // Update the task
  console.log(`\n3. Testing PUT /api/tasks/${createdTaskId}`);
  const updateResponse = await fetch(`http://localhost:3001/api/tasks/${createdTaskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      description: 'This task has been updated via the API',
      status: 'in_progress',
      priority: 'medium'
    })
  });
  
  const updateData = await updateResponse.json();
  console.log(`PUT /api/tasks/${createdTaskId} status code: ${updateResponse.status}`);
  console.log('Update task response:', JSON.stringify(updateData, null, 2));
  
  // Get tasks with pagination
  console.log('\n4. Testing GET /api/tasks with pagination');
  const listResponse = await fetch('http://localhost:3001/api/tasks?page=1&pageSize=5', {
    method: 'GET',
    headers: {
      'Cookie': cookies
    }
  });
  
  const listData = await listResponse.json();
  console.log(`GET /api/tasks status code: ${listResponse.status}`);
  console.log('Task list response:', JSON.stringify(listData, null, 2));
  
  // Test bulk update
  console.log('\n5. Testing POST /api/tasks/bulk (update action)');
  const bulkUpdateResponse = await fetch('http://localhost:3001/api/tasks/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      action: 'update',
      taskIds: [createdTaskId],
      updateData: {
        status: 'completed',
        priority: 'low'
      }
    })
  });
  
  const bulkUpdateData = await bulkUpdateResponse.json();
  console.log(`POST /api/tasks/bulk status code: ${bulkUpdateResponse.status}`);
  console.log('Bulk update response:', JSON.stringify(bulkUpdateData, null, 2));
  
  // Delete the task
  console.log(`\n6. Testing DELETE /api/tasks/${createdTaskId}`);
  const deleteResponse = await fetch(`http://localhost:3001/api/tasks/${createdTaskId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': cookies
    }
  });
  
  const deleteData = await deleteResponse.json();
  console.log(`DELETE /api/tasks/${createdTaskId} status code: ${deleteResponse.status}`);
  console.log('Delete task response:', JSON.stringify(deleteData, null, 2));
  
  console.log('\nTask API tests completed.');
}

// Run the tests
testTaskAPI().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
