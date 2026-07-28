const axios = require('axios');

async function testAutoComplete() {
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
    
    console.log("Songs from autocomplete:", res.data.songs.data.map(s => ({
      id: s.id,
      title: s.title,
      image: s.image,
      primaryArtists: s.more_info?.primary_artists
    })));
  } catch(e) {
    console.error(e.message);
  }
}

testAutoComplete();
