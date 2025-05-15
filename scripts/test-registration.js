// Test the registration API endpoint

const fetch = require('node-fetch');

async function testRegistration() {
  try {
    console.log('Testing registration API...');
    
    // Create random email to avoid duplicates
    const randomEmail = `test.user.${Math.floor(Math.random() * 10000)}@example.com`;
    
    // Prepare registration data
    const params = new URLSearchParams();
    params.append('name', 'Test New User');
    params.append('email', randomEmail);
    params.append('password', 'NewTest123!');
    
    // Make the registration request
    const registerUrl = 'http://localhost:3001/api/auth/register';
    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      body: params
    });
    
    const status = registerResponse.status;
    console.log(`Registration API Status code: ${status}`);
    
    // Get the response
    const responseText = await registerResponse.text();
    
    try {
      // Try to parse as JSON
      const responseData = JSON.parse(responseText);
      console.log('Registration API Response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      // If not JSON, show as text
      console.log('Registration API Response (not JSON):', responseText.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testRegistration();
