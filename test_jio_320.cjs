const https = require('https');

https.get('https://aac.saavncdn.com/450/f467e05e2825cec2203546333e0d0550_320.mp4', (res) => {
  console.log('320:', res.statusCode);
});

https.get('https://aac.saavncdn.com/450/f467e05e2825cec2203546333e0d0550_160.mp4', (res) => {
  console.log('160:', res.statusCode);
});

https.get('https://aac.saavncdn.com/450/f467e05e2825cec2203546333e0d0550_96.mp4', (res) => {
  console.log('96:', res.statusCode);
});
