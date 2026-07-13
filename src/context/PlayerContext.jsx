import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { getOfflineSong, downloadSongToApp, getAllOfflineSongs, deleteOfflineSong } from '../utils/offlineStorage';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('svar_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    getAllOfflineSongs().then(songs => setDownloadedSongs(songs));
  }, []);

  useEffect(() => {
    localStorage.setItem('svar_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Removed audioRef event listeners, handled in MusicPlayer component

  const playSong = async (song, newQueue = null) => {
    if (newQueue) {
      setQueue(newQueue);
      const index = newQueue.findIndex(s => s.id === song.id);
      setCurrentIndex(index !== -1 ? index : 0);
    } else if (queue.length === 0) {
      setQueue([song]);
      setCurrentIndex(0);
    } else if (!queue.find(s => s.id === song.id)) {
      setQueue([...queue, song]);
      setCurrentIndex(queue.length);
    }
    
    setCurrentSong(song);
    
    let srcUrl = '';
    if (song.youtubeId) {
      srcUrl = `https://www.youtube.com/watch?v=${song.youtubeId}`;
    } else {
      const offlineSong = await getOfflineSong(song.id);
      if (offlineSong && offlineSong.blob) {
        srcUrl = URL.createObjectURL(offlineSong.blob);
        console.log('Playing offline from IndexedDB cache');
      } else {
        const rawUrl = song.downloadUrl ? song.downloadUrl[song.downloadUrl.length - 1].url : '';
        srcUrl = rawUrl ? `/audio-proxy?url=${encodeURIComponent(rawUrl)}` : '';
      }
    }

    if (srcUrl) {
      setCurrentUrl(srcUrl);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      playSong(nextSong);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      const prevSong = queue[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      playSong(prevSong);
    }
  };

  // Seek and Volume will be managed internally by MusicPlayer, 
  // but if other components need it we'll expose a ref or callback later.

  const toggleFavorite = (song) => {
    setFavorites(prev => {
      const exists = prev.find(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      }
      return [...prev, song];
    });
  };

  const handleDownloadToggle = async (song) => {
    const isDownloaded = downloadedSongs.find(s => s.id === song.id);
    if (isDownloaded) {
      await deleteOfflineSong(song.id);
      setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      const success = await downloadSongToApp(song);
      if (success) {
        const allSongs = await getAllOfflineSongs();
        setDownloadedSongs(allSongs);
      } else {
        alert("Download failed. Make sure you're connected to the internet.");
      }
    }
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      isPlaying, 
      queue, 
      favorites,
      downloadedSongs,
      playSong, 
      togglePlay, 
      playNext, 
      playPrev,
      toggleFavorite,
      handleDownloadToggle,
      currentUrl
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
