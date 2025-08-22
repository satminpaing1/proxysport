import { URL } from 'url';

// Vercel Edge Runtime ကို သုံးပါမယ်။ ပိုမြန်ပြီး resource limit ပိုကောင်းပါတယ်
export const config = {
  runtime: 'edge',
};

// Target URL ကနေ base URL ကို ထုတ်ယူပေးမယ့် function
const getBaseUrl = (url) => {
  try {
    const urlObject = new URL(url);
    return urlObject.href.substring(0, urlObject.href.lastIndexOf('/') + 1);
  } catch (e) {
    return url;
  }
};

export default async function handler(request) {
  // CORS header ကို အရင်ဆုံး သတ်မှတ်ပါ
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Referer',
  };

  // Browser ရဲ့ OPTIONS request ကို အရင်ဖြေရှင်းပါ
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

    // ပိုပြီး သာမန် user request နဲ့တူအောင် header တွေကို ပြင်ဆင်ပါ
    const headersToSend = new Headers();
    headersToSend.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    headersToSend.set('Referer', targetUrl.origin);
    // Vercel က ထည့်တတ်တဲ့ header တွေကို ဖယ်ရှားပြီး ပိုပြီး သိုသိပ်အောင်လုပ်ပါ
    headersToSend.set('accept', '*/*');
    headersToSend.set('accept-language', 'en-US,en;q=0.9');
    
    const response = await fetch(targetUrl.toString(), { 
        method: 'GET',
        headers: headersToSend,
        redirect: 'follow'
    });
    
    // Response header အသစ်ကို CORS နဲ့တည်ဆောက်ပါ
    const responseHeaders = new Headers(corsHeaders);
    response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'access-control-allow-origin') {
            responseHeaders.set(key, value);
        }
    });

    // M3U8 playlist ဟုတ်မဟုတ် စစ်ဆေးပါ
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('mpegurl') || contentType.includes('x-mpegURL') || targetUrl.pathname.endsWith('.m3u8')) {
        let manifestText = await response.text();
        const baseUrl = getBaseUrl(targetUrlString);
        const proxyPrefix = `${requestUrl.origin}/api/proxy?url=`;

        // Playlist ထဲက လမ်းကြောင်းတွေကို အပြည့်ပြန်ဖြည့်ပါ
        const rewrittenManifest = manifestText.split('\n').map(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                return proxyPrefix + encodeURIComponent(new URL(trimmedLine, baseUrl).toString());
            }
            return line;
        }).join('\n');
      
        return new Response(rewrittenManifest, { status: 200, headers: responseHeaders });
    } else {
        // .ts file หรือ data อื่นๆ ကို တိုက်ရိုက်ပြန်လွှတ်ပါ
        return new Response(response.body, { status: response.status, headers: responseHeaders });
    }

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
}
