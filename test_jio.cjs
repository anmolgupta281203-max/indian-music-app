const axios = require('axios');
const CryptoJS = require('crypto-js');

async function test() {
  try {
    const res = await axios.get('https://www.jiosaavn.com/api.php?__call=search.getResults&q=arijit&p=1&n=5&_format=json&_marker=0&ctx=web6dot0');
    console.log("Keys:", Object.keys(res.data));
    const firstSong = res.data.results[0];
    console.log("Title:", firstSong.title);
    console.log("Encrypted:", firstSong.encrypted_media_url);
    
    // Decrypt logic
    const key = CryptoJS.enc.Utf8.parse("38346591");
    const decrypted = CryptoJS.DES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(firstSong.encrypted_media_url) },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    ).toString(CryptoJS.enc.Utf8);
    console.log("Decrypted:", decrypted);
  } catch (e) {
    console.error(e);
  }
}
test();
