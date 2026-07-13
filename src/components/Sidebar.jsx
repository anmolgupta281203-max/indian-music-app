import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, PlusSquare, Heart } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handlePlaylistClick = (query) => {
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
        <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Library size={24} />
          <span>Your Library</span>
        </NavLink>
      </nav>

      <div className="nav-actions">
        <button className="action-btn">
          <PlusSquare size={24} />
          <span>Create Playlist</span>
        </button>
        <NavLink to="/library" className="action-btn" style={{textDecoration: 'none'}}>
          <Heart size={24} className="heart-icon" />
          <span>Liked Songs</span>
        </NavLink>
      </div>
      
      <div className="divider"></div>
      
      <div className="playlists-list scrollable">
        <p className="playlist-item" onClick={() => handlePlaylistClick('Bollywood Hits')}>Bollywood Hits</p>
        <p className="playlist-item" onClick={() => handlePlaylistClick('Punjabi Lo-Fi')}>Punjabi Lo-Fi</p>
        <p className="playlist-item" onClick={() => handlePlaylistClick('90s Classics')}>90s Classics</p>
        <p className="playlist-item" onClick={() => handlePlaylistClick('Workout Mix')}>Workout Mix</p>
      </div>
    </div>
  );
};

export default Sidebar;
