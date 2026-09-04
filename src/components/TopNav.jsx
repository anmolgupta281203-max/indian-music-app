import React, { useState } from 'react';
import { User, LogOut, Settings, ExternalLink, Disc3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = ({ onToggleRetro, isRetroOpen }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="top-nav">
      <div className="top-right-group">
        <img src="/logo-sm.png" alt="Svar Logo" className="app-logo-img" />
        <h2 className="app-name-header">Svar</h2>
      </div>

      <div className="top-nav-actions">
        <button 
          onClick={onToggleRetro}
          className={`retro-nav-toggle-btn ${isRetroOpen ? 'active' : ''}`}
          title="Toggle 3D Retro MP3 Player"
        >
          <Disc3 size={15} color={isRetroOpen ? "#bef264" : "currentColor"} className={isRetroOpen ? "spin-icon" : ""} />
          <span className="retro-btn-label">Retro MP3</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
