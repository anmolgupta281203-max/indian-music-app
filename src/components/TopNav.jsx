import React, { useState } from 'react';
import { User, LogOut, Settings, ExternalLink } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './TopNav.css';

const TopNav = () => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="top-nav">
      <div style={{flex: 1}}></div>
      <div className="top-right-group">
        <h2 className="app-name-header">Svar</h2>
        <div className="profile-container">
          <button 
            className={`profile-btn ${profileOpen ? 'active' : ''}`}
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <User size={18} />
          </button>
          
          {profileOpen && (
            <div className="profile-dropdown animate-fade-in">
              <ul>
                <li onClick={() => { alert('Account page coming soon!'); setProfileOpen(false); }}>
                  <ExternalLink size={16} /> Account
                </li>
                <li onClick={() => { alert('Settings coming soon!'); setProfileOpen(false); }}>
                  <Settings size={16} /> Settings
                </li>
                <li className="divider"></li>
                <li onClick={() => { alert('Logout functionality coming soon!'); setProfileOpen(false); }}>
                  <LogOut size={16} /> Log out
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopNav;
