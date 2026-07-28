import React, { useState } from 'react';
import './CategoryNav.css';
import { ChevronDown } from 'lucide-react';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' }
];

const CATEGORIES = [
  { id: 'movie', name: 'Movies' },
  { id: 'tv', name: 'TV Shows' },
  { id: 'anime', name: 'Anime' }
];

const OTT_PLATFORMS = [
  { id: 213, name: 'Netflix' },
  { id: 1024, name: 'Amazon Prime' },
  { id: 122, name: 'Hotstar' },
  { id: 119, name: 'SonyLIV' },
  { id: 232, name: 'Zee5' }
];

const CategoryNav = ({ activeFilter, onFilterChange }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (menuName) => {
    if (openDropdown === menuName) setOpenDropdown(null);
    else setOpenDropdown(menuName);
  };

  const handleSelect = (type, value, name) => {
    onFilterChange({ type, value, name });
    setOpenDropdown(null);
  };

  return (
    <div className="category-nav-container">
      <ul className="category-nav-list">
        <li 
          className={`nav-item ${activeFilter?.type === 'home' || !activeFilter ? 'active-red' : ''}`}
          onClick={() => handleSelect('home', null, 'Home')}
        >
          Home
        </li>

        {/* Genre Dropdown */}
        <li className={`nav-item dropdown-toggle ${openDropdown === 'genre' || activeFilter?.type === 'genre' ? 'active-text' : ''}`} onClick={() => toggleDropdown('genre')}>
          Genre <ChevronDown size={14} />
          {openDropdown === 'genre' && (
            <ul className="dropdown-menu">
              {GENRES.map(g => (
                <li key={g.id} onClick={(e) => { e.stopPropagation(); handleSelect('genre', g.id, g.name); }}>{g.name}</li>
              ))}
            </ul>
          )}
        </li>

        {/* Category Dropdown */}
        <li className={`nav-item dropdown-toggle ${openDropdown === 'category' || activeFilter?.type === 'category' ? 'active-text' : ''}`} onClick={() => toggleDropdown('category')}>
          Category <ChevronDown size={14} />
          {openDropdown === 'category' && (
            <ul className="dropdown-menu">
              {CATEGORIES.map(c => (
                <li key={c.id} onClick={(e) => { e.stopPropagation(); handleSelect('category', c.id, c.name); }}>{c.name}</li>
              ))}
            </ul>
          )}
        </li>

        {/* OTT Dropdown */}
        <li className={`nav-item dropdown-toggle ${openDropdown === 'ott' || activeFilter?.type === 'ott' ? 'active-text' : ''}`} onClick={() => toggleDropdown('ott')}>
          OTT <ChevronDown size={14} />
          {openDropdown === 'ott' && (
            <ul className="dropdown-menu">
              {OTT_PLATFORMS.map(o => (
                <li key={o.id} onClick={(e) => { e.stopPropagation(); handleSelect('ott', o.id, o.name); }}>{o.name}</li>
              ))}
            </ul>
          )}
        </li>

        <li 
          className={`nav-item ${activeFilter?.type === 'genz' ? 'active-text' : ''}`}
          onClick={() => handleSelect('genz', 'animation', 'Gen Z')}
        >
          Gen Z <ChevronDown size={14} />
        </li>

        <li 
          className={`nav-item ${activeFilter?.type === 'collection' ? 'active-text' : ''}`}
          onClick={() => handleSelect('collection', 'popular', 'Collection')}
        >
          Collection <ChevronDown size={14} />
        </li>
      </ul>
    </div>
  );
};

export default CategoryNav;
