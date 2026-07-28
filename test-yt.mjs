import ytSearch from 'yt-search';

async function test() {
  const r = await ytSearch('latest release music');
  console.log(r.videos.length);
  if (r.videos.length > 0) {
    console.log(r.videos[0]);
  }
}
test();
