const axios = require('axios');
async function checkCors() {
  try {
    const res = await axios.get('https://aac.saavncdn.com/180/raNo5534ctgc4THXaWupiimQin67CeTa_320.mp4', {
      headers: { Origin: 'http://localhost:5173' }
    });
    console.log("CORS Header:", res.headers['access-control-allow-origin']);
    console.log("Success:", res.status);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
checkCors();
