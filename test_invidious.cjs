const axios = require('axios');

async function testInvidious() {
  try {
    const q = 'sharry mann yaar jigree kasoti degree';
    const searchRes = await axios.get(`https://vid.puffyan.us/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
    console.log("Search results:");
    const videos = searchRes.data.slice(0, 3);
    for (const v of videos) {
      console.log(`- ${v.title} (${v.videoId})`);
    }

    if (videos.length > 0) {
      const videoId = videos[0].videoId;
      console.log("\nFetching streams for video:", videoId);
      const streamRes = await axios.get(`https://vid.puffyan.us/api/v1/videos/${videoId}`);
      const adaptiveFormats = streamRes.data.adaptiveFormats;
      const audioStreams = adaptiveFormats.filter(f => f.type.startsWith('audio'));
      console.log("Audio streams available:", audioStreams.length);
      if (audioStreams.length > 0) {
        console.log("First audio stream URL:", audioStreams[0].url.substring(0, 100) + "...");
      }
    }
  } catch(e) {
    console.error(e.message);
  }
}

testInvidious();
