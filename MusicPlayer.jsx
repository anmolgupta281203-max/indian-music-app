import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Heart, Download } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import ReactPlayer from 'react-player';
import './MusicPlayer.css';

const formatTime = (time) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const MusicPlayer = () => {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev, favorites, toggleFavorite, downloadedSongs, handleDownloadToggle, currentUrl } = usePlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = React.useRef(null);
  const nativeAudioRef = React.useRef(null);

  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      // Only update progress if playing from native audio
      if (!currentSong?.youtubeId) {
        setProgress(audio.currentTime);
        setDuration(audio.duration || 0);
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
  }, [currentSong, playNext]);

  useEffect(() => {
    // Sync native audio playback state
    if (nativeAudioRef.current && currentSong && !currentSong.youtubeId) {
      if (isPlaying) {
        nativeAudioRef.current.play().catch(e => console.error("Native play error:", e));
      } else {
        nativeAudioRef.current.pause();
      }
    }
  }, [isPlaying, currentUrl, currentSong]);

  useEffect(() => {
    // Sync volume
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = isMuted ? 0 : vol;
    }
  }, [isMuted, vol]);

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

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!currentSong) return null;

  // Extract highest quality image
  const imageUrl = currentSong.image ? currentSong.image[currentSong.image.length - 1].url : 'https://via.placeholder.com/60';

  const isFavorite = favorites.some(s => s.id === currentSong.id);
  const isDownloaded = downloadedSongs.some(s => s.id === currentSong.id);

  return (
    <div className="music-player">
      <div className="now-playing">
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
          onClick={() => handleDownloadToggle(currentSong)}
          title={isDownloaded ? "Remove from downloads" : "Download for offline playback"}
        >
          <Download size={20} color={isDownloaded ? "var(--primary-color)" : "var(--text-secondary)"} />
        </button>
      </div>

      <div className="player-controls-container">
        <div className="player-buttons">
          <button className="control-btn secondary"><Shuffle size={18} /></button>
          <button className="control-btn" onClick={playPrev}><SkipBack size={24} /></button>
          <button className="control-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button className="control-btn" onClick={playNext}><SkipForward size={24} /></button>
          <button className="control-btn secondary"><Repeat size={18} /></button>
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

      {/* Hidden Native Audio for JioSaavn / Offline */}
      <audio 
        ref={nativeAudioRef} 
        src={(!currentSong || currentSong.youtubeId) ? '' : currentUrl} 
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} 
      />

      {/* Hidden ReactPlayer for YouTube Fallback */}
      <ReactPlayer
        ref={playerRef}
        url={(currentSong && currentSong.youtubeId) ? currentUrl : ''}
        playing={isPlaying && currentSong && currentSong.youtubeId}
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
    </div>
  );
};

export default MusicPlayer;
