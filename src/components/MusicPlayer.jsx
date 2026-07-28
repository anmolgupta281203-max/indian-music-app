import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Heart, Download, Share2, ChevronDown, ListMusic } from 'lucide-react';
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
    toggleLoop 
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const playerRef = React.useRef(null);

  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!currentSong?.youtubeId) {
        setProgress(audio.currentTime);
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
    audio.addEventListener('ended', playNext);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', playNext);
    };
  }, [currentSong, playNext, nativeAudioRef]);

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

  const imageUrl = currentSong.image ? currentSong.image[currentSong.image.length - 1].url : 'https://via.placeholder.com/60';
  const hqImageUrl = imageUrl.replace('150x150', '500x500');
  const isFavorite = favorites.some(s => s.id === currentSong.id);
  const isDownloaded = downloadedSongs.some(s => s.id === currentSong.id);

  return (
    <>
      {/* --- Mini Player --- */}
      <div className="music-player">
        <div className="now-playing" onClick={(e) => {
          if (e.target.closest('button')) return;
          setIsFullScreen(true);
        }} style={{cursor: 'pointer'}}>
          <img src={imageUrl} alt={currentSong.name} className="song-art" />
          <div className="song-info">
            <h4 dangerouslySetInnerHTML={{ __html: currentSong.name }}></h4>
            <p dangerouslySetInnerHTML={{ __html: currentSong.primaryArtists || currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist' }}></p>
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
            onClick={handleShare}
            title="Share song"
          >
            <Share2 size={20} color="var(--text-secondary)" />
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
          <div className="fs-header">
            <button className="fs-close-btn" onClick={() => setIsFullScreen(false)}>
              <ChevronDown size={32} />
            </button>
            <span>Now Playing</span>
            <button className="control-btn" onClick={openQueueModal} title="View Queue">
              <ListMusic size={24} color="var(--primary-color)" />
            </button>
          </div>

          <div className="fs-art-container">
            <img src={hqImageUrl} alt={currentSong.name} className="fs-art" />
          </div>

          <div className="fs-song-details">
            <div className="fs-song-text">
              <h2 dangerouslySetInnerHTML={{ __html: currentSong.name }}></h2>
              <p dangerouslySetInnerHTML={{ __html: currentSong.primaryArtists || currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist' }}></p>
            </div>
            <button className="control-btn" onClick={() => toggleFavorite(currentSong)}>
              <Heart size={28} fill={isFavorite ? "var(--primary-color)" : "none"} color={isFavorite ? "var(--primary-color)" : "var(--text-secondary)"} />
            </button>
          </div>

          <div className="fs-progress">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              value={progress} 
              onChange={handleSeek}
              className="progress-bar fs-progress-bar"
              style={{ '--progress': `${duration ? (progress / duration) * 100 : 0}%` }}
            />
            <div className="fs-time-row">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="fs-controls">
            <button className="control-btn secondary" onClick={toggleShuffle}><Shuffle size={24} color={isShuffling ? "var(--primary-color)" : "currentColor"} /></button>
            <button className="control-btn" onClick={playPrev}><SkipBack size={40} fill="currentColor" /></button>
            <button className="fs-play-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" style={{ marginLeft: 6 }} />}
            </button>
            <button className="control-btn" onClick={playNext}><SkipForward size={40} fill="currentColor" /></button>
            <button className="control-btn secondary" onClick={toggleLoop}><Repeat size={24} color={isLooping ? "var(--primary-color)" : "currentColor"} /></button>
          </div>
          
          <div className="fs-bottom-actions">
            <button className="control-btn" onClick={handleShare} title="Share">
              <Share2 size={24} color="var(--text-secondary)" />
            </button>
            <button className="control-btn" onClick={openQueueModal} title="Up Next Queue">
              <ListMusic size={24} color="var(--primary-color)" />
            </button>
            {!currentSong.youtubeId && (
              <button className="control-btn" onClick={() => handleDownloadToggle(currentSong)} title="Download">
                <Download size={24} color={isDownloaded ? "var(--primary-color)" : "var(--text-secondary)"} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* YouTube Fallback */}
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
