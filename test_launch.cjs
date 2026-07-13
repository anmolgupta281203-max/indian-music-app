const axios = require('axios');

async function testLaunchData() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'webapi.getLaunchData',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log("Keys in launch data:", Object.keys(res.data));
    if (res.data.new_albums) {
      console.log("new_albums:", res.data.new_albums.length);
      console.log("new_albums sample:", res.data.new_albums[0]?.title);
    }
  } catch(e) {
    console.error(e.message);
  }
}

testLaunchData();
