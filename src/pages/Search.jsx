import React, { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchSongs, searchArtists } from '../services/api';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';
import SongCard from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';
import './Search.css';
import './Home.css'; // For .cards-grid and .album-card shared styles

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pause } = usePlayer();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [ytResults, setYtResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
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
        if (searchMode === 'songs') {
          let data = await searchSongs(query);
          
          if (data && Array.isArray(data)) {
            const seen = new Set();
            data = data.filter(song => {
              if (!song || !song.id) return false;
              if (seen.has(song.id)) return false;
              seen.add(song.id);
              return true;
            });
          }
          
          setResults(data || []);
          setYtResults([]);
        } else if (searchMode === 'videos') {
          // Search YouTube directly from client to bypass Vercel IP blocks
          let foundVideos = [];
          
          try {
            // First try our backend (which tries yt-search)
            const ytRes = await axios.get(`/api/yt-search?q=${encodeURIComponent(query)}`);
            if (ytRes && ytRes.data && ytRes.data.results && ytRes.data.results.length > 0) {
              foundVideos = ytRes.data.results;
            }
          } catch (e) {
            console.warn('Backend YT search failed, trying client-side fallback...');
          }

          if (foundVideos.length === 0) {
            // Fallback to client-side Invidious API
            const instances = [
              'https://iv.melmac.space',
              'https://invidious.jing.rocks',
              'https://vid.puffyan.us',
              'https://invidious.nerdvpn.de'
            ];
            
            for (const url of instances) {
              try {
                const invRes = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { timeout: 5000 });
                if (invRes.data && Array.isArray(invRes.data) && invRes.data.length > 0) {
                  foundVideos = invRes.data.map(v => {
                    const m = Math.floor((v.lengthSeconds || 0) / 60);
                    const s = (v.lengthSeconds || 0) % 60;
                    let bestThumb = 'https://via.placeholder.com/320x180';
                    if (v.videoThumbnails && v.videoThumbnails.length > 0) {
                      const targetThumb = v.videoThumbnails.find(t => t.quality === 'medium' || t.quality === 'high' || t.quality === 'maxresdefault');
                      bestThumb = targetThumb ? targetThumb.url : v.videoThumbnails[0].url;
                    }
                    return {
                      videoId: v.videoId,
                      title: v.title,
                      author: { name: v.author },
                      thumbnail: bestThumb,
                      timestamp: `${m}:${s < 10 ? '0' : ''}${s}`
                    };
                  });
                  break; // stop trying if success
                }
              } catch (e) {
                console.warn(`Client-side Invidious ${url} failed:`, e.message);
              }
            }
          }
          
          setYtResults(foundVideos);
          setResults([]);
        }
        
        setHasSearched(true);
        setLoading(false);
      } else {
        setResults([]);
        setYtResults([]);
        setHasSearched(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchMode]);

  const handleVideoEnd = () => {
    if (ytResults && ytResults.length > 1 && selectedVideo) {
      const available = ytResults.filter(v => v.videoId !== selectedVideo.id);
      if (available.length > 0) {
        const nextVideo = available[Math.floor(Math.random() * available.length)];
        setSelectedVideo({ ...nextVideo, id: nextVideo.videoId, type: 'youtube' });
        return;
      }
    }
    // fallback to close if no other videos
    setSelectedVideo(null);
  };

  return (
    <div className="search-container animate-fade-in">
      <div className="search-header">
        <div className="search-bar glass">
          <SearchIcon size={24} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search for Indian songs, artists, or web series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        
        <div className="search-tabs" style={{display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap'}}>
          <button 
            className={`tab-btn ${searchMode === 'songs' ? 'active' : ''}`}
            onClick={() => setSearchMode('songs')}
            style={{padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', background: searchMode === 'songs' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Audio Songs
          </button>
          <button 
            className={`tab-btn ${searchMode === 'videos' ? 'active' : ''}`}
            onClick={() => setSearchMode('videos')}
            style={{padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', background: searchMode === 'videos' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Video Music (YouTube)
          </button>
        </div>
      </div>

      <div className="search-results">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        )}
        
        {!loading && hasSearched && results.length === 0 && ytResults.length === 0 && (
          <div className="empty-state">
            <h3>No results found for "{query}"</h3>
            <p>Please make sure your words are spelled correctly or use less or different keywords.</p>
          </div>
        )}

        {!loading && searchMode === 'songs' && results.length > 0 && (
          <>
            <h2>Top Audio Results</h2>
            <div className="cards-grid">
              {results.map(item => (
                <SongCard key={item.id} song={item} queueContext={results} />
              ))}
            </div>
          </>
        )}

        {!loading && searchMode === 'videos' && ytResults.length > 0 && (
          <>
            <h2>Top Music Videos</h2>
            <div className="cards-grid albums-grid">
              {ytResults.map(v => (
                <div key={v.videoId} className="album-card" onClick={() => { pause(); setSelectedVideo({ ...v, id: v.videoId, type: 'youtube' }); }} style={{cursor: 'pointer'}}>
                  <div style={{ position: 'relative' }}>
                    <img src={v.thumbnail} alt={v.title} loading="lazy" style={{borderRadius: '8px', width: '100%', aspectRatio: '16/9', objectFit: 'cover'}} />
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '8px', 
                      right: '8px', 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      color: 'white', 
                      fontSize: '0.75rem', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {v.timestamp || (v.duration && v.duration.timestamp)}
                    </div>
                  </div>
                  <h4 style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>{v.title}</h4>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>{v.author?.name}</p>
                </div>
              ))}
            </div>
          </>
        )}
        
        {!hasSearched && !loading && searchMode === 'songs' && (
          <div className="browse-all">
            <h2>Browse All</h2>
            <div className="genre-grid">
              {[
                { label: 'Bollywood', query: 'Bollywood Hits' },
                { label: 'Punjabi', query: 'Punjabi Hits' },
                { label: 'Devotional', query: 'Devotional Hits' },
                { label: 'Indie', query: 'Indie Hits' },
                { label: 'New Albums', query: 'New Albums 2026' },
                { label: 'New Release Songs', query: 'New Songs 2026' }
              ].map(category => (
                <div 
                  key={category.label} 
                  className="genre-card hover-scale" 
                  style={{backgroundColor: `hsl(${Math.random() * 360}, 70%, 30%)`, cursor: 'pointer'}}
                  onClick={() => setQuery(category.query)}
                >
                  <h3>{category.label}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedVideo && (
        <VideoPlayer 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)}
          onEnded={handleVideoEnd}
        />
      )}
    </div>
  );
};

export default Search;
