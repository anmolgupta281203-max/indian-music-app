import axios from 'axios';

/**
 * Searches YouTube and extracts videoIds from the HTML response.
 * No API key needed — uses YouTube's public search page.
 * 
 * Query params:
 *   q      – search query (e.g. "Tum Hi Ho Arijit Singh audio")
 *   limit  – max results to return (default 5)
 */
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
    const encodedQuery = encodeURIComponent(query);
    const ytUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;

    const response = await axios.get(ytUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const html = response.data;

    // Extract ytInitialData JSON from the page
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s)
      || html.match(/ytInitialData = ({.+?});\s*<\/script>/s);

    if (!match) {
      // Fallback: regex scan for videoId patterns
      const videoIds = [];
      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m;
      const seen = new Set();
      while ((m = regex.exec(html)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          videoIds.push(m[1]);
        }
        if (videoIds.length >= limit) break;
      }
      return res.json({ videoIds });
    }

    // Parse ytInitialData and extract video results
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      // Fallback regex if JSON parse fails
      const videoIds = [];
      const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      let m;
      const seen = new Set();
      while ((m = regex.exec(html)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          videoIds.push(m[1]);
        }
        if (videoIds.length >= limit) break;
      }
      return res.json({ videoIds });
    }

    // Walk the deeply nested ytInitialData to find videoRenderers
    const results = [];
    try {
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];

      for (const section of contents) {
        const items =
          section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          if (item?.videoRenderer) {
            const vr = item.videoRenderer;
            const videoId = vr.videoId;
            const title = vr.title?.runs?.[0]?.text || '';
            const duration = vr.lengthText?.simpleText || '';
            const channel = vr.ownerText?.runs?.[0]?.text || '';
            const thumbnail = vr.thumbnail?.thumbnails?.[vr.thumbnail.thumbnails.length - 1]?.url || '';

            if (videoId) {
              results.push({ videoId, title, duration, channel, thumbnail });
            }
          }
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
    } catch {
      // Ignore parsing errors
    }

    if (results.length > 0) {
      return res.json({ videoIds: results.map(r => r.videoId), results });
    }

    // Last resort: regex scan
    const videoIds = [];
    const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    let m;
    const seen = new Set();
    while ((m = regex.exec(html)) !== null) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        videoIds.push(m[1]);
      }
      if (videoIds.length >= limit) break;
    }

    return res.json({ videoIds, results: videoIds.map(id => ({ videoId: id })) });

  } catch (err) {
    console.error('YT search error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
