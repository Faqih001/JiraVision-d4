// Script to test the task API endpoints
const fetch = require('node-fetch');

// No need for authentication with test endpoints
async function getCookies() {
  console.log('Using test endpoints that do not require authentication');
  return [];
}

// Main test function
async function testTaskAPI() {
  console.log('Testing task API endpoints using test routes...');

  // No authentication needed for test endpoints
  const cookies = [];

  // Create a test task
  console.log('\n1. Testing POST /api/test/tasks (Create a task)');
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const createResponse = await fetch('http://localhost:3001/api/test/tasks', {
    method: 'POST',
    headers,
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
  console.log(`\n2. Testing GET /api/test/tasks/${createdTaskId}`);
  
  const getHeaders = {};
  
  const getResponse = await fetch(`http://localhost:3001/api/test/tasks/${createdTaskId}`, {
    method: 'GET',
    headers: getHeaders
  });
  
  const getData = await getResponse.json();
  console.log(`GET /api/tasks/${createdTaskId} status code: ${getResponse.status}`);
  console.log('Get task response:', JSON.stringify(getData, null, 2));
  
  // Update the task
  console.log(`\n3. Testing PUT /api/test/tasks/${createdTaskId}`);
  
  const updateHeaders = {
    'Content-Type': 'application/json'
  };
  
  const updateResponse = await fetch(`http://localhost:3001/api/test/tasks/${createdTaskId}`, {
    method: 'PUT',
    headers: updateHeaders,
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
  console.log('\n4. Testing GET /api/test/tasks with pagination');
  
  const listHeaders = {};
  
  const listResponse = await fetch('http://localhost:3001/api/test/tasks?page=1&pageSize=5', {
    method: 'GET',
    headers: listHeaders
  });
  
  const listData = await listResponse.json();
  console.log(`GET /api/tasks status code: ${listResponse.status}`);
  console.log('Task list response:', JSON.stringify(listData, null, 2));
  
  // Test bulk update
  console.log('\n5. Testing POST /api/test/tasks/bulk (update action)');
  
  const bulkHeaders = {
    'Content-Type': 'application/json'
  };
  
  const bulkUpdateResponse = await fetch('http://localhost:3001/api/test/tasks/bulk', {
    method: 'POST',
    headers: bulkHeaders,
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
  console.log(`\n6. Testing DELETE /api/test/tasks/${createdTaskId}`);
  
  const deleteHeaders = {};
  
  const deleteResponse = await fetch(`http://localhost:3001/api/test/tasks/${createdTaskId}`, {
    method: 'DELETE',
    headers: deleteHeaders
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
