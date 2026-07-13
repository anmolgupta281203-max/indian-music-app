const axios = require('axios');

async function testSearchAll() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'autocomplete.get',
        query: 'Atif Aslam',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(Object.keys(res.data));
    if (res.data.artists) {
      console.log(res.data.artists.data.slice(0, 2));
    }
  } catch(e) {
    console.error(e.message);
  }
}

testSearchAll();
