import React from 'react';
import { Play, Heart, Download, ListPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './SongCard.css';

const SongCard = ({ song, queueContext }) => {
  const { 
    playSong, 
    currentSong, 
    isPlaying, 
    favorites, 
    toggleFavorite, 
    downloadedSongs, 
    downloadingIds,
    handleDownloadToggle, 
    addToQueue 
  } = usePlayer();

  if (!song) return null;

  const isCurrentSong = currentSong?.id === song.id;
  const isFavorite = favorites.some(s => s.id === song.id);
  const isDownloaded = downloadedSongs.some(s => s.id === song.id);
  const isDownloading = downloadingIds?.has(song.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, queueContext);
  };

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    addToQueue(song);
  };

  const getCardImage = () => {
    if (!song || !song.image) return 'https://via.placeholder.com/150';
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image) && song.image.length > 0) {
      // Use 150x150 (index 1) instead of 500x500 (last) for performance
      const mid = song.image.length > 1 ? song.image[1] : song.image[0];
      return typeof mid === 'string' ? mid : (mid?.url || song.image[0]?.url || 'https://via.placeholder.com/150');
    }
    return 'https://via.placeholder.com/150';
  };

  const imageUrl = getCardImage();
  const songTitle = String(song.name || song.title || 'Untitled Song');
  const artistName = String(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');

  return (
    <div className={`song-card ${isCurrentSong ? 'active' : ''}`} onClick={handlePlay}>
      <div className="img-container">
        <img src={imageUrl} alt={songTitle} loading="lazy" decoding="async" />
        
        <button 
          className={`download-btn ${isDownloaded ? 'downloaded' : ''}`} 
          onClick={(e) => { e.stopPropagation(); handleDownloadToggle(song); }}
          title={isDownloaded ? "Downloaded offline (Tap to delete)" : isDownloading ? "Downloading..." : "Download offline"}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 size={18} className="animate-spin" color="var(--primary-color)" />
          ) : isDownloaded ? (
            <CheckCircle2 size={18} color="var(--primary-color)" />
          ) : (
            <Download size={18} color="white" />
          )}
        </button>

        <button 
          className="fav-btn" 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(song); }}
          title={isFavorite ? "Remove from liked" : "Add to liked"}
        >
          <Heart size={20} fill={isFavorite ? "var(--primary-color)" : "none"} color={isFavorite ? "var(--primary-color)" : "white"} />
        </button>

        <button 
          className="playlist-btn" 
          onClick={handleAddToQueue}
          title="Add to Up Next Queue"
        >
          <ListPlus size={20} color="white" />
        </button>

        <button className="play-overlay">
          {isCurrentSong && isPlaying ? (
            <div className="playing-bars">
              <span></span><span></span><span></span>
            </div>
          ) : (
            <Play size={24} fill="currentColor" />
          )}
        </button>
      </div>
      <h4 dangerouslySetInnerHTML={{ __html: songTitle }}></h4>
      <p dangerouslySetInnerHTML={{ __html: artistName }}></p>
    </div>
  );
};

export default React.memo(SongCard);
