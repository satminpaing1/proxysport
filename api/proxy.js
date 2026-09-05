const { URL } = require('url');

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
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(targetUrl).hostname,
        'Accept': '*/*',
        'Accept-Encoding': 'identity'
      },
      redirect: 'follow'
    };

    const response = await fetch(targetUrl, fetchOptions);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 = contentType.includes('mpegurl') ||
                    contentType.includes('vnd.apple.mpegurl') ||
                    targetUrl.endsWith('.m3u8') ||
                    targetUrl.includes('.m3u8');

    if (isM3u8) {
      const playlistText = await response.text();
      const baseUrl = getBaseUrl(targetUrl);
      const host = req.headers.host || req.headers['x-forwarded-host'];
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const proxyPrefix = `${protocol}://${host}/api/proxy?url=`;

      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return line;
        if (trimmedLine.startsWith('#')) return line;

        let fullUrl;
        if (trimmedLine.startsWith('http')) {
          fullUrl = trimmedLine;
        } else {
          try {
            fullUrl = new URL(trimmedLine, baseUrl).toString();
          } catch (e) {
            return line;
          }
        }

        return proxyPrefix + encodeURIComponent(fullUrl);
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(rewrittenPlaylist);
    } else {
      const buffer = await response.arrayBuffer();
      const forwardHeaders = {};
      response.headers.forEach((value, name) => {
        const lower = name.toLowerCase();
        if (lower !== 'access-control-allow-origin' &&
            lower !== 'transfer-encoding' &&
            lower !== 'content-encoding') {
          forwardHeaders[name] = value;
        }
      });

      res.status(response.status);
      Object.entries(forwardHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(Buffer.from(buffer));
    }
  } catch (error) {
    console.error("Proxy Error:", error.message);
    return res.status(500).send('Proxy error: ' + error.message);
  }
};
