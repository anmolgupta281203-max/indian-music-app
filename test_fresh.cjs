const axios = require('axios');
async function getFreshUrl() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'webapi.getLaunchData',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    
    // just get any song's vlink
    const item = res.data.new_trending.find(i => i.type === 'song' && i.details.vlink);
    const url = item.details.vlink;
    console.log("Fresh URL:", url);
    
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    console.log("Trying corsproxy.io:", proxyUrl);
    
    const p1 = await axios.get(proxyUrl);
    console.log("Success corsproxy size:", p1.data.length);
  } catch(e) {
    console.error("Error:", e.response ? e.response.status : e.message);
  }
}
getFreshUrl();
