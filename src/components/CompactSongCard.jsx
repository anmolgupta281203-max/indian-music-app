import React from 'react';
import { Play } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './CompactSongCard.css';

const CompactSongCard = ({ song, queueContext }) => {
  const { playSong, currentSong, isPlaying } = usePlayer();

  if (!song) return null;

  const isCurrentSong = currentSong?.id === song.id;

  const handlePlay = (e) => {
    e.stopPropagation();
    playSong(song, queueContext);
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

  return (
    <div className={`compact-song-card ${isCurrentSong ? 'active' : ''}`} onClick={handlePlay}>
      <img src={imageUrl} alt={songTitle} className="compact-img" />
      <div className="compact-info">
        <h4 dangerouslySetInnerHTML={{ __html: songTitle }}></h4>
      </div>
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
  );
};

export default CompactSongCard;
