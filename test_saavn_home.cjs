const axios = require('axios');

async function testSaavn() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php?__call=webapi.getLaunchData&_format=json&_marker=0&ctx=web6dot0');
    console.log(JSON.stringify(res.data.new_trending, null, 2));
  } catch(e) {
    console.error(e.message);
  }
}

testSaavn();
