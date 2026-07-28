import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { getOfflineSong, downloadSongToApp, getAllOfflineSongs, deleteOfflineSong } from '../utils/offlineStorage';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  
  // Audio Quality: '320kbps', '160kbps', '96kbps'
  const [audioQuality, setAudioQuality] = useState(() => {
    return localStorage.getItem('svar_audio_quality') || '320kbps';
  });

  // Sleep Timer: null or target timestamp in ms
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('svar_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Global Queue Modal State
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('');

  const nativeAudioRef = useRef(null);

  useEffect(() => {
    getAllOfflineSongs().then(songs => setDownloadedSongs(songs));
  }, []);

  useEffect(() => {
    localStorage.setItem('svar_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('svar_audio_quality', audioQuality);
  }, [audioQuality]);

  // Sleep timer countdown logic
  useEffect(() => {
    if (!sleepTimerEnd) return;
    const interval = setInterval(() => {
      const remaining = sleepTimerEnd - Date.now();
      if (remaining <= 0) {
        pause();
        setSleepTimerEnd(null);
        setSleepTimerMinutes(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  const setSleepTimer = (mins) => {
    if (mins === 0) {
      setSleepTimerEnd(null);
      setSleepTimerMinutes(0);
    } else {
      setSleepTimerMinutes(mins);
      setSleepTimerEnd(Date.now() + mins * 60 * 1000);
    }
  };

  // Setup Global Audio Event Listeners for Background Continuity & Lockscreen
  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      playNext();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [queue, currentIndex, isShuffling, isLooping]);

  // MediaSession Action Handlers for Background & Hardware Control Keys
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (nativeAudioRef.current) nativeAudioRef.current.play().catch(console.error);
        setIsPlaying(true);
        navigator.mediaSession.playbackState = 'playing';
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (nativeAudioRef.current) nativeAudioRef.current.pause();
        setIsPlaying(false);
        navigator.mediaSession.playbackState = 'paused';
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }, [queue, currentIndex, isShuffling, isLooping]);

  const playSong = (song, newQueue = null) => {
    // 1. Immediately Stop and Reset any existing audio stream to prevent overlap
    if (nativeAudioRef.current) {
      const audio = nativeAudioRef.current;
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch (e) {}
      audio.removeAttribute('src');
      audio.innerHTML = '';
      audio.onerror = null;
    }

    let targetQueue = queue;
    let targetIndex = 0;

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      targetQueue = newQueue;
      const index = newQueue.findIndex(s => s.id === song.id);
      targetIndex = index !== -1 ? index : 0;
      setQueue(targetQueue);
      setCurrentIndex(targetIndex);
    } else if (queue.length === 0) {
      targetQueue = [song];
      targetIndex = 0;
      setQueue(targetQueue);
      setCurrentIndex(0);
    } else {
      const existingIdx = queue.findIndex(s => s.id === song.id);
      if (existingIdx !== -1) {
        targetIndex = existingIdx;
        setCurrentIndex(existingIdx);
      } else {
        targetQueue = [...queue, song];
        targetIndex = queue.length;
        setQueue(targetQueue);
        setCurrentIndex(targetIndex);
      }
    }
    
    setCurrentSong(song);
    
    let srcUrl = '';
    if (song.youtubeId) {
      srcUrl = `https://www.youtube.com/watch?v=${song.youtubeId}`;
    } else if (song.downloadUrl && song.downloadUrl.length > 0) {
      // Pick based on user quality setting
      let targetObj = song.downloadUrl.find(d => d.quality === audioQuality);
      if (!targetObj) targetObj = song.downloadUrl[song.downloadUrl.length - 1];
      srcUrl = targetObj ? targetObj.url : song.downloadUrl[song.downloadUrl.length - 1].url;
    }

    if (srcUrl) {
      setCurrentUrl(srcUrl);
      setIsPlaying(true);
      
      // Update Lockscreen & Status Notification MediaMetadata
      if ('mediaSession' in navigator) {
        const decodeHtml = (html) => {
          const txt = document.createElement("textarea");
          txt.innerHTML = html;
          return txt.value;
        };
        const artistName = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
        const songTitle = decodeHtml(song.name || 'Unknown Title');
        
        const artworkUrl = song.image?.[0]?.url || 'https://via.placeholder.com/512';
        const highResArt = artworkUrl.replace('150x150', '500x500').replace('50x50', '500x500');

        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: songTitle,
          artist: decodeHtml(artistName),
          album: 'Svar Music',
          artwork: [
            { src: highResArt, sizes: '96x96', type: 'image/jpeg' },
            { src: highResArt, sizes: '128x128', type: 'image/jpeg' },
            { src: highResArt, sizes: '192x192', type: 'image/jpeg' },
            { src: highResArt, sizes: '256x256', type: 'image/jpeg' },
            { src: highResArt, sizes: '384x384', type: 'image/jpeg' },
            { src: highResArt, sizes: '512x512', type: 'image/jpeg' }
          ]
        });
        
        navigator.mediaSession.playbackState = 'playing';
        document.title = `${songTitle} - Svar`;
      }
      
      if ((!song.youtubeId || srcUrl.startsWith('blob:')) && nativeAudioRef.current) {
        const audio = nativeAudioRef.current;
        
        if (song.downloadUrl && !srcUrl.startsWith('blob:')) {
          for (let i = song.downloadUrl.length - 1; i >= 0; i--) {
            const raw = song.downloadUrl[i].url;
            const source = document.createElement('source');
            source.src = raw;
            source.type = 'audio/mp4';
            audio.appendChild(source);
          }
        } else {
          audio.src = srcUrl;
        }

        // Automatic Proxy Fallback on Audio Errors (e.g. CORS block or 403)
        audio.onerror = () => {
          console.warn("Direct stream failed, falling back to /audio-proxy...");
          const targetRaw = song.downloadUrl ? song.downloadUrl[song.downloadUrl.length - 1].url : srcUrl;
          if (targetRaw && !targetRaw.startsWith('/audio-proxy')) {
            const proxyUrl = `/audio-proxy?url=${encodeURIComponent(targetRaw)}`;
            audio.onerror = null;
            audio.src = proxyUrl;
            setCurrentUrl(proxyUrl);
            audio.load();
            audio.play().catch(console.error);
          }
        };

        audio.load();
        audio.play().catch(e => {
          console.log("Audio play initiated:", e);
        });
      }
    }

    // Offline caching check
    const isDownloaded = downloadedSongs.some(s => s.id === song.id);
    if (isDownloaded) {
      getOfflineSong(song.id).then(offlineSong => {
        if (offlineSong && offlineSong.blob) {
          const blobUrl = URL.createObjectURL(offlineSong.blob);
          if (!song.youtubeId && nativeAudioRef.current) {
            const wasPlaying = !nativeAudioRef.current.paused;
            const currentTime = nativeAudioRef.current.currentTime;
            nativeAudioRef.current.src = blobUrl;
            setCurrentUrl(blobUrl);
            nativeAudioRef.current.currentTime = currentTime;
            if (wasPlaying) {
              nativeAudioRef.current.play().catch(e => console.log(e));
            }
          }
        }
      }).catch(e => console.error("Error loading offline song", e));
    }
  };

  const playSongAt = (index) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      playSong(queue[index]);
    }
  };

  const addToQueue = (song) => {
    setQueue(prev => {
      if (prev.some(s => s.id === song.id)) {
        return prev;
      }
      return [...prev, song];
    });
    if (!currentSong) {
      playSong(song, [song]);
    }
  };

  const removeFromQueue = (index) => {
    setQueue(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (index < currentIndex) {
        setCurrentIndex(currentIndex - 1);
      } else if (index === currentIndex && updated.length > 0) {
        const nextIdx = Math.min(index, updated.length - 1);
        setCurrentIndex(nextIdx);
        playSong(updated[nextIdx]);
      }
      return updated;
    });
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentIndex(-1);
  };

  const openQueueModal = () => setIsQueueModalOpen(true);
  const closeQueueModal = () => setIsQueueModalOpen(false);

  const togglePlay = () => {
    if (!currentSong) return;
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    
    if ((!currentSong.youtubeId || currentUrl.startsWith('blob:')) && nativeAudioRef.current) {
      if (nextState) {
        nativeAudioRef.current.play().catch(e => console.log(e));
      } else {
        nativeAudioRef.current.pause();
      }
    }
  };

  const pause = () => {
    setIsPlaying(false);
    if (nativeAudioRef.current) {
      nativeAudioRef.current.pause();
    }
  };

  const resumePlayback = () => {
    setIsPlaying(true);
    if (nativeAudioRef.current) {
      nativeAudioRef.current.play().catch(e => console.log(e));
    }
  };

  const toggleShuffle = () => setIsShuffling(!isShuffling);
  const toggleLoop = () => setIsLooping(!isLooping);

  const playNext = async () => {
    if (isShuffling && queue.length > 0) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      setCurrentIndex(randomIndex);
      playSong(queue[randomIndex]);
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      playSong(nextSong);
    } else if (isLooping && queue.length > 0) {
      setCurrentIndex(0);
      playSong(queue[0]);
    } else if (currentSong) {
      // Autoplay: fetch a related song automatically
      try {
        const artistName = currentSong.primaryArtists ? currentSong.primaryArtists.split(',')[0].trim() : 'Bollywood Hits';
        const { searchSongs } = await import('../services/api');
        const related = await searchSongs(artistName, false);
        if (related && related.length > 0) {
          const queueIds = new Set(queue.map(s => s.id));
          const available = related.filter(s => !queueIds.has(s.id));
          if (available.length > 0) {
            const nextSong = available[Math.floor(Math.random() * available.length)];
            addToQueue(nextSong);
            playSong(nextSong);
          }
        }
      } catch (e) {
        console.error("Autoplay failed", e);
      }
    }
  };

  const playPrev = () => {
    if (isShuffling && queue.length > 0) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      setCurrentIndex(randomIndex);
      playSong(queue[randomIndex]);
      return;
    }

    if (currentIndex > 0) {
      const prevSong = queue[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      playSong(prevSong);
    } else if (isLooping && queue.length > 0) {
      setCurrentIndex(queue.length - 1);
      playSong(queue[queue.length - 1]);
    }
  };

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
      currentIndex,
      favorites,
      downloadedSongs,
      isQueueModalOpen,
      isShuffling,
      isLooping,
      audioQuality,
      setAudioQuality,
      sleepTimerMinutes,
      setSleepTimer,
      playSong, 
      playSongAt,
      addToQueue,
      removeFromQueue,
      clearQueue,
      openQueueModal,
      closeQueueModal,
      pause,
      resumePlayback,
      togglePlay, 
      playNext, 
      playPrev,
      toggleShuffle,
      toggleLoop,
      toggleFavorite,
      handleDownloadToggle,
      currentUrl,
      nativeAudioRef
    }}>
      {children}
      <audio 
        ref={nativeAudioRef} 
        preload="auto" 
        crossOrigin="anonymous" 
        playsInline
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} 
      />
    </PlayerContext.Provider>
  );
};
