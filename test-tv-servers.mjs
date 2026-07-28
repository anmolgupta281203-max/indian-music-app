import https from 'https';
import http from 'http';

// Game of Thrones TMDB: 1399, Season 1, Episode 1
const servers = [
  { id: 'vidlink', url: 'https://vidlink.pro/tv/1399/1/1' },
  { id: 'autoembed', url: 'https://autoembed.co/tv/tmdb/1399-1-1' },
  { id: 'vidsrc.pm', url: 'https://vidsrc.pm/embed/tv?tmdb=1399&season=1&episode=1' },
  { id: '2embed', url: 'https://www.2embed.cc/embedtv/1399?s=1&e=1' }, // Fixed format
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
      resolve({ id: server.id, status: res.statusCode, url: server.url });
    });

    req.on('error', (e) => {
      resolve({ id: server.id, status: e.code || 'ERROR', url: server.url });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ id: server.id, status: 'TIMEOUT', url: server.url });
    });
  });
}

async function run() {
  console.log('Testing TV servers...');
  for (const s of servers) {
    const result = await checkServer(s);
    console.log(`${result.id.padEnd(15)} : ${result.status} : ${result.url}`);
  }
}

run();
