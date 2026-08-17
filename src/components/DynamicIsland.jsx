import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { getImageUrl } from '../services/tmdbApi';
import './DynamicIsland.css';

const DynamicIsland = () => {
  const { currentSong, isPlaying, togglePlay, playNext, playPrev } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);

  // Auto-hide when no song is active
  useEffect(() => {
    if (currentSong) {
      setVisible(true);
    } else {
      setVisible(false);
      setExpanded(false);
    }
  }, [currentSong]);

  if (!visible || !currentSong) return null;

  const imageUrl = getImageUrl(currentSong.image || currentSong.image_url, 'w500');
  const songTitle = currentSong.name || currentSong.title;
  const artist = currentSong.primaryArtists || currentSong.artist || 'Unknown Artist';

  return (
    <div className="dynamic-island-container">
      <div 
        className={`dynamic-island ${expanded ? 'expanded' : ''} ${isPlaying ? 'playing' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Idle State / Compact View */}
        <div className="island-compact">
          <div className="island-art-wrapper">
            <img src={imageUrl} alt={songTitle} className={`island-art ${isPlaying ? 'spin' : ''}`} />
          </div>
          <div className="island-waveform">
            <span className={`bar ${isPlaying ? 'anim' : ''}`} style={{animationDelay: '0s'}}></span>
            <span className={`bar ${isPlaying ? 'anim' : ''}`} style={{animationDelay: '0.2s'}}></span>
            <span className={`bar ${isPlaying ? 'anim' : ''}`} style={{animationDelay: '0.4s'}}></span>
            <span className={`bar ${isPlaying ? 'anim' : ''}`} style={{animationDelay: '0.1s'}}></span>
          </div>
        </div>

        {/* Expanded State View */}
        <div className="island-expanded-content">
          <div className="expanded-info">
            <div className="expanded-art">
              <img src={imageUrl} alt={songTitle} />
            </div>
            <div className="expanded-text">
              <div className="expanded-title">{songTitle}</div>
              <div className="expanded-artist">{artist}</div>
            </div>
          </div>
          
          <div className="expanded-controls" onClick={e => e.stopPropagation()}>
            <button className="island-btn" onClick={playPrev}>
              <SkipBack size={20} fill="white" />
            </button>
            <button className="island-btn play" onClick={togglePlay}>
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            <button className="island-btn" onClick={playNext}>
              <SkipForward size={20} fill="white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicIsland;
