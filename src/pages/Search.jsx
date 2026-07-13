import React, { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchSongs, searchArtists } from '../services/api';
import SongCard from '../components/SongCard';
import './Search.css';
import './Home.css'; // For .cards-grid and .album-card shared styles

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState('songs');

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (query.trim()) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        let data = await searchSongs(query);
        
        // Aggressively filter out duplicate song names
        if (data && Array.isArray(data)) {
          const seen = new Set();
          data = data.filter(song => {
            if (!song || !song.name) return false;
            // Decode HTML entities and normalize string
            const rawName = song.name.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
            const key = rawName.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        
        setResults(data || []);
        setHasSearched(true);
        setLoading(false);
      } else {
        setResults([]);
        setHasSearched(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="search-container animate-fade-in">
      <div className="search-header">
        <div className="search-bar glass">
          <SearchIcon size={24} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search for Indian songs or podcasts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="search-results">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        )}
        
        {!loading && hasSearched && results.length === 0 && (
          <div className="empty-state">
            <h3>No results found for "{query}"</h3>
            <p>Please make sure your words are spelled correctly or use less or different keywords.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <h2>Top Results</h2>
            <div className="cards-grid">
              {results.map(item => (
                <SongCard key={item.id} song={item} queueContext={results} />
              ))}
            </div>
          </>
        )}
        
        {!hasSearched && !loading && (
          <div className="browse-all">
            <h2>Browse All</h2>
            <div className="genre-grid">
              {['Bollywood', 'Punjabi', 'Tamil', 'Telugu', 'Bhojpuri', 'Devotional', 'Pop', 'Indie'].map(genre => (
                <div 
                  key={genre} 
                  className="genre-card" 
                  style={{backgroundColor: `hsl(${Math.random() * 360}, 70%, 30%)`, cursor: 'pointer'}}
                  onClick={() => setQuery(genre + ' Hits')}
                >
                  <h3>{genre}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
