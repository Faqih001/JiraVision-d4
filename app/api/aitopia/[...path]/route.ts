import { NextRequest, NextResponse } from 'next/server';

/**
 * API route that proxies requests to the aitopia.ai API
 * This avoids CORS issues when calling from the browser
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const { searchParams } = new URL(request.url);
    
    // Reconstruct query parameters
    const queryString = Array.from(searchParams.entries())
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const url = `https://extensions.aitopia.ai/${path}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`Proxying GET request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward necessary headers but not origin-related ones
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => !['host', 'origin', 'referer'].includes(key.toLowerCase())
          )
        ),
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to aitopia.ai' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    const url = `https://extensions.aitopia.ai/${path}`;
    
    console.log(`Proxying POST request to: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward necessary headers but not origin-related ones
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => !['host', 'origin', 'referer'].includes(key.toLowerCase())
          )
        ),
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to aitopia.ai', success: false },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
