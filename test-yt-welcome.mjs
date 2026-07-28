import ytSearch from 'yt-search';

async function test() {
  const query = 'welcome song';
  const r = await ytSearch(query);
  console.log('Results length:', r.videos.length);
  if (r.videos.length > 0) {
    console.log(r.videos[0].title);
  }
}
test();
