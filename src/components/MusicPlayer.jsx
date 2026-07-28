import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, 
  Heart, Download, Share2, ChevronDown, ListMusic, Moon, SlidersHorizontal, MoreVertical, Check, Mic
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import ReactPlayer from 'react-player/youtube';
import './MusicPlayer.css';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
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
    playNext, 
    playPrev, 
    favorites, 
    toggleFavorite, 
    downloadedSongs, 
    handleDownloadToggle, 
    currentUrl, 
    openQueueModal, 
    nativeAudioRef, 
    isShuffling, 
    isLooping, 
    toggleShuffle, 
    toggleLoop,
    audioQuality,
    setAudioQuality,
    eqPreset,
    setEqPreset,
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
  
  // Popovers
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showEqMenu, setShowEqMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const playerRef = useRef(null);

  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!currentSong?.youtubeId) {
        setProgress(audio.currentTime || 0);
        setDuration(audio.duration || 0);
        
        if ('mediaSession' in navigator && !isNaN(audio.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate,
              position: audio.currentTime
            });
          } catch (e) {}
        }
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [currentSong, nativeAudioRef]);

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

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    setProgress(time);
    
    if (currentSong?.youtubeId && playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    } else if (nativeAudioRef.current) {
      nativeAudioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVol(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const handleShare = async () => {
    if (!currentSong) return;
    const songName = decodeHtml(currentSong.name);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Listen to ${songName} on Svar`,
          text: `Check out ${songName} on Svar Music App!`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (!currentSong) return null;

  const getPlayerImage = () => {
    if (!currentSong || !currentSong.image) return 'https://via.placeholder.com/60';
    if (typeof currentSong.image === 'string') return currentSong.image;
    if (Array.isArray(currentSong.image) && currentSong.image.length > 0) {
      const last = currentSong.image[currentSong.image.length - 1];
      return typeof last === 'string' ? last : (last?.url || currentSong.image[0]?.url || 'https://via.placeholder.com/60');
    }
    return 'https://via.placeholder.com/60';
  };
  const imageUrl = getPlayerImage();
  const hqImageUrl = imageUrl.replace('150x150', '500x500').replace('50x50', '500x500');
  const isFavorite = favorites.some(s => s.id === currentSong.id);
  const isDownloaded = downloadedSongs.some(s => s.id === currentSong.id);
  const primaryArtist = decodeHtml(currentSong.primaryArtists || currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
  const songTitle = decodeHtml(currentSong.name);

  // Format lyrics lines
  const lyricsLines = lyrics ? (typeof lyrics === 'string' ? lyrics.replace(/<br\s*[\/]?>/gi, '\n').split('\n') : []) : [];

  return (
    <>
      {/* --- Mini Bottom Player Bar --- */}
      <div className="music-player">
        <div className="now-playing" onClick={(e) => {
          if (e.target.closest('button')) return;
          setIsFullScreen(true);
        }} style={{cursor: 'pointer'}}>
          <img src={imageUrl} alt={songTitle} className="song-art" />
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
          {!currentSong.youtubeId && (
            <button 
              className="control-btn hide-on-mobile" 
              style={{marginLeft: '0.5rem'}} 
              onClick={() => handleDownloadToggle(currentSong)}
              title={isDownloaded ? "Remove from downloads" : "Download for offline playback"}
            >
              <Download size={20} color={isDownloaded ? "var(--primary-color)" : "var(--text-secondary)"} />
            </button>
          )}
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
              onChange={handleSeek}
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
            <button 
              className={`fs-action-circle ${showLyrics ? 'active' : ''}`} 
              onClick={() => setShowLyrics(!showLyrics)} 
              title="Lyrics & Karaoke"
              style={{ width: 38, height: 38 }}
            >
              <Mic size={20} color={showLyrics ? "#1ed760" : "#fff"} />
            </button>
          </div>

          {/* Centerpiece Artwork or Synced Lyrics */}
          {showLyrics ? (
            <div className="fs-lyrics-container">
              <h3>Karaoke & Lyrics</h3>
              {loadingLyrics ? (
                <p className="lyrics-placeholder">Loading lyrics...</p>
              ) : lyricsLines.length > 0 ? (
                <div className="lyrics-scroll">
                  {lyricsLines.map((line, idx) => (
                    <p key={idx} className="lyrics-line">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="lyrics-placeholder">Lyrics not available for this song.</p>
              )}
            </div>
          ) : (
            <div className="fs-art-container">
              <img src={hqImageUrl} alt={songTitle} className="fs-art" />
            </div>
          )}

          {/* Track Info & Quick Actions Row */}
          <div className="fs-track-info-row">
            <div className="fs-track-details">
              <h2>{songTitle}</h2>
              <p>{primaryArtist}</p>
            </div>
            
            <div className="fs-quick-actions">
              {!currentSong.youtubeId && (
                <button 
                  className={`fs-action-circle ${isDownloaded ? 'active' : ''}`}
                  onClick={() => handleDownloadToggle(currentSong)}
                  title={isDownloaded ? "Downloaded" : "Download"}
                >
                  <Download size={20} color={isDownloaded ? "#1ed760" : "#fff"} />
                </button>
              )}
              <button 
                className={`fs-action-circle ${isFavorite ? 'active' : ''}`}
                onClick={() => toggleFavorite(currentSong)}
                title={isFavorite ? "Liked" : "Like"}
              >
                <Heart size={20} fill={isFavorite ? "#1ed760" : "none"} color={isFavorite ? "#1ed760" : "#fff"} />
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
              onChange={handleSeek}
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
                onClick={() => { setShowSleepMenu(!showSleepMenu); setShowQualityMenu(false); setShowEqMenu(false); setShowMoreMenu(false); }}
                title="Sleep Timer"
              >
                <Moon size={22} color={sleepTimerMinutes > 0 ? "#1ed760" : "#fff"} />
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

            <div style={{ position: 'relative' }}>
              <button 
                className={`fs-tool-btn ${eqPreset !== 'flat' ? 'active' : ''}`}
                onClick={() => { setShowEqMenu(!showEqMenu); setShowSleepMenu(false); setShowQualityMenu(false); setShowMoreMenu(false); }}
                title="5-Band Equalizer"
              >
                <SlidersHorizontal size={22} color={eqPreset !== 'flat' ? "#1ed760" : "#fff"} />
              </button>
              {showEqMenu && (
                <div className="popover-menu">
                  <h4>5-Band Equalizer</h4>
                  {[
                    { id: 'flat', label: 'Flat (Default)' },
                    { id: 'bassBoost', label: 'Bass Boost 🎧' },
                    { id: 'vocalEnhancer', label: 'Vocal Enhancer' },
                    { id: 'bollywoodDance', label: 'Bollywood Dance 💃' },
                    { id: 'lofiChill', label: 'Lo-Fi Chill 🌙' },
                    { id: 'acoustic', label: 'Acoustic' }
                  ].map(eq => (
                    <button 
                      key={eq.id} 
                      className={eqPreset === eq.id ? 'selected' : ''}
                      onClick={() => { setEqPreset(eq.id); setShowEqMenu(false); }}
                    >
                      {eq.label}
                      {eqPreset === eq.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="fs-tool-btn" onClick={toggleShuffle} title="Shuffle">
              <Shuffle size={22} color={isShuffling ? "#1ed760" : "#fff"} />
            </button>

            <button className="fs-tool-btn" onClick={toggleLoop} title="Repeat">
              <Repeat size={22} color={isLooping ? "#1ed760" : "#fff"} />
            </button>

            <div style={{ position: 'relative' }}>
              <button 
                className="fs-tool-btn"
                onClick={() => { setShowMoreMenu(!showMoreMenu); setShowSleepMenu(false); setShowQualityMenu(false); setShowEqMenu(false); }}
                title="More Options"
              >
                <MoreVertical size={22} color="#fff" />
              </button>
              {showMoreMenu && (
                <div className="popover-menu">
                  <button onClick={() => { handleShare(); setShowMoreMenu(false); }}>Share Song</button>
                  <button onClick={() => { setShowQualityMenu(true); setShowMoreMenu(false); }}>Quality: {audioQuality}</button>
                  <button onClick={() => { toggleFavorite(currentSong); setShowMoreMenu(false); }}>
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* YouTube Stream Fallback */}
      <ReactPlayer
        ref={playerRef}
        url={(currentSong && currentSong.youtubeId && !currentUrl.startsWith('blob:')) ? currentUrl : ''}
        playing={isPlaying && currentSong && currentSong.youtubeId && !currentUrl.startsWith('blob:')}
        volume={isMuted ? 0 : vol}
        onProgress={({ playedSeconds }) => {
          if (currentSong?.youtubeId) setProgress(playedSeconds);
        }}
        onDuration={(d) => {
          if (currentSong?.youtubeId) setDuration(d);
        }}
        onEnded={playNext}
        width="200px"
        height="200px"
        style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
        config={{
          youtube: {
            playerVars: { showinfo: 0, autoplay: 1, playsinline: 1 }
          }
        }}
      />
    </>
  );
};

export default MusicPlayer;
