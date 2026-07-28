import axios from 'axios';

async function test() {
  const instances = [
    'https://pipedapi.adminforge.de',
    'https://pipedapi.tokhmi.xyz',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.moomoo.me'
  ];

  for (const url of instances) {
    try {
      const q = 'parmish verma song';
      const pipedRes = await axios.get(`${url}/search?q=${encodeURIComponent(q)}&filter=all`);
      console.log(`Success with ${url}: ${pipedRes.data.items.length} items`);
      return;
    } catch (e) {
      console.error(`Error with ${url}:`, e.message);
    }
  }
}
test();
