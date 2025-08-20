// File: /api/proxy.js

export default async function handler(request) {
  // Define allowed origins. Add your real deployed domain when you have it.
  const allowedOrigins = [
    'http://127.0.0.1:5500', 
    'http://localhost:5500',
    // 'https://www.your-real-domain.com' // Add your real domain here later
  ];
  const origin = request.headers.get('origin');
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  // --- CORS Preflight Request Handling ---
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
      },
    });
  }

  // --- Main Proxy Logic ---
  const fullUrl = new URL(request.url);
  const targetUrlString = fullUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400 });
  }

  try {
    const targetUrl = new URL(targetUrlString);
    const response = await fetch(targetUrl.toString());

    // Create a new response and add the CORS header
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    return newResponse;

  } catch (error) {
    return new Response(`Error fetching the target URL: ${error.message}`, { status: 500 });
  }
}