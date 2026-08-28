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

        {/* Language Dropdown */}
        <li className={`nav-item dropdown-toggle ${openDropdown === 'language' || activeFilter?.type === 'language' ? 'active-text' : ''}`} onClick={() => toggleDropdown('language')}>
          Language <ChevronDown size={14} />
          {openDropdown === 'language' && (
            <ul className="dropdown-menu">
              <li onClick={(e) => { e.stopPropagation(); handleSelect('language', 'hi', '🇮🇳 Hindi (हिंदी / Dubbed)'); }}>
                🇮🇳 Hindi (हिंदी / Dubbed)
              </li>
              <li onClick={(e) => { e.stopPropagation(); handleSelect('language', 'en', '🌐 English (Original)'); }}>
                🌐 English (Original)
              </li>
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
          className={`nav-item ${activeFilter?.type === 'language' && activeFilter?.value === 'hi' ? 'active-red' : ''}`}
          onClick={() => handleSelect('language', 'hi', 'Hindi Movies & Web Series')}
        >
          🇮🇳 Hindi
        </li>

        <li 
          className={`nav-item ${activeFilter?.type === 'language' && activeFilter?.value === 'en' ? 'active-red' : ''}`}
          onClick={() => handleSelect('language', 'en', 'English Movies & Web Series')}
        >
          🌐 English
        </li>

        <li 
          className={`nav-item ${activeFilter?.type === 'genz' ? 'active-text' : ''}`}
          onClick={() => handleSelect('genz', 'animation', 'Anime & Gen Z')}
        >
          Anime / Gen Z
        </li>
      </ul>
    </div>
  );
};

export default CategoryNav;
