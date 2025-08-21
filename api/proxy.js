// File: /api/proxy.js
// FINAL CORRECTED VERSION with User-Agent and Referer forwarding

export default async function handler(request) {
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  // Handle preflight (OPTIONS) request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Parse the target URL from the query string
  const requestUrl = new URL(request.url, 'http://dummy.base');
  const targetUrlString = requestUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = new URL(targetUrlString);

    // --- KEY ADDITION: Prepare headers to make the request look like a real browser ---
    const headersToSend = {
      // Forward the browser's User-Agent, or use a common fallback if it's missing
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      // Some streams also require a Referer header, so we'll generate one
      'Referer': targetUrl.origin,
    };

    // Fetch the stream from the target server using the prepared headers
    const response = await fetch(targetUrl.toString(), {
      headers: headersToSend,
    });
    // --- END OF KEY ADDITION ---

    // Create a new response to send back to the browser
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;

  } catch (error) {
    // Handle any errors during the fetch process
    return new Response(`Error fetching the target URL: ${error.message}`, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
