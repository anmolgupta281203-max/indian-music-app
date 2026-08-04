import React from 'react';
import { Play, Heart, Download, ListPlus } from 'lucide-react';
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
    handleDownloadToggle, 
    addToQueue 
  } = usePlayer();

  if (!song) return null;

  const isCurrentSong = currentSong?.id === song.id;
  const isFavorite = favorites.some(s => s.id === song.id);

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
      const last = song.image[song.image.length - 1];
      return typeof last === 'string' ? last : (last?.url || song.image[0]?.url || 'https://via.placeholder.com/150');
    }
    return 'https://via.placeholder.com/150';
  };

  const imageUrl = getCardImage();
  const songTitle = String(song.name || song.title || 'Untitled Song');
  const artistName = String(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');

  return (
    <div className={`song-card ${isCurrentSong ? 'active' : ''}`} onClick={handlePlay}>
      <div className="img-container">
        <img src={imageUrl} alt={songTitle} />
        
        <button 
          className="download-btn" 
          onClick={(e) => { e.stopPropagation(); handleDownloadToggle(song); }}
          title="Download MP3"
        >
          <Download size={18} color="white" />
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

export default SongCard;
