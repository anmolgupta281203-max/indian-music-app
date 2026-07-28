import axios from 'axios';

async function test() {
  const url = 'https://iv.melmac.space';
  const q = 'parmish verma song';
  const res = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
  console.log(JSON.stringify(res.data[0], null, 2));
}
test();
