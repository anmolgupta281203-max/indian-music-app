const axios = require('axios');
async function checkProxy() {
  const url = 'https://aac.saavncdn.com/180/raNo5534ctgc4THXaWupiimQin67CeTa_320.mp4';
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  console.log("Fetching:", proxyUrl);
  try {
    const res = await axios.get(proxyUrl);
    console.log("Success, size:", res.data.length);
  } catch(e) {
    console.error("Error:", e.response ? e.response.status : e.message);
    if(e.response && e.response.data) {
        console.log(e.response.data.substring(0, 100));
    }
  }
}
checkProxy();
