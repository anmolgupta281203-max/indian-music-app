const axios = require('axios');
async function checkProxy2() {
  const url = 'https://aac.saavncdn.com/180/raNo5534ctgc4THXaWupiimQin67CeTa_320.mp4';
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  console.log("Fetching:", proxyUrl);
  try {
    const res = await axios.get(proxyUrl);
    console.log("Success, size:", res.data.length);
  } catch(e) {
    console.error("Error:", e.response ? e.response.status : e.message);
  }
}
checkProxy2();
