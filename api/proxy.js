// File: /api/proxy.js

export default async function handler(request) {
  // Define CORS headers that allow any origin
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  // Handle the browser's preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // --- Main Proxy Logic ---
  const fullUrl = new URL(request.url);
  const targetUrlString = fullUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = new URL(targetUrlString);
    const origin = targetUrl.origin;

    // --- NEW: Create robust headers to pretend we are a real browser ---
    const robustHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      'Referer': origin,
      'Origin': origin,
    };
    
    // Fetch from the target using the new robust headers
    const response = await fetch(targetUrl.toString(), {
      headers: robustHeaders,
    });

    // Create a new response from the target's response
    const newResponse = new Response(response.body, response);
    
    // Add the crucial CORS header to the actual response
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;

  } catch (error) {
    // If fetching fails, return an error response with CORS headers
    return new Response(`Error fetching the target URL: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
