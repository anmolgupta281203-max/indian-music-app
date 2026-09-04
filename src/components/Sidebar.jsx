import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Film, Library, Sparkles, Heart } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ onOpenAiDj }) => {
  return (
    <nav className="nav-rail">
      <div className="nav-rail-group">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-rail-item active md-ripple' : 'nav-rail-item md-ripple'}>
          <div className="nav-rail-icon"><Home size={24} /></div>
          <span>Home</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-rail-item active md-ripple' : 'nav-rail-item md-ripple'}>
          <div className="nav-rail-icon"><Search size={24} /></div>
          <span>Search</span>
        </NavLink>
        <NavLink to="/videos" className={({ isActive }) => isActive ? 'nav-rail-item active md-ripple' : 'nav-rail-item md-ripple'}>
          <div className="nav-rail-icon"><Film size={24} /></div>
          <span>Movies</span>
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-rail-item active md-ripple' : 'nav-rail-item md-ripple'}>
          <div className="nav-rail-icon"><Library size={24} /></div>
          <span>Library</span>
        </NavLink>
      </div>

      <div className="nav-rail-group nav-rail-bottom">
        <button className="nav-rail-item md-ripple" onClick={onOpenAiDj}>
          <div className="nav-rail-icon ai-dj-icon"><Sparkles size={24} /></div>
          <span>AI DJ</span>
        </button>
        <NavLink to="/library" className={({ isActive }) => isActive ? 'nav-rail-item active md-ripple' : 'nav-rail-item md-ripple'}>
          <div className="nav-rail-icon liked-icon"><Heart size={24} /></div>
          <span>Liked</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Sidebar;
