// This script tests the API endpoints to ensure they're functioning properly

const http = require('http');
const https = require('https');
const querystring = require('querystring');

// Configuration
const config = {
  baseUrl: 'http://localhost:3001',  // Match your Next.js server port
  endpoints: [
    { path: '/api/auth/session', method: 'GET', name: 'Get session' },
    { path: '/api/auth/status', method: 'GET', name: 'Auth status' },
    { 
      path: '/api/auth/login', 
      method: 'POST', 
      name: 'Login', 
      body: { email: 'admin@example.com', password: 'Test123!' },
      formData: true
    },
    { path: '/api/chat/list', method: 'GET', name: 'Chat list', requiresAuth: true },
    { path: '/api/dashboard/tasks', method: 'GET', name: 'Dashboard tasks', requiresAuth: true },
    { path: '/api/db-test', method: 'GET', name: 'Database test' }
  ],
  // Verbose logging
  verbose: true
};

// Store cookies between requests
let cookies = '';

// Helper function to make HTTP requests
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = config.baseUrl + endpoint.path;
    const method = endpoint.method || 'GET';
    
    console.log(`Testing ${endpoint.name}: ${method} ${url}`);
    
    const options = {
      method,
      headers: {}
    };
    
    // Add cookies if we have them
    if (cookies) {
      options.headers.Cookie = cookies;
    }
    
    // Prepare request body and content-type
    let requestBody;
    
    if (method === 'POST' && endpoint.body) {
      if (endpoint.formData) {
        // Create form data boundary
        const boundary = '--------------------------' + Math.random().toString(36).substr(2, 16);
        options.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        
        // Build the form data body
        let formBody = '';
        for (const [key, value] of Object.entries(endpoint.body)) {
          formBody += `--${boundary}\r\n`;
          formBody += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
          formBody += `${value}\r\n`;
        }
        formBody += `--${boundary}--\r\n`;
        requestBody = formBody;
      } else {
        // Regular JSON body
        options.headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify(endpoint.body);
      }
    }
    
    const req = http.request(url, options, (res) => {
      let data = '';
      
      // Store cookies from response
      if (res.headers['set-cookie']) {
        cookies = res.headers['set-cookie'].join('; ');
        if (config.verbose) {
          console.log('  Received cookies:', cookies);
        }
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Status: ${res.statusCode}`);
        
        try {
          // Try to parse JSON response
          const jsonResponse = JSON.parse(data);
          if (config.verbose) {
            console.log('  Response:', JSON.stringify(jsonResponse, null, 2));
          }
          resolve({
            status: res.statusCode,
            data: jsonResponse,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          if (config.verbose) {
            console.log('  Response is not JSON. First 200 chars:', data.substring(0, 200));
          }
          resolve({
            status: res.statusCode,
            data,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`  Error: ${error.message}`);
      reject(error);
    });
    
    // Send the request body for POST requests
    if (method === 'POST' && endpoint.body && requestBody) {
      req.write(requestBody);
    }
    
    req.end();
  });
}

// Run tests sequentially
async function runTests() {
  console.log('Starting API endpoint tests...');
  const results = [];
  
  for (const endpoint of config.endpoints) {
    try {
      const result = await makeRequest(endpoint);
      results.push({
        endpoint: endpoint.name,
        success: result.success,
        status: result.status
      });
      
      console.log(`  Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log('-----------------------------------');
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        success: false,
        status: 'Error',
        error: error.message
      });
      
      console.log(`  Result: FAILED`);
      console.log('-----------------------------------');
    }
  }
  
  // Print summary
  console.log('\nTest Summary:');
  console.log('-----------------------------------');
  for (const result of results) {
    console.log(`${result.endpoint}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.status})`);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log('-----------------------------------');
  console.log(`${successCount}/${results.length} endpoints working correctly`);
}

runTests().catch(console.error);
