const fetch = require('node-fetch');
const { URL } = require('url');

// URL အပြည့်အစုံကနေ အခြေခံ URL (domain နှင့် folder path) ကို ထုတ်ယူပေးမယ့် function
const getBaseUrl = (url) => {
  try {
    const urlObject = new URL(url);
    return urlObject.href.substring(0, urlObject.href.lastIndexOf('/') + 1);
  } catch (e) {
    return url;
  }
};

module.exports = async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Please provide a URL parameter.');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': new URL(targetUrl).hostname
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || targetUrl.endsWith('.m3u8')) {
      let playlistText = await response.text();
      const baseUrl = getBaseUrl(targetUrl);
      const proxyPrefix = `https://${req.headers.host}/api/proxy?url=`;

      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('http')) {
          return proxyPrefix + encodeURIComponent(new URL(trimmedLine, baseUrl).toString());
        } else if (trimmedLine.startsWith('http')) {
          return proxyPrefix + encodeURIComponent(trimmedLine);
        }
        return line;
      }).join('\n');
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(rewrittenPlaylist);
    } else {
      // Streaming Logic: Data ကို buffer မလုပ်တော့ဘဲ တိုက်ရိုက် stream လုပ်ပါ
      res.status(response.status);
      response.headers.forEach((value, name) => {
        // CORS header ကို ထပ်မထည့်မိအောင် စစ်ဆေးပါ
        if (name.toLowerCase() !== 'access-control-allow-origin') {
            res.setHeader(name, value);
        }
      });
      // response.body (ReadableStream) ကို client သို့ တိုက်ရိုက် pipe လုပ်ပါ
      response.body.pipe(res);
    }
  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).send(error.message);
  }
};
