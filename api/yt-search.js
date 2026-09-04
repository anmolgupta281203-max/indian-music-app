import ytSearch from 'yt-search';
import axios from 'axios';

async function searchYouTubeDirect(query, limit = 5) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 6000
    });

    const html = res.data;
    if (typeof html !== 'string') return [];

    const idx = html.indexOf('var ytInitialData = ');
    if (idx !== -1) {
      const start = idx + 'var ytInitialData = '.length;
      const end = html.indexOf(';</script>', start);
      if (end !== -1) {
        try {
          const json = JSON.parse(html.substring(start, end));
          const itemSection = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.find(c => c.itemSectionRenderer)?.itemSectionRenderer?.contents || [];
          const videos = [];
          for (const item of itemSection) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const title = v.title?.runs?.[0]?.text || v.title?.simpleText || (typeof v.title === 'string' ? v.title : '');
              videos.push({
                videoId: v.videoId,
                title: title,
                timestamp: v.lengthText?.simpleText || '',
                author: { name: v.ownerText?.runs?.[0]?.text || '' },
                thumbnail: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
              });
              if (videos.length >= limit) break;
            }
          }
          if (videos.length > 0) return videos;
        } catch (e) {}
      }
    }

    // Regex fallback
    const videoIds = [];
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (!videoIds.includes(match[1])) {
        videoIds.push(match[1]);
        if (videoIds.length >= limit) break;
      }
    }

    return videoIds.map(id => ({
      videoId: id,
      title: query,
      timestamp: '3:30',
      author: { name: 'YouTube Music' },
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    }));
  } catch (err) {
    console.error('Direct YouTube search fallback error:', err.message);
    return [];
  }
}

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

  const searchQuery = query.toLowerCase().includes('song') || query.toLowerCase().includes('music') 
    ? query 
    : `${query} song`;

  // 1. Try yt-search library
  try {
    const r = await ytSearch(searchQuery);
    if (r && r.videos && r.videos.length > 0) {
      const videos = r.videos.filter(v => v.seconds < 600).slice(0, limit);
      const finalVideos = videos.length > 0 ? videos : r.videos.slice(0, limit);
      const videoIds = finalVideos.map(v => v.videoId);
      const results = finalVideos.map(v => ({
        videoId: v.videoId,
        title: typeof v.title === 'string' ? v.title : (v.title?.runs?.[0]?.text || ''),
        timestamp: v.timestamp || '',
        author: { name: v.author?.name || '' },
        thumbnail: v.thumbnail || ''
      }));

      return res.json({ videoIds, results });
    }
  } catch (err) {
    console.warn('ytSearch library error, attempting direct YouTube fallback:', err.message);
  }

  // 2. Resilient Direct Fallback
  try {
    const directResults = await searchYouTubeDirect(searchQuery, limit);
    if (directResults.length > 0) {
      const videoIds = directResults.map(v => v.videoId);
      return res.json({ videoIds, results: directResults });
    }
  } catch (e) {
    console.error('Direct search failed:', e.message);
  }

  return res.status(404).json({ error: 'No videos found' });
}
