export const cacheSongForOffline = async (songUrl, songId) => {
  try {
    const response = await fetch(songUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const cache = await caches.open('offline-songs');
    await cache.put(songUrl, response);
    console.log(`Song ${songId} cached successfully`);
    return true;
  } catch (error) {
    console.error('Error caching song:', error);
    return false;
  }
};
