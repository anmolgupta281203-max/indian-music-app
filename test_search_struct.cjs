const axios = require('axios');

async function testSearch() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        q: 'arijit',
        p: 1,
        n: 1,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(JSON.stringify(res.data.results[0], null, 2));
  } catch(e) {
    console.error(e.message);
  }
}

testSearch();
