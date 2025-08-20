// api/proxy.js
export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, User-Agent' } });
  }
  const fullUrl = new URL(request.url);
  const targetUrlString = fullUrl.searchParams.get('url');
  if (!targetUrlString) { return new Response('URL parameter is missing', { status: 400 }); }
  try {
    const targetUrl = new URL(targetUrlString);
    const response = await fetch(targetUrl.toString(), { headers: { 'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0', 'Referer': targetUrl.origin, 'Origin': targetUrl.origin } });
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
  } catch (error) {
    return new Response(`Error fetching the target URL: ${error.message}`, { status: 500 });
  }
}