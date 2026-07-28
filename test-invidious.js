const videoId = 'dQw4w9WgXcQ';
fetch(`https://vid.puffyan.us/api/v1/videos/${videoId}`)
  .then(res => res.json())
  .then(data => {
    if (data.formatStreams) {
      console.log('Got streams:', data.formatStreams.map(s => s.resolution));
      console.log('Stream URL:', data.formatStreams[0].url);
    } else {
      console.log('No streams found', data);
    }
  })
  .catch(console.error);
