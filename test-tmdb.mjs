import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/search/multi?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&query=money+heist');
    console.log(res.data.results[0].name);
  } catch(e) {
    console.error(e.message);
  }
}
test();
