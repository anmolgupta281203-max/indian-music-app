import https from 'https';

const urls = [
  'https://vidlink.pro/movie/27205',
  'https://embed.su/embed/movie/27205',
  'https://vidsrc.pro/embed/movie/27205',
  'https://moviesapi.club/movie/27205',
  'https://player.smashy.stream/movie/27205',
  'https://autoembed.co/movie/tmdb/27205'
];

async function checkServer(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let found = [];
        if (data.includes('StreamHG')) found.push('StreamHG');
        if (data.includes('EarnVids')) found.push('EarnVids');
        if (data.includes('Cineverse')) found.push('Cineverse');
        if (data.includes('GDMIRROR')) found.push('GDMIRROR');
        resolve({ url, found });
      });
    });

    req.on('error', (e) => {
      resolve({ url, found: ['error'] });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url, found: ['timeout'] });
    });
  });
}

async function run() {
  for (const url of urls) {
    const result = await checkServer(url);
    console.log(result.url, result.found);
  }
}

run();
