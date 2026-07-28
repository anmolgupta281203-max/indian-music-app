const axios = require('axios');

async function testLaunchDataDetails() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'webapi.getLaunchData',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log("new_albums sample:", JSON.stringify(res.data.new_albums[0], null, 2));
  } catch(e) {
    console.error(e.message);
  }
}

testLaunchDataDetails();
