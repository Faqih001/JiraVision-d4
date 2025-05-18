'use client';

import { useEffect } from 'react';

export default function CorsHandler() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Original fetch for reference
      const originalFetch = window.fetch;
      
      // Override fetch to handle CORS issues
      window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = input instanceof Request ? input.url : String(input);
        
        try {
          // List of domains to block direct access
          const blockedDomains = ['extensions.aitopia.ai'];
          
          // Check if the request URL contains any of the blocked domains
          if (blockedDomains.some(domain => url.includes(domain))) {
            console.log(`[Development] Intercepting request to: ${url}`);
            
            // Rewrite the URL to use our proxy instead
            const originalUrl = new URL(url);
            const proxyPath = `/api/aitopia/${originalUrl.pathname.replace(/^\//, '')}${originalUrl.search}`;
            console.log(`[Development] Redirecting to proxy: ${proxyPath}`);
            
            // Use the original fetch but with our proxy URL
            return originalFetch(proxyPath, init);
          }
          
          // Specially handle calendar events API
          if (url.includes('/api/calendar/events')) {
            const modifiedInit = { ...(init || {}) } as RequestInit;
            if (!modifiedInit.headers) {
              modifiedInit.headers = {};
            }
            
            // Add headers to help with CORS
            modifiedInit.headers = {
              ...(modifiedInit.headers as Record<string, string>),
              'Accept': 'application/json'
            };
            
            return originalFetch(input, modifiedInit);
          }
          
          // Proceed with the original fetch for other requests
          return originalFetch(input, init);
        } catch (error) {
          console.error(`[Development] Fetch error for ${url}:`, error);
          // Return a meaningful error response instead of failing silently
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Network error',
            message: (error as Error).message || 'Unknown error occurred'
          }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
      };
      
      console.log('[Development] Enhanced CORS request handler enabled');
    }
  }, []);
  
  // This component doesn't render anything
  return null;
}
