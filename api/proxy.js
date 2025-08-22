const fetch = require('node-fetch');
const { URL } = require('url');

// URL အပြည့်အစုံကနေ အခြေခံ URL (domain နှင့် folder path) ကို ထုတ်ယူပေးမယ့် function
const getBaseUrl = (url) => {
  try {
    const urlObject = new URL(url);
    // URL ရဲ့ နောက်ဆုံး slash ပါတဲ့အထိ ဖြတ်ယူပါ
    return urlObject.href.substring(0, urlObject.href.lastIndexOf('/') + 1);
  } catch (e) {
    // URL မှားယွင်းနေပါက မူရင်းအတိုင်းပြန်ပေးပါ
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

    // CORS header ကို အမြဲတမ်းထည့်ပေးပါ
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // M3U8 playlist ဟုတ်မဟုတ် စစ်ဆေးပါ
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || targetUrl.endsWith('.m3u8')) {
      let playlistText = await response.text();
      const baseUrl = getBaseUrl(targetUrl);

      // Playlist ထဲက စာကြောင်းတစ်ကြောင်းချင်းစီကို စစ်ပြီး လမ်းကြောင်းအတိုတွေကို အပြည့်ပြန်ဖြည့်ပါ
      const rewrittenPlaylist = playlistText.split('\n').map(line => {
        const trimmedLine = line.trim();
        // # နဲ့မစဘဲ http နဲ့လည်းမစတဲ့ စာကြောင်းက video segment URL ဖြစ်ပါတယ်
        if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('http')) {
          return baseUrl + trimmedLine;
        }
        return line;
      }).join('\n');
      
      return res.status(200).send(rewrittenPlaylist);

    } else {
      // M3U8 မဟုတ်ရင် (ဥပမာ .ts file) data ကို ဒီအတိုင်းပြန်ပို့ပါ
      const data = await response.buffer();
      return res.status(response.status).send(data);
    }
  } catch (error) {
    console.error("Proxy Error:", error);
    return res.status(500).send(error.message);
  }
};
