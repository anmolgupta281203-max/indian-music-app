const axios = require('axios');

async function testPiped() {
  try {
    const q = 'sharry mann yaar jigree kasoti degree';
    const searchRes = await axios.get(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=all`);
    console.log("Search results:");
    const videos = searchRes.data.items.filter(i => i.type === 'stream').slice(0, 3);
    for (const v of videos) {
      console.log(`- ${v.title} (${v.url})`);
    }

    if (videos.length > 0) {
      const videoId = videos[0].url.split('?v=')[1];
      console.log("\nFetching streams for video:", videoId);
      const streamRes = await axios.get(`https://pipedapi.kavin.rocks/streams/${videoId}`);
      const audioStreams = streamRes.data.audioStreams;
      console.log("Audio streams available:", audioStreams.length);
      if (audioStreams.length > 0) {
        console.log("First audio stream URL:", audioStreams[0].url.substring(0, 100) + "...");
        console.log("Codec:", audioStreams[0].codec);
      }
    }
  } catch(e) {
    console.error(e.message);
  }
}

testPiped();
