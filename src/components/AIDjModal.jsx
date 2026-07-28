import React, { useState } from 'react';
import { Sparkles, Play, X, Radio } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { searchSongs } from '../services/api';
import './QueueModal.css';

const MOODS = [
  { id: 'monsoon', name: 'Monsoon Chai & Rain Hits ☕🌧️', query: 'Monsoon Bollywood Songs' },
  { id: 'lofi', name: 'Late Night Lo-Fi Chill 🌙', query: 'Bollywood Lofi Chill' },
  { id: 'gym', name: 'High Energy Gym Workout 💪🔥', query: 'Punjabi Workout Hits' },
  { id: 'retro', name: 'Retro 90s Golden Romance 📻❤️', query: '90s Romantic Bollywood Hits' },
  { id: 'arijit', name: 'Arijit Singh Deep Emotions 💔', query: 'Arijit Singh Sad Hits' },
  { id: 'party', name: 'Punjabi & Commercial Party Hype 🎉🕺', query: 'Top Punjabi Party Hits' },
  { id: 'devotional', name: 'Devotional & Spiritual Peace 🙏✨', query: 'Bhakti Devotional Songs' }
];

const AIDjModal = ({ isOpen, onClose }) => {
  const { playSong } = usePlayer();
  const [loadingMood, setLoadingMood] = useState(null);

  if (!isOpen) return null;

  const handleSelectMood = async (mood) => {
    setLoadingMood(mood.id);
    try {
      const results = await searchSongs(mood.query);
      if (results && results.length > 0) {
        playSong(results[0], results);
        onClose();
      } else {
        alert("Failed to generate DJ radio. Please try another mood.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMood(null);
    }
  };

  return (
    <div className="queue-modal-overlay animate-fade-in" style={{ zIndex: 3000 }}>
      <div className="queue-modal-content" style={{ maxWidth: '520px', borderRadius: '24px', padding: '1.75rem' }}>
        <div className="queue-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <Sparkles size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Svar AI DJ Radio</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Infinite AI playlists tailored to your mood</p>
            </div>
          </div>
          <button className="queue-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {MOODS.map(mood => (
            <div 
              key={mood.id} 
              onClick={() => handleSelectMood(mood)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Radio size={20} color="#1ed760" />
                <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{mood.name}</span>
              </div>
              
              <button 
                style={{
                  background: 'linear-gradient(135deg, #1ed760, #16a34a)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                {loadingMood === mood.id ? (
                  <div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }}></div>
                ) : (
                  <Play size={16} fill="#fff" style={{ marginLeft: '2px' }} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIDjModal;
