// File: /api/proxy.js
// FINAL ADVANCED VERSION for Vercel (with M3U8 Rewriting)

export const config = {
  runtime: 'edge', // Use the Edge runtime for better performance and no cold starts
};

export default async function handler(request) {
  // CORS headers to allow your web player to access this proxy
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  // Handle the browser's preflight (OPTIONS) request
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Get the target stream URL from the query parameters
  const requestUrl = new URL(request.url);
  const targetUrlString = requestUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = new URL(targetUrlString);

    // Prepare headers to send to the target stream server
    const headersToSend = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      'Referer': targetUrl.origin,
    };

    // Fetch the resource from the target server
    const response = await fetch(targetUrl.toString(), { headers: headersToSend });

    if (!response.ok) {
      return new Response(response.body, { status: response.status, headers: corsHeaders });
    }

    const contentType = response.headers.get('content-type') || '';

    // Check if the content is an M3U8 playlist
    if (contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || targetUrl.pathname.endsWith('.m3u8')) {
      let manifestText = await response.text();
      
      // The base URL of our own proxy function
      const proxyBaseUrl = `${requestUrl.origin}/api/proxy?url=`;

      // Rewrite every line in the manifest file
      const rewrittenManifest = manifestText.split('\n').map(line => {
        line = line.trim();
        // If the line is not a comment and not empty, it's a URL
        if (line && !line.startsWith('#')) {
          // Create an absolute URL (in case the original is relative)
          const absoluteChunkUrl = new URL(line, targetUrl).toString();
          // Prepend our proxy URL to the chunk URL
          return proxyBaseUrl + encodeURIComponent(absoluteChunkUrl);
        }
        // If it's a comment or empty line, keep it as is
        return line;
      }).join('\n');

      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set('Content-Type', contentType);

      return new Response(rewrittenManifest, { headers: responseHeaders });

    } else {
      // If it's not a manifest (like a .ts video chunk), just stream it directly
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*'); // Crucial for streaming
      return new Response(response.body, { headers: responseHeaders });
    }

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
}
