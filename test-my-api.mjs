import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://svar-beta.vercel.app/api/yt-search?q=parmish+verma+song');
    console.log("Success! Results length:", res.data.results.length);
    console.log(res.data.results[0]);
  } catch(e) {
    console.error("Failed:", e.message);
    if(e.response) console.error(e.response.data);
  }
}
test();
