import React from 'react';
import { X, Play, Trash2, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './QueueModal.css';

const decodeHtml = (html) => {
  if (!html) return '';
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const QueueModal = () => {
  const { 
    queue, 
    currentSong, 
    currentIndex, 
    isQueueModalOpen, 
    closeQueueModal, 
    playSongAt, 
    removeFromQueue, 
    clearQueue 
  } = usePlayer();

  if (!isQueueModalOpen) return null;

  return (
    <div className="queue-modal-overlay" onClick={closeQueueModal}>
      <div className="queue-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="queue-header">
          <div className="queue-title-row">
            <ListMusic size={24} className="queue-icon" />
            <h2>Play Queue</h2>
            <span className="queue-count">{queue.length} songs</span>
          </div>
          <div className="queue-actions">
            {queue.length > 0 && (
              <button className="clear-queue-btn" onClick={clearQueue} title="Clear Queue">
                <Trash2 size={18} /> Clear
              </button>
            )}
            <button className="close-modal-btn" onClick={closeQueueModal} title="Close Queue">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="queue-list-content scrollable">
          {queue.length === 0 ? (
            <div className="empty-queue">
              <p>Your queue is empty.</p>
              <span>Add songs from search or home to listen next!</span>
            </div>
          ) : (
            queue.map((song, index) => {
              const isPlayingNow = song.id === currentSong?.id && index === currentIndex;
              const imageUrl = typeof song.image === 'string'
                ? song.image
                : (song.image?.[0]?.url || song.image?.[0]?.link || 'https://via.placeholder.com/60');

              return (
                <div 
                  key={`${song.id}-${index}`} 
                  className={`queue-item ${isPlayingNow ? 'active' : ''}`}
                  onClick={() => playSongAt(index)}
                >
                  <span className="queue-index">
                    {isPlayingNow ? <Play size={14} fill="var(--primary-color)" color="var(--primary-color)" /> : index + 1}
                  </span>
                  
                  <img src={imageUrl} alt={song.name} className="queue-thumb" />
                  
                  <div className="queue-info">
                    <h4 dangerouslySetInnerHTML={{ __html: song.name }}></h4>
                    <p dangerouslySetInnerHTML={{ __html: song.primaryArtists || 'Unknown Artist' }}></p>
                  </div>

                  <button 
                    className="remove-queue-item-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                    }}
                    title="Remove from queue"
                  >
                    <X size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueModal;
