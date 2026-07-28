import axios from 'axios';

async function test() {
  const instances = [
    'https://vid.puffyan.us',
    'https://invidious.jing.rocks',
    'https://invidious.nerdvpn.de',
    'https://iv.melmac.space'
  ];

  for (const url of instances) {
    try {
      const q = 'parmish verma song';
      const res = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
      console.log(`Success with ${url}: ${res.data.length} items`);
      console.log(res.data[0].title);
      return;
    } catch (e) {
      console.error(`Error with ${url}:`, e.message);
    }
  }
}
test();
