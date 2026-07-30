import crypto from 'crypto-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const key = crypto.enc.Utf8.parse('38346591');
    const decrypted = crypto.DES.decrypt(
        { ciphertext: crypto.enc.Base64.parse(url.trim()) },
        key,
        { mode: crypto.mode.ECB, padding: crypto.pad.Pkcs7 }
    );
    let decryptedUrl = decrypted.toString(crypto.enc.Utf8);
    
    // Some known fixes for JioSaavn CDN changes
    const m4aUrl = decryptedUrl.replace(/\.mp4$/, '.m4a');
    
    res.status(200).json({ 
      original: decryptedUrl,
      m4a: m4aUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
