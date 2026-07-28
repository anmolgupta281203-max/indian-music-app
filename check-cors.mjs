import axios from 'axios';

async function checkCors() {
  try {
    const res = await axios.options('https://iv.melmac.space/api/v1/search?q=test');
    console.log("CORS Headers:");
    console.log(res.headers);
    
    const res2 = await axios.get('https://iv.melmac.space/api/v1/search?q=test');
    console.log("GET Headers:");
    console.log(res2.headers['access-control-allow-origin']);
  } catch (e) {
    console.error(e.message);
  }
}
checkCors();
