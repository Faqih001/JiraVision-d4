'use client';

import { useEffect } from 'react';

export default function CorsHandler() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Original fetch for reference
      const originalFetch = window.fetch;
      
      // Override fetch to block requests to problematic domains
      window.fetch = async function(input, init) {
        const url = input instanceof Request ? input.url : String(input);
        
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
        
        // Proceed with the original fetch for non-blocked domains
        return originalFetch(input, init);
      };
      
      console.log('[Development] CORS request handler enabled');
    }
  }, []);
  
  // This component doesn't render anything
  return null;
}
