// File: /api/proxy.js
// CORRECTED VERSION

export default async function handler(request) {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  // Handle preflight (OPTIONS) request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // --- Main Proxy Logic (Corrected) ---
  // Use a dummy base URL to properly parse the search parameters from the request path
  const requestUrl = new URL(request.url, 'http://dummy.base');
  const targetUrlString = requestUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    // Ensure the extracted URL is valid before fetching
    const targetUrl = new URL(targetUrlString);

    const response = await fetch(targetUrl.toString());

    // Create a new response and add the crucial CORS header
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;

  } catch (error) {
    // Handle errors like invalid URLs or fetch failures
    let errorMessage = `Error fetching the target URL: ${error.message}`;
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        errorMessage = `The provided URL parameter is invalid: "${targetUrlString}"`;
    }
    
    return new Response(errorMessage, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
