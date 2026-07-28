const axios = require('axios');
const CryptoJS = require("crypto-js");

async function testSongDetails() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php', {
      params: {
        __call: 'song.getDetails',
        pids: 'Bt07_OpM', // Correct song ID
        _format: 'json',
        _marker: 0,
        ctx: 'web6dot0'
      }
    });
    console.log(Object.keys(res.data));
    
    // Check if it returned song details
    const songId = Object.keys(res.data)[0];
    const song = res.data[songId];
    console.log("Song found:", song?.title);
    
    if (song?.encrypted_media_url) {
      const key = CryptoJS.enc.Utf8.parse("38346591");
      const decrypted = CryptoJS.DES.decrypt(
          { ciphertext: CryptoJS.enc.Base64.parse(song.encrypted_media_url) },
          key,
          { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
      ).toString(CryptoJS.enc.Utf8);
      console.log("Decrypted URL:", decrypted);
    }
  } catch(e) {
    console.error(e.message);
  }
}

testSongDetails();
