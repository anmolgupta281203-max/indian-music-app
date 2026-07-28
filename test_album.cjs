const axios = require('axios');

async function testAlbumDetails() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'content.getAlbumDetails',
        albumid: '75124773',
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    const songs = res.data.songs;
    console.log(songs ? songs.length + " songs" : "No songs");
    if(songs && songs.length > 0) {
      console.log("First song keys: ", Object.keys(songs[0]));
      console.log("Encrypted media URL: ", songs[0].encrypted_media_url);
    }
  } catch(e) {
    console.error(e.message);
  }
}

testAlbumDetails();
