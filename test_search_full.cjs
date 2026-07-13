const axios = require('axios');

async function testSearchFull() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        q: 'Atif Aslam',
        p: 1,
        n: 2,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(JSON.stringify(res.data.results, null, 2));
  } catch(e) {
    console.error(e.message);
  }
}

testSearchFull();
