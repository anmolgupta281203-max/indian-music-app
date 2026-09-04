import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, 
  Disc3
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './RetroPlayerView.css';

const formatTime = (time) => {
  if (isNaN(time) || !isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const decodeHtml = (html) => {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

const RetroPlayerView = ({ isOpen, onClose }) => {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrev, 
    queue, 
    currentIndex,
    playSong,
    isShuffling,
    isLooping,
    toggleShuffle,
    toggleLoop,
    progress,
    duration,
    handleSeekChange,
    handleSeekMouseUp
  } = usePlayer();

  if (!currentSong) return null;

  const nextSong = queue && queue.length > 1 
    ? queue[(currentIndex + 1) % queue.length] 
    : null;

  const getSongImage = (song) => {
    if (!song || !song.image) return 'https://via.placeholder.com/300';
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image) && song.image.length > 0) {
      const best = song.image[song.image.length - 1];
      return typeof best === 'string' ? best : (best?.url || song.image[0]?.url || 'https://via.placeholder.com/300');
    }
    return 'https://via.placeholder.com/300';
  };

  const currentImg = getSongImage(currentSong);
  const nextImg = nextSong ? getSongImage(nextSong) : null;
  const songTitle = decodeHtml(currentSong.name || currentSong.title || 'Untitled Track');
  const artistName = decodeHtml(currentSong.primaryArtists || currentSong.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
  const nextTitle = nextSong ? decodeHtml(nextSong.name || nextSong.title || '') : '';
  const nextArtist = nextSong ? decodeHtml(nextSong.primaryArtists || '') : '';

  const encodedQuery = encodeURIComponent(`${songTitle} ${artistName}`);
  const spotifyUrl = `https://open.spotify.com/search/${encodedQuery}`;
  const appleMusicUrl = `https://music.apple.com/search?term=${encodedQuery}`;
  const ytMusicUrl = `https://music.youtube.com/search?q=${encodedQuery}`;

  return (
    <aside className={`retro-dock-container ${isOpen ? 'open' : ''}`}>
      {/* ═══ 3D RETRO HANDHELD MP3 PLAYER ═══ */}
      <div className="retro-mp3-casing">
        {/* Device Brand Header & Indicator LED */}
        <div className="retro-casing-header">
          <div className="retro-brand-tag">
            <Disc3 size={14} className={isPlaying ? "animate-spin-slow" : ""} />
            <span>SVAR DIGITAL AUDIO</span>
          </div>
          <div className="retro-led-container">
            <span className={`retro-led ${isPlaying ? 'active' : ''}`} title={isPlaying ? "Playing" : "Standby"}></span>
            <span className="retro-led-label">MP3 / 320K</span>
          </div>
        </div>

        {/* Retro Inset Screen */}
        <div className="retro-screen-bezel">
          <div className="retro-screen-glass"></div>
          <div className="retro-screen-art-container">
            <img 
              src={currentImg} 
              alt={songTitle} 
              className={`retro-screen-art ${isPlaying ? 'playing' : ''}`} 
            />
            {isPlaying && (
              <div className="retro-scanlines"></div>
            )}
          </div>
        </div>

        {/* Retro Track Meta */}
        <div className="retro-meta-section">
          <h3 className="retro-song-title" title={songTitle}>
            {songTitle}
          </h3>
          <p className="retro-song-artist" title={artistName}>
            {artistName}
          </p>
        </div>

        {/* High-Contrast Neon Scrubber */}
        <div className="retro-scrubber-section">
          <div className="retro-time-row">
            <span className="retro-time">{formatTime(progress)}</span>
            <span className="retro-time">{formatTime(duration)}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={progress} 
            onChange={handleSeekChange}
            onMouseUp={handleSeekMouseUp}
            onTouchEnd={handleSeekMouseUp}
            className="retro-progress-slider"
            style={{ '--progress': `${duration ? (progress / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Chunky Retro Hardware Buttons */}
        <div className="retro-controls-row">
          <button 
            className="retro-hw-btn" 
            onClick={playPrev} 
            title="Previous Track"
          >
            <SkipBack size={26} fill="#bef264" color="#bef264" />
          </button>

          <button 
            className="retro-hw-btn retro-play-btn" 
            onClick={togglePlay} 
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={30} fill="#bef264" color="#bef264" />
            ) : (
              <Play size={30} fill="#bef264" color="#bef264" style={{ marginLeft: 3 }} />
            )}
          </button>

          <button 
            className="retro-hw-btn" 
            onClick={playNext} 
            title="Next Track"
          >
            <SkipForward size={26} fill="#bef264" color="#bef264" />
          </button>
        </div>

        {/* Micro Toggle Switch Row */}
        <div className="retro-toggles-row">
          <button 
            className={`retro-toggle-btn ${isShuffling ? 'active' : ''}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={14} />
            <span>SHUF</span>
          </button>
          <button 
            className={`retro-toggle-btn ${isLooping ? 'active' : ''}`}
            onClick={toggleLoop}
            title="Repeat"
          >
            <Repeat size={14} />
            <span>RPT</span>
          </button>
        </div>
      </div>

      {/* ═══ UP NEXT FLOATING PILL CARD (Matching "Cities In Dust") ═══ */}
      {nextSong && (
        <div 
          className="retro-up-next-card"
          onClick={() => playSong(nextSong, queue)}
          title="Click to play next track"
        >
          <div className="up-next-art-wrapper">
            <img src={nextImg} alt={nextTitle} className="up-next-art" />
            <div className="up-next-wave-overlay">
              <span className="un-bar u1"></span>
              <span className="un-bar u2"></span>
              <span className="un-bar u3"></span>
            </div>
          </div>
          <div className="up-next-details">
            <span className="up-next-badge">UP NEXT</span>
            <h4 className="up-next-title" title={nextTitle}>{nextTitle}</h4>
            <p className="up-next-artist" title={nextArtist}>{nextArtist}</p>
          </div>
        </div>
      )}

      {/* ═══ STREAMING PLATFORM BADGES ═══ */}
      <div className="retro-platforms-container">
        <span className="platforms-header-label">STREAM ON PLATFORMS</span>
        <div className="platforms-pill-grid">
          <a 
            href={spotifyUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="platform-pill spotify"
            title="Listen on Spotify"
          >
            <span className="platform-dot spotify-dot"></span>
            <span>Spotify</span>
          </a>

          <a 
            href={appleMusicUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="platform-pill apple"
            title="Listen on Apple Music"
          >
            <span className="platform-dot apple-dot"></span>
            <span>Apple Music</span>
          </a>

          <a 
            href={ytMusicUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="platform-pill yt"
            title="Listen on YouTube Music"
          >
            <span className="platform-dot yt-dot"></span>
            <span>YouTube Music</span>
          </a>
        </div>
      </div>
    </aside>
  );
};

export default RetroPlayerView;
