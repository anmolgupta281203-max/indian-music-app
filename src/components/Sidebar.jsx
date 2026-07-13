import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, PlusSquare, Heart, User, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const { currentUser, setIsAuthModalOpen, logout } = React.useContext(AuthContext);

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

      <div className="divider"></div>

      <div className="mt-auto pt-4 pb-4 px-2">
        {currentUser ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-semibold truncate text-sm">
                {currentUser.username}
              </span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-red-400/10"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold transition-all shadow-lg hover:shadow-purple-500/25"
          >
            <User size={20} />
            <span>Log In</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
