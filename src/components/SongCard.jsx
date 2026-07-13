import React from 'react';
import { Play, Heart } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './SongCard.css';

const SongCard = ({ song, queueContext }) => {
  const { playSong, currentSong, isPlaying, favorites, toggleFavorite } = usePlayer();

  const isCurrentSong = currentSong?.id === song.id;
  const isFavorite = favorites.some(s => s.id === song.id);

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, queueContext);
  };

  const imageUrl = song.image ? song.image[song.image.length - 1].url : 'https://via.placeholder.com/150';

  return (
    <div className={`song-card ${isCurrentSong ? 'active' : ''}`} onClick={handlePlay}>
      <div className="img-container">
        <img src={imageUrl} alt={song.name} />
        <button 
          className="fav-btn" 
          onClick={(e) => { e.stopPropagation(); toggleFavorite(song); }}
        >
          <Heart size={20} fill={isFavorite ? "var(--primary-color)" : "none"} color={isFavorite ? "var(--primary-color)" : "white"} />
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
      <h4 dangerouslySetInnerHTML={{ __html: song.name }}></h4>
      <p dangerouslySetInnerHTML={{ __html: song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist' }}></p>
    </div>
  );
};

export default SongCard;
