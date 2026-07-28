import https from 'https';
import http from 'http';

const servers = [
  { id: 'vidlink', url: 'https://vidlink.pro/movie/27205' },
  { id: 'autoembed', url: 'https://autoembed.co/movie/tmdb/27205' },
  { id: 'vidsrc.in', url: 'https://vidsrc.in/embed/movie?tmdb=27205' },
  { id: 'vidsrc.net', url: 'https://vidsrc.net/embed/movie?tmdb=27205' },
  { id: 'vidsrc.pro', url: 'https://vidsrc.pro/embed/movie/27205' },
  { id: 'moviesapi', url: 'https://moviesapi.club/movie/27205' },
  { id: 'vidsrc.cc', url: 'https://vidsrc.cc/v2/embed/movie/27205' },
  { id: 'vidsrc.pm', url: 'https://vidsrc.pm/embed/movie?tmdb=27205' },
  { id: '2embed', url: 'https://www.2embed.cc/embed/27205' },
  { id: 'smashystream', url: 'https://player.smashy.stream/movie/27205' }
];

async function checkServer(server) {
  return new Promise((resolve) => {
    const lib = server.url.startsWith('https') ? https : http;
    const req = lib.get(server.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 5000
    }, (res) => {
      resolve({ id: server.id, status: res.statusCode });
    });

    req.on('error', (e) => {
      resolve({ id: server.id, status: e.code || 'ERROR' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ id: server.id, status: 'TIMEOUT' });
    });
  });
}

async function run() {
  console.log('Testing servers...');
  for (const s of servers) {
    const result = await checkServer(s);
    console.log(`${result.id.padEnd(15)} : ${result.status}`);
  }
}

run();
