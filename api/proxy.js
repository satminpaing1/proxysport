// File: /api/proxy.js

export default async function handler(request) {
  // Define CORS headers that allow any origin to access this proxy
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  // Handle the browser's preflight (OPTIONS) request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // --- Main Proxy Logic ---
  const fullUrl = new URL(request.url);
  const targetUrlString = fullUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = new URL(targetUrlString);
    const response = await fetch(targetUrl.toString());

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