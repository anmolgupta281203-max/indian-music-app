import React, { useState } from 'react';
import { User, LogOut, Settings, ExternalLink, Disc3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = ({ onToggleRetro, isRetroOpen }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="top-nav">
      <div className="top-right-group">
        <img src="/logo-sm.png" alt="Svar Logo" style={{ height: '32px', borderRadius: '4px' }} />
        <h2 className="app-name-header">Svar</h2>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button 
          onClick={onToggleRetro}
          className={`retro-nav-toggle-btn ${isRetroOpen ? 'active' : ''}`}
          title="Toggle 3D Retro MP3 Player"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isRetroOpen ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : 'rgba(255, 255, 255, 0.08)',
            border: isRetroOpen ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: isRetroOpen ? '0 0 16px rgba(168, 85, 247, 0.5)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Disc3 size={16} color={isRetroOpen ? "#bef264" : "currentColor"} />
          <span>Retro MP3</span>
        </button>
      </div>
    </div>
  );
};

export default TopNav;
