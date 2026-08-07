import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { getOfflineSong, downloadSongToApp, getAllOfflineSongs, deleteOfflineSong } from '../utils/offlineStorage';
import { fetchLyrics } from '../services/api';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  bassBoost: [9, 6, 2, 0, -1],
  vocalEnhancer: [-2, 2, 6, 4, 1],
  bollywoodDance: [7, 4, 0, 3, 6],
  lofiChill: [5, 2, -2, -4, -6],
  acoustic: [3, 1, 3, 5, 4]
};

// Tiny silent WAV (44 bytes of silence) as a data URI.
// Playing this on loop keeps the browser audio session alive on mobile,
// preventing the OS from killing YouTube iframe playback when the screen locks.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

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

  // Equalizer Preset: 'flat', 'bassBoost', 'vocalEnhancer', 'bollywoodDance', 'lofiChill', 'acoustic'
  const [eqPreset, setEqPreset] = useState(() => {
    return localStorage.getItem('svar_eq_preset') || 'flat';
  });

  // Lyrics State
  const [lyrics, setLyrics] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  // Sleep Timer
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('svar_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('');

  // YouTube playback state
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const ytPlayerRef = useRef(null);

  const nativeAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const eqFiltersRef = useRef([]);
  
  // Silent audio keepalive ref - separate from the nativeAudioRef
  const silentAudioRef = useRef(null);
  // Track whether keepalive has been started (needs user gesture on mobile)
  const keepaliveStartedRef = useRef(false);

  useEffect(() => {
    getAllOfflineSongs().then(songs => setDownloadedSongs(songs));
  }, []);

  useEffect(() => {
    localStorage.setItem('svar_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('svar_audio_quality', audioQuality);
  }, [audioQuality]);

  useEffect(() => {
    localStorage.setItem('svar_eq_preset', eqPreset);
    applyEqPreset(eqPreset);
  }, [eqPreset]);

  // Web Audio API Equalizer Setup
  const setupWebAudio = () => {
    if (!nativeAudioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(nativeAudioRef.current);
      sourceNodeRef.current = source;

      // 5 Frequencies: 60Hz, 230Hz, 910Hz, 4000Hz, 14000Hz
      const freqs = [60, 230, 910, 4000, 14000];
      const filters = freqs.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        if (i === 0) filter.type = 'lowshelf';
        else if (i === freqs.length - 1) filter.type = 'highshelf';
        else filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = 0;
        return filter;
      });

      eqFiltersRef.current = filters;

      // Connect nodes sequentially: Source -> Filter0 -> Filter1 ... -> Destination
      let lastNode = source;
      filters.forEach(filter => {
        lastNode.connect(filter);
        lastNode = filter;
      });
      lastNode.connect(ctx.destination);
      applyEqPreset(eqPreset);
    } catch (e) {
      console.warn("Web Audio EQ initialization note:", e);
    }
  };

  const applyEqPreset = (presetKey) => {
    const gains = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
    if (eqFiltersRef.current && eqFiltersRef.current.length === 5) {
      eqFiltersRef.current.forEach((filter, idx) => {
        filter.gain.value = gains[idx];
      });
    }
  };

  // ── SILENT AUDIO KEEPALIVE ──────────────────────────────────────────────
  // Start a silent audio loop to keep the browser's audio session alive.
  // This prevents Android/iOS from killing the YouTube iframe when minimized.
  const startSilentKeepalive = useCallback(() => {
    if (keepaliveStartedRef.current) return;
    try {
      if (!silentAudioRef.current) {
        const audio = new Audio();
        audio.src = SILENT_WAV;
        audio.loop = true;
        audio.volume = 0.01; // Near-silent but not zero (some browsers ignore volume=0)
        audio.setAttribute('playsinline', '');
        silentAudioRef.current = audio;
      }
      const playPromise = silentAudioRef.current.play();
      if (playPromise) {
        playPromise.then(() => {
          keepaliveStartedRef.current = true;
        }).catch(() => {
          // Will retry on next user interaction
        });
      }
    } catch (e) {
      console.warn('Silent keepalive start failed:', e);
    }
  }, []);

  const stopSilentKeepalive = useCallback(() => {
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      keepaliveStartedRef.current = false;
    }
  }, []);

  // Sleep timer countdown
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

  // Global Audio Listeners
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
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
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

  // MediaSession Handlers — controls YouTube player from lock screen
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        startSilentKeepalive();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (ytPlayerRef.current && details.seekTime != null) {
          ytPlayerRef.current.seekTo(details.seekTime, 'seconds');
        }
      });
    }
  }, [queue, currentIndex, isShuffling, isLooping]);

  // Sync silent keepalive with isPlaying state
  useEffect(() => {
    if (isPlaying && currentSong) {
      startSilentKeepalive();
    } else if (!isPlaying) {
      // Don't stop keepalive immediately — let it run so background resume works
      // It will be stopped when no song is loaded
    }
  }, [isPlaying, currentSong, startSilentKeepalive]);

  const playSong = (song, newQueue = null) => {
    setupWebAudio();

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
    
    // Fetch Lyrics in background
    setLyrics(null);
    setLoadingLyrics(true);
    fetchLyrics(song.id).then(l => {
      setLyrics(l);
      setLoadingLyrics(false);
    }).catch(() => setLoadingLyrics(false));

    // ── YOUTUBE SEARCH & PLAY ─────────────────────────────────────────────
    const decodeHtml = (html) => {
      const txt = document.createElement('textarea');
      txt.innerHTML = html;
      return txt.value;
    };
    const artistName = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || '';
    const songTitle = decodeHtml(song.name || '');
    const searchQuery = song.youtubeId
      ? null  // already have the ID
      : `${songTitle} ${artistName} full audio song`;

    // Reset YouTube player
    setYoutubeVideoId(null);
    setIsPlaying(true);

    // Start silent keepalive on first user interaction (play)
    startSilentKeepalive();

    // Update MediaSession metadata immediately (album art etc.)
    if ('mediaSession' in navigator) {
      const artworkUrl = song.image?.[song.image.length - 1]?.url
        || song.image?.[0]?.url
        || 'https://via.placeholder.com/512';
      const highResArt = artworkUrl.replace('150x150', '500x500').replace('50x50', '500x500');
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: songTitle,
        artist: decodeHtml(artistName),
        album: 'Svar Music',
        artwork: [
          { src: highResArt, sizes: '512x512', type: 'image/jpeg' },
        ]
      });
      navigator.mediaSession.playbackState = 'playing';
      document.title = `${songTitle} - Svar`;
    }

    const isDownloaded = downloadedSongs.some(s => s.id === song.id);
    
    if (isDownloaded) {
      // Prioritize the offline blob
      getOfflineSong(song.id).then(offlineSong => {
        if (offlineSong && offlineSong.blob && nativeAudioRef.current) {
          const blobUrl = URL.createObjectURL(offlineSong.blob);
          setYoutubeVideoId(null); // Disable YouTube player
          setCurrentUrl(blobUrl);
          
          nativeAudioRef.current.src = blobUrl;
          nativeAudioRef.current.currentTime = 0;
          nativeAudioRef.current.play().catch(e => console.log(e));
        }
      }).catch(e => console.error("Error loading offline song", e));
    } else {
      // Stream natively from JioSaavn to enable background playback
      if (song.downloadUrl && song.downloadUrl.length > 0) {
        setYoutubeVideoId(null);
        
        // Find highest quality (320kbps) or fallback to the first available
        const bestAudio = song.downloadUrl.find(d => d.quality === '320kbps') || song.downloadUrl[song.downloadUrl.length - 1];
        const rawUrl = bestAudio.url || song.downloadUrl[0].url;
        setCurrentUrl(rawUrl);
        
        // Use direct URL since JioSaavn CDN allows CORS
        nativeAudioRef.current.src = rawUrl;
        nativeAudioRef.current.currentTime = 0;
        nativeAudioRef.current.play().catch(e => console.log('Native play error:', e));
      } 
      // Only use YouTube player if explicitly a YouTube video (e.g. from Video tab)
      else if (song.youtubeId) {
        setYoutubeVideoId(song.youtubeId);
        setCurrentUrl(`https://www.youtube.com/watch?v=${song.youtubeId}`);
      } else {
        // Fallback to YouTube if no JioSaavn audio URL is found
        const fallbackQuery = `${songTitle} ${artistName} audio`;
        fetch(`/api/yt-search?q=${encodeURIComponent(fallbackQuery)}&limit=1`)
          .then(res => res.json())
          .then(data => {
            const vid = data?.results?.[0]?.videoId || data?.videoIds?.[0];
            if (vid) {
              setYoutubeVideoId(vid);
              setCurrentUrl(`https://www.youtube.com/watch?v=${vid}`);
            } else {
              setIsPlaying(false);
            }
          })
          .catch(e => {
            console.error('YT fallback failed:', e);
            setIsPlaying(false);
          });
      }
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
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) {
      startSilentKeepalive();
      if (nativeAudioRef.current) {
        nativeAudioRef.current.play().catch(e => console.error('Play error:', e));
      }
    } else {
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
    }
    // YouTube player play/pause is controlled via the `playing` prop on ReactPlayer
  };

  const pause = () => {
    setIsPlaying(false);
    if (nativeAudioRef.current) {
      nativeAudioRef.current.pause();
    }
  };

  const resumePlayback = () => {
    setIsPlaying(true);
    startSilentKeepalive();
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
    const isDownloaded = downloadedSongs.some(s => s.id === song.id);
    if (isDownloaded) {
      await deleteOfflineSong(song.id);
      const allSongs = await getAllOfflineSongs();
      setDownloadedSongs(allSongs);
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
      eqPreset,
      setEqPreset,
      lyrics,
      loadingLyrics,
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
      youtubeVideoId,
      ytPlayerRef,
      nativeAudioRef
    }}>
      {children}
      {/* Keep native audio element for offline/downloaded songs */}
      <audio 
        ref={nativeAudioRef} 
        preload="none"
        playsInline
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} 
      />
    </PlayerContext.Provider>
  );
};
