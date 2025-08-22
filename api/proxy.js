const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // query ကနေ url ကို ယူပါ
  const url = req.query.url;

  if (!url) {
    res.status(400).send('Please provide a URL parameter.');
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        // request ကို ပုံမှန် browser တစ်ခုကနေ လာသလိုဖြစ်အောင် header အချို့ထည့်ပေးပါ
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': new URL(url).hostname // Referer ကို မူရင်း domain အဖြစ်သတ်မှတ်ပေးပါ
      }
    });

    const data = await response.buffer();

    // CORS header တွေကို ထည့်ပေးပြီး ဘယ် website ကမဆို ယူသုံးခွင့်ပြုပါ
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // ရလာတဲ့ data ကို client ဘက်ကို ပြန်ပို့ပေးပါ
    res.status(response.status).send(data);
    
  } catch (error) {
    res.status(500).send(error.message);
  }
};
