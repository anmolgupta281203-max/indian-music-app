const axios = require('axios');

async function testSearchAtif() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'search.getResults',
        q: 'Atif Aslam',
        p: 1,
        n: 10,
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(res.data.results.map(item => ({ id: item.id, title: item.title, image: item.image })));
  } catch(e) {
    console.error(e.message);
  }
}

testSearchAtif();
