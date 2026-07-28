const videoId = 'dQw4w9WgXcQ';
fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`)
  .then(res => res.json())
  .then(data => {
    const videoStream = data.videoStreams.find(s => s.videoOnly === false);
    console.log(videoStream);
  })
  .catch(console.error);
