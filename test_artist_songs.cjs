const axios = require('axios');

async function testArtistSongs() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'artist.getArtistPageDetails',
        artistId: '21718089',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(JSON.stringify(res.data.topSongs[0], null, 2));
  } catch(e) {
    console.error(e.message);
  }
}

testArtistSongs();
