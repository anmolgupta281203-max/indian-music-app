import ytSearch from 'yt-search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { searchParams } = new URL(req.url || '', 'http://localhost');
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '5', 10);

  if (!query) {
    return res.status(400).json({ error: 'Missing q param' });
  }

  try {
    const searchQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('music') 
      ? query 
      : `${query} song`;

    const r = await ytSearch(searchQuery);
    
    if (!r || !r.videos || r.videos.length === 0) {
      return res.status(404).json({ error: 'No videos found' });
    }

    // Filter to reasonable lengths for songs (under 10 mins)
    const videos = r.videos.filter(v => v.seconds < 600).slice(0, limit);
    
    // Fallback if filtering removed everything
    const finalVideos = videos.length > 0 ? videos : r.videos.slice(0, limit);

    // Map to the format the frontend expects (or just return videoIds)
    const videoIds = finalVideos.map(v => v.videoId);
    const results = finalVideos.map(v => ({
      videoId: v.videoId,
      title: v.title,
      timestamp: v.timestamp,
      author: { name: v.author?.name || '' },
      thumbnail: v.thumbnail || ''
    }));

    return res.json({ videoIds, results });
  } catch (err) {
    console.error('YT search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
