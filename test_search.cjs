const axios = require('axios');

async function testSearch() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        q: 'arijit', 
        p: 1,
        n: 5,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(Object.keys(res.data));
    console.log(res.data.results[0].encrypted_media_url ? "Has encrypted_media_url" : "Missing encrypted_media_url");
  } catch(e) {
    console.error(e.message);
  }
}

testSearch();
