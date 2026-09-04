import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, 
  Heart, Download, ChevronDown, ListMusic, Moon, MoreVertical, Check, Mic,
  Activity, PictureInPicture2, Share2, Sparkles, CheckCircle2, Loader2
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import ReactPlayer from 'react-player/youtube';
import AudioVisualizer from './AudioVisualizer';
import { openPictureInPicture, updatePipContent, isPipActive } from '../utils/pipPlayer';
import './MusicPlayer.css';

const formatTime = (time) => {
  if (isNaN(time) || !isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const decodeHtml = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const MusicPlayer = () => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay,
    pause,
    resumePlayback,
    playNext, 
    playPrev, 
    favorites, 
    toggleFavorite, 
    downloadedSongs, 
    downloadingIds,
    handleDownloadToggle, 
    handleYtPlayerError,
    openQueueModal, 
    nativeAudioRef, 
    ytPlayerRef,
    youtubeVideoId,
    isShuffling, 
    isLooping, 
    toggleShuffle, 
    toggleLoop,
    lyrics,
    loadingLyrics,
    sleepTimerMinutes,
    setSleepTimer
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerMode, setVisualizerMode] = useState('bars'); // 'bars' | 'wave' | 'pulse'
  
  // Popovers
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isSeekingRef = useRef(false);

  // Track progress from native audio (for offline/downloaded and JioSaavn songs)
  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (!youtubeVideoId && !isSeekingRef.current) {
        setProgress(audio.currentTime || 0);
        const dur = audio.duration;
        let activeDur = 0;
        if (dur && isFinite(dur) && dur > 0) {
          activeDur = dur;
          setDuration(dur);
        } else if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
          activeDur = currentSong.duration;
          setDuration(currentSong.duration);
        }
        // Sync MediaSession position state for background & lockscreen playback
        if ('mediaSession' in navigator && activeDur > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: activeDur,
              playbackRate: 1,
              position: Math.min(audio.currentTime || 0, activeDur)
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
  }, [youtubeVideoId, nativeAudioRef, currentSong]);

  // Continuous 60 FPS real-time timeline tracking for silky smooth playback progress & PiP sync
  useEffect(() => {
    let animFrame;
    const tick = () => {
      if (isPlaying && !isSeekingRef.current) {
        let cur = 0;
        let dur = duration;
        if (!youtubeVideoId && nativeAudioRef.current) {
          cur = nativeAudioRef.current.currentTime || 0;
          setProgress(cur);
          const audioDur = nativeAudioRef.current.duration;
          if (audioDur && isFinite(audioDur) && audioDur > 0) {
            dur = audioDur;
            setDuration(audioDur);
          }
        } else if (youtubeVideoId && ytPlayerRef?.current) {
          try {
            const ytCur = ytPlayerRef.current.getCurrentTime();
            if (ytCur != null && isFinite(ytCur)) {
              cur = ytCur;
              setProgress(ytCur);
            }
          } catch (e) {}
        }

        if (isPipActive()) {
          updatePipContent({
            song: currentSong,
            isPlaying: true,
            progress: cur,
            duration: dur,
            onTogglePlay: togglePlay,
            onPlayNext: playNext,
            onPlayPrev: playPrev
          });
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
  }, [isPlaying, youtubeVideoId, nativeAudioRef, ytPlayerRef, currentSong, duration, togglePlay, playNext, playPrev]);

  // Reset progress when song changes and initialize duration immediately from metadata
  useEffect(() => {
    setProgress(0);
    if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
      setDuration(currentSong.duration);
    } else {
      setDuration(0);
    }
  }, [youtubeVideoId, currentSong?.id]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  useEffect(() => {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = isMuted ? 0 : vol;
    }
  }, [isMuted, vol]);

  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isFullScreen]);

  const handleSeekChange = (e) => {
    isSeekingRef.current = true;
    const time = Number(e.target.value);
    setProgress(time);
    // Instant real-time audio scrubbing
    if (!youtubeVideoId && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
  };

  const handleSeekMouseUp = (e) => {
    isSeekingRef.current = false;
    const time = Number(e.target.value);
    if (youtubeVideoId && ytPlayerRef?.current) {
      ytPlayerRef.current.seekTo(time, 'seconds');
    } else if (nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVol(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const handleTogglePip = async () => {
    await openPictureInPicture({
      song: currentSong,
      isPlaying,
      progress,
      duration,
      onTogglePlay: togglePlay,
      onPlayNext: playNext,
      onPlayPrev: playPrev
    });
  };

  const cycleVisualizerMode = () => {
    setVisualizerMode(prev => prev === 'bars' ? 'wave' : prev === 'wave' ? 'pulse' : 'bars');
  };

  const handleShare = async (withTimestamp = true) => {
    if (!currentSong) return;
    const songName = decodeHtml(currentSong.name);
    const baseUrl = window.location.origin;
    const shareUrl = withTimestamp && progress > 3
      ? `${baseUrl}/?song=${currentSong.id}&t=${Math.floor(progress)}`
      : `${baseUrl}/?song=${currentSong.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Listen to ${songName} on Svar`,
          text: `Check out ${songName} on Svar Music App!`,
          url: shareUrl
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(`Link copied with timestamp (${formatTime(progress)}) to clipboard!`);
    }
  };

  // Time-Synced Karaoke Lyrics Parsing
  const parsedLyrics = useMemo(() => {
    if (!lyrics) return [];
    const rawLines = typeof lyrics === 'string'
      ? lyrics.replace(/<br\s*[\/]?>/gi, '\n').split('\n').map(l => l.trim()).filter(Boolean)
      : [];

    const lrcRegex = /^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/;
    const hasLrc = rawLines.some(l => lrcRegex.test(l));

    if (hasLrc) {
      return rawLines.map(line => {
        const match = line.match(lrcRegex);
        if (match) {
          const mins = parseInt(match[1], 10);
          const secs = parseInt(match[2], 10);
          const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
          return { time: mins * 60 + secs + ms, text: match[4] || '' };
        }
        return { time: 0, text: line };
      }).filter(item => item.text);
    }

    // Dynamic smart rhythmic distribution for unsynced plain-text lyrics
    const totalSec = (duration && duration > 0) ? duration : (currentSong?.duration || 220);
    const lineCount = rawLines.length;
    return rawLines.map((line, idx) => {
      const estimatedTime = Math.min(totalSec * 0.94, 6 + (idx / Math.max(1, lineCount)) * (totalSec * 0.86));
      return { time: estimatedTime, text: line };
    });
  }, [lyrics, duration, currentSong?.duration]);

  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (progress >= parsedLyrics[i].time - 0.5) {
        return i;
      }
    }
    return 0;
  }, [parsedLyrics, progress]);

  useEffect(() => {
    if (!showLyrics || activeLyricIndex < 0) return;
    const el = document.getElementById(`lyric-line-${activeLyricIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLyricIndex, showLyrics]);

  const handleLyricClick = (seekTime) => {
    if (seekTime != null && isFinite(seekTime)) {
      if (!youtubeVideoId && nativeAudioRef?.current) {
        try { nativeAudioRef.current.currentTime = seekTime; } catch (e) {}
      } else if (youtubeVideoId && ytPlayerRef?.current) {
        try { ytPlayerRef.current.seekTo(seekTime, 'seconds'); } catch (e) {}
      }
      setProgress(seekTime);
    }
  };

  const getPlayerImage = () => {
    if (!currentSong || !currentSong.image) return 'https://via.placeholder.com/60';
    if (typeof currentSong.image === 'string') return currentSong.image;
    if (Array.isArray(currentSong.image) && currentSong.image.length > 0) {
      const last = currentSong.image[currentSong.image.length - 1];
      return typeof last === 'string' ? last : (last?.url || currentSong.image[0]?.url || 'https://via.placeholder.com/60');
    }
    return 'https://via.placeholder.com/60';
  };

  if (!currentSong) return null;

  const imageUrl = getPlayerImage();
  const hqImageUrl = imageUrl.replace('150x150', '500x500').replace('50x50', '500x500');
  const isFavorite = favorites.some(s => s.id === currentSong.id);
  const isDownloaded = downloadedSongs.some(s => s.id === currentSong.id);
  const isDownloading = downloadingIds?.has(currentSong.id);
  const primaryArtist = decodeHtml(currentSong.primaryArtists || currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
  const songTitle = decodeHtml(currentSong.name);

  return (
    <>
      {/* Mini Player Bar */}
      <div className="music-player">
        <div className="mini-player-progress-bar">
          <div 
            className="mini-player-progress-fill"
            style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="now-playing" onClick={(e) => {
          if (e.target.closest('button')) return;
          setIsFullScreen(true);
        }} style={{cursor: 'pointer'}}>
          <img src={imageUrl} alt={songTitle} className={`song-art ${isPlaying ? 'playing' : ''}`} />
          <div className="song-info">
            <h4>{songTitle}</h4>
            <p>{primaryArtist}</p>
          </div>
          <button 
            className="control-btn" 
            style={{marginLeft: '1rem'}} 
            onClick={() => toggleFavorite(currentSong)}
            title="Save to library"
          >
            <Heart size={20} fill={isFavorite ? "var(--primary-color)" : "none"} color={isFavorite ? "var(--primary-color)" : "var(--text-secondary)"} />
          </button>
          <button 
            className="control-btn" 
            style={{marginLeft: '0.5rem'}} 
            onClick={openQueueModal}
            title="View Queue"
          >
            <ListMusic size={20} color="var(--primary-color)" />
          </button>
          <button 
            className="control-btn" 
            style={{marginLeft: '0.5rem'}} 
            onClick={() => handleDownloadToggle(currentSong)}
            title={isDownloaded ? "Downloaded offline (Tap to delete)" : isDownloading ? "Downloading offline..." : "Download offline"}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 size={20} className="animate-spin" color="var(--primary-color)" />
            ) : isDownloaded ? (
              <CheckCircle2 size={20} color="var(--primary-color)" />
            ) : (
              <Download size={20} color="var(--text-secondary)" />
            )}
          </button>
          <button 
            className="control-btn hide-on-mobile" 
            style={{marginLeft: '0.5rem'}} 
            onClick={handleTogglePip}
            title="Floating Mini Player (Picture in Picture)"
          >
            <PictureInPicture2 size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="player-controls-container">
          <div className="player-buttons">
            <button className="control-btn secondary hide-on-mobile" onClick={toggleShuffle}><Shuffle size={18} color={isShuffling ? "var(--primary-color)" : "currentColor"} /></button>
            <button className="control-btn" onClick={playPrev}><SkipBack size={24} /></button>
            <button className="control-btn play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>
            <button className="control-btn" onClick={playNext}><SkipForward size={24} /></button>
            <button className="control-btn secondary hide-on-mobile" onClick={toggleLoop}><Repeat size={18} color={isLooping ? "var(--primary-color)" : "currentColor"} /></button>
          </div>
          <div className="progress-container">
            <span className="time">{formatTime(progress)}</span>
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={progress} 
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchEnd={handleSeekMouseUp}
              className="progress-bar"
              style={{ '--progress': `${duration ? (progress / duration) * 100 : 0}%` }}
            />
            <span className="time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="volume-control">
          <button className="control-btn" onClick={toggleMute}>
            {isMuted || vol === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : vol} 
            onChange={handleVolumeChange}
            className="volume-bar"
            style={{ '--progress': `${isMuted ? 0 : vol * 100}%` }}
          />
        </div>
      </div>

      {/* --- Full Screen Player --- */}
      <div className={`fullscreen-player ${isFullScreen ? 'open' : ''}`}>
        <div className="fs-background" style={{ backgroundImage: `url(${hqImageUrl})` }}></div>
        <div className="fs-overlay"></div>
        
        <div className="fs-content">
          {/* Header Bar */}
          <div className="fs-header">
            <button className="fs-close-btn" onClick={() => setIsFullScreen(false)}>
              <ChevronDown size={30} />
            </button>
            <div className="fs-header-title">
              <span className="fs-now-playing-label">Now Playing</span>
              <span className="fs-playlist-label">Svar Queue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                className={`fs-action-circle ${showVisualizer ? 'active' : ''}`} 
                onClick={() => setShowVisualizer(!showVisualizer)} 
                title={`Live Audio Visualizer (${visualizerMode.toUpperCase()} mode)`}
                style={{ width: 38, height: 38 }}
              >
                <Activity size={20} color={showVisualizer ? "var(--aura-primary, #1ed760)" : "#fff"} />
              </button>
              <button 
                className="fs-action-circle hide-on-mobile" 
                onClick={handleTogglePip} 
                title="Floating Picture-in-Picture Mini Player"
                style={{ width: 38, height: 38 }}
              >
                <PictureInPicture2 size={20} color="#fff" />
              </button>
              <button 
                className={`fs-action-circle ${showLyrics ? 'active' : ''}`} 
                onClick={() => setShowLyrics(!showLyrics)} 
                title="Lyrics & Synced Karaoke"
                style={{ width: 38, height: 38 }}
              >
                <Mic size={20} color={showLyrics ? "var(--aura-primary, #1ed760)" : "#fff"} />
              </button>
            </div>
          </div>

          {/* Centerpiece Artwork, Audio Visualizer, or Synced Karaoke Lyrics */}
          {showLyrics ? (
            <div className="fs-lyrics-container">
              <h3>Karaoke & Synced Lyrics</h3>
              {loadingLyrics ? (
                <p className="lyrics-placeholder">Loading lyrics...</p>
              ) : parsedLyrics.length > 0 ? (
                <div className="lyrics-scroll">
                  {parsedLyrics.map((item, idx) => (
                    <p 
                      key={idx} 
                      id={`lyric-line-${idx}`}
                      className={`lyrics-line ${idx === activeLyricIndex ? 'active' : ''}`}
                      onClick={() => handleLyricClick(item.time)}
                      title={`Jump to ${formatTime(item.time)}`}
                    >
                      {item.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="lyrics-placeholder">Lyrics not available for this song.</p>
              )}
            </div>
          ) : (
            <div className="fs-art-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={hqImageUrl} alt={songTitle} className="fs-art" />
              {showVisualizer && (
                <div style={{ width: '100%', maxWidth: '380px', marginTop: '14px' }}>
                  <AudioVisualizer mode={visualizerMode} onToggleMode={cycleVisualizerMode} isVisible={true} />
                </div>
              )}
            </div>
          )}

          {/* Track Info & Quick Actions Row */}
          <div className="fs-track-info-row">
            <div className="fs-track-details">
              <h2>{songTitle}</h2>
              <p>{primaryArtist}</p>
            </div>
            
            <div className="fs-quick-actions">
              <button 
                className="fs-action-circle"
                onClick={() => handleShare(true)}
                title="Share Song Link at Current Timestamp"
              >
                <Share2 size={20} color="#fff" />
              </button>
              <button 
                className={`fs-action-circle ${isDownloaded ? 'active' : ''}`}
                onClick={() => handleDownloadToggle(currentSong)}
                title={isDownloaded ? "Downloaded offline (Tap to delete)" : isDownloading ? "Downloading offline..." : "Download offline"}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 size={20} className="animate-spin" color="var(--primary-color)" />
                ) : isDownloaded ? (
                  <CheckCircle2 size={20} color="var(--primary-color)" />
                ) : (
                  <Download size={20} color="#fff" />
                )}
              </button>
              <button 
                className={`fs-action-circle ${isFavorite ? 'active' : ''}`}
                onClick={() => toggleFavorite(currentSong)}
                title={isFavorite ? "Liked" : "Like"}
              >
                <Heart size={20} fill={isFavorite ? "var(--primary-color)" : "none"} color={isFavorite ? "var(--primary-color)" : "#fff"} />
              </button>
            </div>
          </div>

          {/* Progress Bar & Timers */}
          <div className="fs-progress-section">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={progress} 
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchEnd={handleSeekMouseUp}
              className="fs-progress-slider"
              style={{ '--progress': `${duration ? (progress / duration) * 100 : 0}%` }}
            />
            <div className="fs-time-labels">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Playback Controls Row */}
          <div className="fs-main-controls">
            <button className="fs-nav-btn" onClick={playPrev} title="Previous Track">
              <SkipBack size={32} fill="#fff" color="#fff" />
            </button>

            {/* Custom Scalloped Starburst White Badge Play/Pause Container */}
            <button 
              className="fs-scallop-play-btn" 
              onClick={togglePlay}
              title={isPlaying ? "Pause" : "Play"}
            >
              <svg className="scallop-svg" viewBox="0 0 100 100" fill="#ffffff">
                <path d="M50 0 C54 7, 62 7, 68 2 C74 8, 80 13, 87 13 C90 20, 97 26, 97 34 C99 42, 99 50, 97 58 C97 66, 90 72, 87 79 C80 79, 74 84, 68 90 C62 85, 54 85, 50 92 C46 85, 38 85, 32 90 C26 84, 20 79, 13 79 C10 72, 3 66, 3 58 C1 50, 1 42, 3 34 C3 26, 10 20, 13 13 C20 13, 26 8, 32 2 C38 7, 46 7, 50 0 Z" />
              </svg>
              <div className="scallop-icon-wrapper">
                {isPlaying ? (
                  <Pause size={30} fill="#121212" color="#121212" />
                ) : (
                  <Play size={30} fill="#121212" color="#121212" style={{ marginLeft: 4 }} />
                )}
              </div>
            </button>

            <button className="fs-nav-btn" onClick={playNext} title="Next Track">
              <SkipForward size={32} fill="#fff" color="#fff" />
            </button>
          </div>

          {/* Bottom Action Toolbar */}
          <div className="fs-toolbar-actions">
            <button className="fs-tool-btn" onClick={openQueueModal} title="Up Next Queue">
              <ListMusic size={22} color="#fff" />
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className={`fs-tool-btn ${sleepTimerMinutes > 0 ? 'active' : ''}`}
                onClick={() => { setShowSleepMenu(!showSleepMenu); setShowMoreMenu(false); }}
                title="Sleep Timer"
              >
                <Moon size={22} color={sleepTimerMinutes > 0 ? "var(--primary-color)" : "#fff"} />
                {sleepTimerMinutes > 0 && <span className="badge-dot">{sleepTimerMinutes}m</span>}
              </button>
              {showSleepMenu && (
                <div className="popover-menu">
                  <h4>Sleep Timer</h4>
                  {[0, 15, 30, 45, 60].map(mins => (
                    <button 
                      key={mins} 
                      className={sleepTimerMinutes === mins ? 'selected' : ''}
                      onClick={() => { setSleepTimer(mins); setShowSleepMenu(false); }}
                    >
                      {mins === 0 ? 'Off' : `${mins} minutes`}
                      {sleepTimerMinutes === mins && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Equalizer is hidden as it requires Web Audio API which is incompatible with YouTube Iframe cross-origin policies */}

            <button className="fs-tool-btn" onClick={toggleShuffle} title="Shuffle">
              <Shuffle size={22} color={isShuffling ? "var(--primary-color)" : "#fff"} />
            </button>

            <button className="fs-tool-btn" onClick={toggleLoop} title="Repeat">
              <Repeat size={22} color={isLooping ? "var(--primary-color)" : "#fff"} />
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="fs-tool-btn"
                onClick={() => { setShowMoreMenu(!showMoreMenu); setShowSleepMenu(false); }}
                title="More Options"
              >
                <MoreVertical size={22} color="#fff" />
              </button>
              {showMoreMenu && (
                <div className="popover-menu">
                  <button onClick={() => { handleShare(); setShowMoreMenu(false); }}>Share Song</button>
                  <button onClick={() => { toggleFavorite(currentSong); setShowMoreMenu(false); }}>
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* The global hidden YouTube player lives in PlayerContext — no duplicate ReactPlayer here */}
      {/* Local ReactPlayer is only needed to get progress callbacks from the global YT player */}
      {youtubeVideoId && (
        <ReactPlayer
          ref={ytPlayerRef}
          url={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          playing={isPlaying}
          volume={isMuted ? 0 : vol}
          progressInterval={100}
          onPlay={() => resumePlayback()}
          onPause={() => pause()}
          onError={(e) => handleYtPlayerError && handleYtPlayerError(e)}
          onProgress={({ playedSeconds }) => {
            if (!isSeekingRef.current) {
              setProgress(playedSeconds);
            }
            // Update MediaSession position state for lock screen progress bar
            if ('mediaSession' in navigator && duration > 0) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: duration,
                  playbackRate: 1,
                  position: Math.min(playedSeconds, duration)
                });
              } catch (e) {}
            }
          }}
          onDuration={(d) => {
            if (d && isFinite(d) && d > 0) {
              setDuration(d);
            }
          }}
          onEnded={playNext}
          width="1px"
          height="1px"
          style={{ position: 'fixed', bottom: '-1px', left: '-1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}
          config={{
            youtube: {
              playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1 }
            }
          }}
        />
      )}
    </>
  );
};

export default MusicPlayer;
