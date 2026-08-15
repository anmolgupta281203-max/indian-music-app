import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, ListMusic, Heart, Film, Sparkles, Crown } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import './Sidebar.css';

const Sidebar = ({ onOpenAiDj, onOpenPaywall }) => {
  const navigate = useNavigate();
  const { openQueueModal, queue } = usePlayer();

  const handleCategoryClick = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="sidebar">
      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Search size={24} />
          <span>Search</span>
        </NavLink>
        <NavLink to="/videos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Film size={24} />
          <span>Movies & Videos</span>
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Library size={24} />
          <span>Your Library</span>
        </NavLink>
      </nav>

      <div className="nav-actions">
        <button className="action-btn" onClick={onOpenAiDj} style={{ background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', marginBottom: '6px' }}>
          <Sparkles size={22} style={{ color: '#c084fc' }} />
          <span style={{ color: '#c084fc', fontWeight: '700' }}>AI DJ & Mood Radio</span>
        </button>
        <button className="action-btn" onClick={openQueueModal}>
          <ListMusic size={24} style={{ color: 'var(--primary-color)' }} />
          <span>Up Next Queue ({queue.length})</span>
        </button>
        <NavLink to="/library" className="action-btn" style={{textDecoration: 'none'}}>
          <Heart size={24} className="heart-icon" />
          <span>Liked Songs</span>
        </NavLink>
        <button className="action-btn" onClick={onOpenPaywall} style={{ background: 'rgba(236, 72, 153, 0.15)', borderRadius: '8px', marginTop: '6px' }}>
          <Crown size={24} style={{ color: '#ec4899' }} />
          <span style={{ color: '#ec4899', fontWeight: '700' }}>Upgrade Plan</span>
        </button>
      </div>
      
      <div className="divider"></div>
      
      <div className="categories-list scrollable">
        <p className="category-item" onClick={() => handleCategoryClick('Bollywood Hits')}>Bollywood Hits</p>
        <p className="category-item" onClick={() => handleCategoryClick('Punjabi Lo-Fi')}>Punjabi Lo-Fi</p>
        <p className="category-item" onClick={() => handleCategoryClick('90s Classics')}>90s Classics</p>
        <p className="category-item" onClick={() => handleCategoryClick('Workout Mix')}>Workout Mix</p>
      </div>

      <div className="divider"></div>
    </div>
  );
};

export default Sidebar;
