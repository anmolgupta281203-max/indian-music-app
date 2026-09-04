import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from 'react';
import { getOfflineSong, downloadSongToApp, getAllOfflineSongs, deleteOfflineSong } from '../utils/offlineStorage';
import { fetchLyrics, searchSongs } from '../services/api';

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
    try {
      const saved = localStorage.getItem('svar_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [currentUrl, setCurrentUrl] = useState('');
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(() => {
    try {
      const saved = localStorage.getItem('svar_crossfade');
      const val = saved ? parseInt(saved, 10) : 3;
      return isNaN(val) ? 3 : val;
    } catch (e) {
      return 3;
    }
  });

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
  const playbackSessionIdRef = useRef(0);
  const ytCandidatesRef = useRef([]);
  const currentYtIndexRef = useRef(0);
  const audioCandidatesRef = useRef([]);
  const currentAudioIndexRef = useRef(0);
  const isTransitioningTrackRef = useRef(false);

  // Synchronized Timeline State
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const isSeekingRef = useRef(false);

  // Sync timeline progress from native audio
  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (!youtubeVideoId && !isSeekingRef.current) {
        const cur = audio.currentTime || 0;
        setProgress(cur);
        const dur = audio.duration;
        let activeDur = 0;
        if (dur && isFinite(dur) && dur > 0) {
          activeDur = dur;
          setDuration(dur);
        } else if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
          activeDur = currentSong.duration;
          setDuration(currentSong.duration);
        }
        if ('mediaSession' in navigator && activeDur > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: activeDur,
              playbackRate: 1,
              position: Math.min(cur, activeDur)
            });
          } catch (e) {}
        }
      }
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('durationchange', updateProgress);
    audio.addEventListener('canplay', updateProgress);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('durationchange', updateProgress);
      audio.removeEventListener('canplay', updateProgress);
    };
  }, [youtubeVideoId, currentSong]);

  // Real-time timeline synchronization (smooth 60fps & YouTube/native tracking)
  useEffect(() => {
    let animFrame;
    const tick = () => {
      if (isPlaying && !isSeekingRef.current) {
        if (!youtubeVideoId && nativeAudioRef.current) {
          const cur = nativeAudioRef.current.currentTime || 0;
          setProgress(cur);
          const audioDur = nativeAudioRef.current.duration;
          if (audioDur && isFinite(audioDur) && audioDur > 0) {
            setDuration(audioDur);
          }
        } else if (youtubeVideoId && ytPlayerRef?.current) {
          try {
            const ytCur = ytPlayerRef.current.getCurrentTime();
            if (ytCur != null && isFinite(ytCur)) {
              setProgress(ytCur);
            }
            const ytDur = ytPlayerRef.current.getDuration();
            if (ytDur != null && isFinite(ytDur) && ytDur > 0) {
              setDuration(ytDur);
            }
          } catch (e) {}
        }
      }
      if (isPlaying) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrame = requestAnimationFrame(tick);
    }
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, youtubeVideoId]);

  // Reset progress when currentSong changes
  useEffect(() => {
    setProgress(0);
    if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
      setDuration(currentSong.duration);
    } else {
      setDuration(0);
    }
  }, [currentSong?.id, youtubeVideoId]);

  const handleSeekChange = (e) => {
    isSeekingRef.current = true;
    const time = Number(e.target.value);
    setProgress(time);
    if (!youtubeVideoId && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
  };

  const handleSeekMouseUp = (e) => {
    const time = Number(e.target.value);
    setProgress(time);
    if (youtubeVideoId && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(time, 'seconds');
      } catch (err) {}
    } else if (nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 150);
  };

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
    localStorage.setItem('svar_crossfade', crossfadeSeconds);
  }, [crossfadeSeconds]);

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
    // Only initialize Web Audio if a custom EQ is actually used
    // This prevents background/lockscreen playback from being suspended by mobile browsers
    if (presetKey !== 'Normal' && presetKey !== 'flat' && !audioCtxRef.current) {
      setupWebAudio();
    }

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
      audio.volume = 1;
      playNext();
    };

    const handlePlay = () => {
      isTransitioningTrackRef.current = false;
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    };

    const handlePause = () => {
      if (isTransitioningTrackRef.current) return;
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleTimeUpdate = () => {
      // Crossfade fade-out during final seconds of song
      if (crossfadeSeconds > 0 && audio.duration > 0 && isFinite(audio.duration)) {
        const remaining = audio.duration - audio.currentTime;
        if (remaining <= crossfadeSeconds && remaining > 0) {
          const factor = Math.max(0.05, remaining / crossfadeSeconds);
          audio.volume = factor;
        }
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [queue, currentIndex, isShuffling, isLooping, crossfadeSeconds]);

  // MediaSession Handlers — controls both native audio and YouTube player from lock screen / notification
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        if (youtubeVideoId) {
          startSilentKeepalive();
        } else if (nativeAudioRef.current) {
          nativeAudioRef.current.play().catch(e => console.warn('Lockscreen play error:', e));
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        stopSilentKeepalive();
        if (nativeAudioRef.current) {
          nativeAudioRef.current.pause();
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          if (youtubeVideoId && ytPlayerRef.current) {
            ytPlayerRef.current.seekTo(details.seekTime, 'seconds');
          } else if (nativeAudioRef.current) {
            nativeAudioRef.current.currentTime = details.seekTime;
          }
        }
      });

      try {
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const offset = details.seekOffset || 10;
          if (youtubeVideoId && ytPlayerRef.current) {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            ytPlayerRef.current.seekTo(cur + offset, 'seconds');
          } else if (nativeAudioRef.current) {
            nativeAudioRef.current.currentTime = Math.min(nativeAudioRef.current.currentTime + offset, nativeAudioRef.current.duration || 9999);
          }
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const offset = details.seekOffset || 10;
          if (youtubeVideoId && ytPlayerRef.current) {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            ytPlayerRef.current.seekTo(Math.max(cur - offset, 0), 'seconds');
          } else if (nativeAudioRef.current) {
            nativeAudioRef.current.currentTime = Math.max(nativeAudioRef.current.currentTime - offset, 0);
          }
        });
      } catch (e) {}
    }
  }, [queue, currentIndex, isShuffling, isLooping, youtubeVideoId, startSilentKeepalive, stopSilentKeepalive]);

  // Sync silent keepalive ONLY when YouTube is actively playing to prevent audio focus conflict with native audio
  useEffect(() => {
    if (isPlaying && currentSong && youtubeVideoId) {
      startSilentKeepalive();
    } else {
      stopSilentKeepalive();
    }
  }, [isPlaying, currentSong, youtubeVideoId, startSilentKeepalive, stopSilentKeepalive]);

  const playSong = (song, newQueue = null) => {
    playbackSessionIdRef.current += 1;
    const currentSession = playbackSessionIdRef.current;
    isTransitioningTrackRef.current = true;

    if (nativeAudioRef.current) {
      const audio = nativeAudioRef.current;
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
      const artworkUrl = typeof song.image === 'string'
        ? song.image
        : (song.image?.[song.image.length - 1]?.url
          || song.image?.[song.image.length - 1]?.link
          || song.image?.[0]?.url
          || song.image?.[0]?.link
          || 'https://via.placeholder.com/512');
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

    const streamNetwork = () => {
      const fallbackToYouTube = () => {
        if (playbackSessionIdRef.current !== currentSession) return;

        if (song.youtubeId) {
          ytCandidatesRef.current = [song.youtubeId];
          currentYtIndexRef.current = 0;
          setYoutubeVideoId(song.youtubeId);
          setCurrentUrl(`https://www.youtube.com/watch?v=${song.youtubeId}`);
          return;
        }

        const fallbackQuery = `${songTitle} ${artistName} audio`;
        fetch(`/api/yt-search?q=${encodeURIComponent(fallbackQuery)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            if (playbackSessionIdRef.current !== currentSession) return;
            const vids = (data?.results || []).map(r => r.videoId).filter(Boolean);
            if (vids.length > 0) {
              ytCandidatesRef.current = vids;
              currentYtIndexRef.current = 0;
              const chosenVid = vids[0];
              setYoutubeVideoId(chosenVid);
              setCurrentUrl(`https://www.youtube.com/watch?v=${chosenVid}`);
            } else {
              console.warn('No YouTube results found for fallback');
              setIsPlaying(false);
            }
          })
          .catch(e => {
            if (playbackSessionIdRef.current !== currentSession) return;
            console.error('YT fallback search failed:', e);
            setIsPlaying(false);
          });
      };

      const validDownloadUrls = (song.downloadUrl || [])
        .map(d => ({ quality: d.quality || '320kbps', url: d.url || d.link || '' }))
        .filter(d => d.url && d.url.trim().length > 0);

      // Stream natively from JioSaavn to enable background playback
      if (validDownloadUrls.length > 0) {
        setYoutubeVideoId(null);

        // Gather all bitrates in priority order
        const candidates = [];
        const pref = validDownloadUrls.find(d => d.quality === audioQuality);
        if (pref && pref.url) candidates.push(pref.url);

        ['320kbps', '160kbps', '96kbps', '48kbps'].forEach(q => {
          const match = validDownloadUrls.find(d => d.quality === q);
          if (match && match.url && !candidates.includes(match.url)) {
            candidates.push(match.url);
          }
        });

        validDownloadUrls.forEach(d => {
          if (d.url && !candidates.includes(d.url)) {
            candidates.push(d.url);
          }
        });

        // Add clean direct URLs and proxy streaming URLs as fallbacks
        const finalCandidates = [];
        candidates.forEach(raw => {
          let clean = raw.replace('audios.saavncdn.com', 'aac.saavncdn.com');
          clean = clean.replace(/(_master[^/]*|\.mpd|\.m3u8)(\?.*)?$/, '_320.mp4');
          if (!finalCandidates.includes(clean)) {
            finalCandidates.push(clean);
          }
          const proxy = `/api/stream?url=${encodeURIComponent(clean)}`;
          if (!finalCandidates.includes(proxy)) {
            finalCandidates.push(proxy);
          }
        });

        audioCandidatesRef.current = finalCandidates;
        currentAudioIndexRef.current = 0;

        const tryPlayCandidate = (idx) => {
          if (playbackSessionIdRef.current !== currentSession) return;
          if (idx >= finalCandidates.length) {
            console.log('All native audio sources failed, falling back to YouTube');
            fallbackToYouTube();
            return;
          }

          const targetUrl = finalCandidates[idx];
          setCurrentUrl(targetUrl);

          const audio = nativeAudioRef.current;
          if (!audio) return;

          audio.onerror = () => {
            if (playbackSessionIdRef.current !== currentSession) return;
            console.warn('Native playback error on candidate', idx, targetUrl);
            currentAudioIndexRef.current = idx + 1;
            tryPlayCandidate(idx + 1);
          };

          audio.removeAttribute('crossOrigin');
          audio.src = targetUrl;
          audio.currentTime = 0;
          audio.play().catch(e => {
            if (playbackSessionIdRef.current !== currentSession) return;
            console.log('Native play catch error:', e.name);
            if (e.name !== 'AbortError') {
              currentAudioIndexRef.current = idx + 1;
              tryPlayCandidate(idx + 1);
            }
          });
        };

        tryPlayCandidate(0);
      } 
      // Only use YouTube player if explicitly a YouTube video (e.g. from Video tab)
      else if (song.youtubeId) {
        setYoutubeVideoId(song.youtubeId);
        setCurrentUrl(`https://www.youtube.com/watch?v=${song.youtubeId}`);
      } else {
        fallbackToYouTube();
      }
    };

    const isDownloaded = downloadedSongs.some(s => s.id === song.id);
    
    if (isDownloaded) {
      // Prioritize the offline blob
      getOfflineSong(song.id).then(offlineSong => {
        if (playbackSessionIdRef.current !== currentSession) return;
        
        if (offlineSong && offlineSong.blob && nativeAudioRef.current) {
          const blobUrl = URL.createObjectURL(offlineSong.blob);
          setYoutubeVideoId(null); // Disable YouTube player
          setCurrentUrl(blobUrl);
          
          nativeAudioRef.current.removeAttribute('crossOrigin');
          nativeAudioRef.current.src = blobUrl;
          nativeAudioRef.current.currentTime = 0;
          nativeAudioRef.current.play().catch(e => {
            if (playbackSessionIdRef.current !== currentSession) return;
            console.log('Offline play error:', e);
            // Fallback to network stream if offline blob is broken/unsupported
            streamNetwork();
          });
        } else {
          // If blob is corrupt or missing, fallback to network
          streamNetwork();
        }
      }).catch(e => {
        if (playbackSessionIdRef.current !== currentSession) return;
        console.error("Error loading offline song", e);
        streamNetwork();
      });
    } else {
      streamNetwork();
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
        const query = currentSong.primaryArtists ? currentSong.primaryArtists.split(',')[0].trim() : 'Bollywood Hits';
        const related = await searchSongs(query);
        if (related && related.length > 0) {
          const queueIds = new Set(queue.map(s => s.id));
          const fresh = related.filter(s => !queueIds.has(s.id)).slice(0, 6);
          if (fresh.length > 0) {
            const nextTrack = fresh[0];
            setQueue(prev => [...prev, ...fresh]);
            setCurrentIndex(queue.length);
            playSong(nextTrack);
          }
        }
      } catch (e) {
        console.error("Smart Autoplay failed", e);
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
      const exists = prev.some(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      } else {
        return [...prev, song];
      }
    });
  };

  const handleDownloadToggle = async (song) => {
    if (!song || !song.id) return;
    const isDownloaded = downloadedSongs.some(s => s.id === song.id);
    if (isDownloaded) {
      await deleteOfflineSong(song.id);
      setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      setDownloadingIds(prev => new Set(prev).add(song.id));
      try {
        const success = await downloadSongToApp(song);
        if (success) {
          const allSongs = await getAllOfflineSongs();
          setDownloadedSongs(allSongs);
        } else {
          alert('Could not download this track for offline playback. Please check your network.');
        }
      } catch (err) {
        console.error("Download failed:", err);
      } finally {
        setDownloadingIds(prev => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
      }
    }
  };

  const handleYtPlayerError = (error) => {
    console.warn('YouTube Player error encountered, trying next candidate:', error);
    currentYtIndexRef.current += 1;
    const candidates = ytCandidatesRef.current;
    if (currentYtIndexRef.current < candidates.length) {
      const nextCandidate = candidates[currentYtIndexRef.current];
      setYoutubeVideoId(nextCandidate.videoId);
      setCurrentUrl(`https://www.youtube.com/watch?v=${nextCandidate.videoId}`);
      setIsPlaying(true);
      return;
    }
    playNext();
  };

  return (
    <PlayerContext.Provider value={{ 
      currentSong, 
      isPlaying, 
      queue, 
      currentIndex,
      favorites,
      downloadedSongs,
      setDownloadedSongs,
      isQueueModalOpen,
      isShuffling,
      isLooping,
      audioQuality,
      setAudioQuality,
      crossfadeSeconds,
      setCrossfadeSeconds,
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
      downloadingIds,
      handleDownloadToggle,
      handleYtPlayerError,
      currentUrl,
      youtubeVideoId,
      ytPlayerRef,
      nativeAudioRef,
      progress,
      duration,
      setProgress,
      setDuration,
      handleSeekChange,
      handleSeekMouseUp,
      isSeekingRef
    }}>
      {children}
      {/* Keep native audio element for offline/downloaded and JioSaavn songs */}
      <audio 
        ref={nativeAudioRef} 
        preload="metadata"
        playsInline
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} 
      />
    </PlayerContext.Provider>
  );
};
