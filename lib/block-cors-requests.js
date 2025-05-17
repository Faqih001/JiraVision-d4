/**
 * This script blocks unnecessary external requests that cause CORS errors in development mode.
 * Add this to your _app.tsx or other global script location.
 */

// Function to block requests to specific domains
function blockUnnecessaryRequests() {
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EXTENSIONS === 'true') {
    // Save the original fetch
    const originalFetch = window.fetch;
    
    // Override fetch to intercept requests
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      
      // List of domains to block
      const blockedDomains = [
        'extensions.aitopia.ai',
        // Add other problematic domains as needed
      ];
      
      // Check if the request URL contains any of the blocked domains
      if (blockedDomains.some(domain => url.includes(domain))) {
        console.log(`[Development] Blocked request to: ${url}`);
        
        // Return an empty successful response to prevent errors
        return new Response(JSON.stringify({ blocked: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      // Otherwise, proceed with the original fetch
      return originalFetch(input, init);
    };
    
    console.log('[Development] Enabled blocking of unnecessary external requests');
  }
}

// Run the function in the browser environment
if (typeof window !== 'undefined') {
  blockUnnecessaryRequests();
}

export { blockUnnecessaryRequests };
