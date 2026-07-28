import React, { useState } from 'react';
import { User, LogOut, Settings, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = () => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="top-nav">
      <div className="top-right-group">
        <img src="/logo-sm.png" alt="Svar Logo" style={{ height: '32px', borderRadius: '4px' }} />
        <h2 className="app-name-header">Svar</h2>
      </div>
    </div>
  );
};

export default TopNav;
