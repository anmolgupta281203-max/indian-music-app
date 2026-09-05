import React from 'react';
import { Play, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './CompactSongCard.css';

const CompactSongCard = ({ song, queueContext }) => {
  const { 
    playSong, 
    currentSong, 
    isPlaying,
    downloadedSongs,
    downloadingIds,
    handleDownloadToggle
  } = usePlayer();

  if (!song) return null;

  const isCurrentSong = currentSong?.id === song.id;
  const isDownloaded = downloadedSongs.some(s => s.id === song.id);
  const isDownloading = downloadingIds?.has(song.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, queueContext);
  };

  const getCardImage = () => {
    if (!song || !song.image) return 'https://via.placeholder.com/150';
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image) && song.image.length > 0) {
      // Use smallest image (50x50) for compact cards
      const small = song.image.length > 0 ? song.image[0] : song.image[song.image.length - 1];
      return typeof small === 'string' ? small : (small?.url || song.image[0]?.url || 'https://via.placeholder.com/150');
    }
    return 'https://via.placeholder.com/150';
  };

  const imageUrl = getCardImage();
  const songTitle = String(song.name || song.title || 'Untitled Song');

  return (
    <div className={`compact-song-card ${isCurrentSong ? 'active' : ''}`} onClick={handlePlay}>
      <img src={imageUrl} alt={songTitle} className="compact-img" loading="lazy" decoding="async" />
      <div className="compact-info">
        <h4 dangerouslySetInnerHTML={{ __html: songTitle }}></h4>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button 
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: isDownloaded ? 'var(--primary-color)' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center' }}
          onClick={(e) => { e.stopPropagation(); handleDownloadToggle(song); }}
          title={isDownloaded ? "Downloaded offline (Tap to delete)" : isDownloading ? "Downloading offline..." : "Download offline"}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 size={16} className="animate-spin" color="var(--primary-color)" />
          ) : isDownloaded ? (
            <CheckCircle2 size={16} color="var(--primary-color)" />
          ) : (
            <Download size={16} />
          )}
        </button>
        <button className="compact-play-btn">
          {isCurrentSong && isPlaying ? (
            <div className="playing-bars compact-bars">
              <span></span><span></span><span></span>
            </div>
          ) : (
            <Play size={18} fill="currentColor" color="white" />
          )}
        </button>
      </div>
    </div>
  );
};

export default React.memo(CompactSongCard);
