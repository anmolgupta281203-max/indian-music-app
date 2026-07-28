const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/audio-proxy')) {
    console.log("req.url:", req.url);
    const urlParam = req.url.split('?url=')[1];
    if (!urlParam) {
      res.statusCode = 400;
      return res.end('No url specified');
    }
    
    const actualUrl = decodeURIComponent(urlParam);
    console.log("actualUrl:", actualUrl);
    
    https.get(actualUrl, (targetRes) => {
      console.log("Target statusCode:", targetRes.statusCode);
      const headers = { ...targetRes.headers, 'Access-Control-Allow-Origin': '*' };
      res.writeHead(targetRes.statusCode, headers);
      targetRes.pipe(res);
    }).on('error', (e) => {
      console.log("Target error:", e.message);
      res.statusCode = 500;
      res.end(e.message);
    });
  } else {
    res.end('Not found');
  }
});

server.listen(5175, () => console.log('Listening on 5175'));
