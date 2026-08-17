import React, { useState } from 'react';
import { X, Smartphone, Server, Loader2 } from 'lucide-react';
import './DownloadOptionsModal.css';

const DownloadOptionsModal = ({ song, isOpen, onClose, onDownloadInApp, onDownloadToDevice }) => {
  const [isDownloadingToDevice, setIsDownloadingToDevice] = useState(false);

  if (!isOpen || !song) return null;

  const handleDeviceDownload = async () => {
    setIsDownloadingToDevice(true);
    try {
      await onDownloadToDevice(song);
    } catch (error) {
      console.error("Failed to download to device", error);
      alert("Failed to download file. It might be restricted by CORS or the network.");
    } finally {
      setIsDownloadingToDevice(false);
      onClose();
    }
  };

  const handleInAppDownload = () => {
    onDownloadInApp(song);
    onClose();
  };

  const songTitle = String(song.name || song.title || 'Untitled Song').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

  return (
    <div className="download-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="download-modal-content" onClick={e => e.stopPropagation()}>
        <div className="download-modal-header">
          <h3>Download Options</h3>
          <button className="download-modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <p className="download-song-title">{songTitle}</p>
        
        <div className="download-options-list">
          <button className="download-option-btn" onClick={handleInAppDownload}>
            <div className="option-icon in-app">
              <Server size={24} />
            </div>
            <div className="option-text">
              <h4>Save to App Library</h4>
              <p>Play offline inside the Svār app</p>
            </div>
          </button>
          
          <button 
            className="download-option-btn" 
            onClick={handleDeviceDownload}
            disabled={isDownloadingToDevice}
          >
            <div className="option-icon device">
              {isDownloadingToDevice ? <Loader2 size={24} className="spin" /> : <Smartphone size={24} />}
            </div>
            <div className="option-text">
              <h4>Download to Device</h4>
              <p>Save audio file to your phone/computer</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadOptionsModal;
