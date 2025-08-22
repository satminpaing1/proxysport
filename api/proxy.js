// File: /api/proxy.js
// This advanced version handles M3U8 manifest rewriting on the edge.

export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestUrl = new URL(request.url);
  const targetUrlString = requestUrl.searchParams.get('url');

  if (!targetUrlString) {
    return new Response('URL parameter is missing', { status: 400, headers: corsHeaders });
  }

  try {
    const targetUrl = new URL(targetUrlString);

    const headersToSend = {
      'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0',
      'Referer': targetUrl.origin,
    };

    const response = await fetch(targetUrl.toString(), { headers: headersToSend });

    if (!response.ok) {
      return new Response(response.body, { status: response.status, headers: corsHeaders });
    }

    const contentType = response.headers.get('content-type') || '';

    // Check if the content is an M3U8 playlist
    if (contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || targetUrl.pathname.endsWith('.m3u8')) {
      let manifestText = await response.text();
      
      const proxyBaseUrl = `${requestUrl.origin}/api/proxy?url=`;

      // Rewrite every line in the manifest file
      const rewrittenManifest = manifestText.split('\n').map(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const absoluteChunkUrl = new URL(line, targetUrl).toString();
          return proxyBaseUrl + encodeURIComponent(absoluteChunkUrl);
        }
        return line;
      }).join('\n');

      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set('Content-Type', contentType);

      return new Response(rewrittenManifest, { headers: responseHeaders });

    } else {
      // If it's not a manifest (like a .ts video chunk), just stream it directly
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*'); 
      return new Response(response.body, { headers: responseHeaders });
    }

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
}
