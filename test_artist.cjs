const axios = require('axios');

async function testArtistData() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'artist.getArtistPageDetails',
        artistId: '459320', // Arijit Singh
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log("Artist Keys:", Object.keys(res.data));
    console.log("topSongs:", res.data.topSongs?.length);
    console.log("latest_release:", res.data.latest_release?.length);
    console.log("topAlbums:", res.data.topAlbums?.length);
    
    // Check old songs or other categories
    console.log("dedicated_artist_playlist:", res.data.dedicated_artist_playlist?.map(p => p.title));
  } catch(e) {
    console.error(e.message);
  }
}

testArtistData();
