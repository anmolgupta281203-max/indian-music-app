import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Play, Music, User, Film, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchSongs, searchArtists } from '../services/api';
import axios from 'axios';
import SongCard from '../components/SongCard';
import { usePlayer } from '../context/PlayerContext';
import './Search.css';
import './Home.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { playSong, pause } = usePlayer();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'songs' | 'artists' | 'videos'
  const [results, setResults] = useState([]);
  const [artists, setArtists] = useState([]);
  const [ytResults, setYtResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    
    const delayDebounceFn = setTimeout(async () => {
      if (trimmed) {
        setLoading(true);
        setHasSearched(true);

        try {
          // Parallel fetch for comprehensive Amazon Music / Netflix unified search
          const [songsRes, artistsRes, ytRes, moviesRes] = await Promise.allSettled([
            searchSongs(trimmed),
            searchArtists(trimmed),
            (async () => {
              try {
                const res = await axios.get(`/api/yt-search?q=${encodeURIComponent(trimmed)}&limit=12`);
                if (res.data?.results?.length > 0) return res.data.results;
              } catch (e) {
                // client fallback
                const instances = ['https://iv.melmac.space', 'https://invidious.jing.rocks', 'https://vid.puffyan.us'];
                for (const url of instances) {
                  try {
                    const invRes = await axios.get(`${url}/api/v1/search?q=${encodeURIComponent(trimmed)}&type=video`, { timeout: 4000 });
                    if (invRes.data && Array.isArray(invRes.data) && invRes.data.length > 0) {
                      return invRes.data.map(v => {
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
                    }
                  } catch (err) {}
                }
              }
              return [];
            })()
          ]);

          let foundSongs = songsRes.status === 'fulfilled' ? (songsRes.value || []) : [];
          let foundArtists = artistsRes.status === 'fulfilled' ? (artistsRes.value || []) : [];
          let foundVideos = ytRes.status === 'fulfilled' ? (ytRes.value || []) : [];

          // Convert official high-relevance YouTube Music tracks into audio songs
          const officialAudioFromYT = (foundVideos || []).slice(0, 8).map(v => {
            let secs = 240;
            if (v.timestamp) {
              const parts = v.timestamp.split(':');
              if (parts.length === 2) secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
              else if (parts.length === 3) secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
            }
            let cleanTitle = v.title
              .replace(/#\w+/g, '')
              .replace(/\|\s*(full\s*song|official\s*video|4k\s*video|hd\s*video|lyric\s*video|audio|remastered|qawwali|ishtar\s*music|t-series).*$/gi, '')
              .replace(/\(.*?(official|video|audio|hd|4k|song|qawwali).*?\)/gi, '')
              .replace(/\[.*?(official|video|audio|hd|4k|song|qawwali).*?\]/gi, '')
              .trim();
            if (!cleanTitle || cleanTitle.length < 3) cleanTitle = v.title;

            return {
              id: v.videoId,
              name: cleanTitle,
              album: 'Official Release',
              year: new Date().getFullYear().toString(),
              duration: secs,
              primaryArtists: v.author?.name || 'Official Artist',
              image: [{ quality: '500x500', url: v.thumbnail }],
              downloadUrl: [],
              youtubeId: v.videoId,
              isYouTubeFallback: true
            };
          });

          // Prepend official YT tracks before generic covers so genuine official hits appear #1!
          foundSongs = [...officialAudioFromYT, ...foundSongs];

          // Deduplicate songs by unique ID
          if (Array.isArray(foundSongs)) {
            const seen = new Set();
            foundSongs = foundSongs.filter(song => {
              if (!song || !song.id) return false;
              if (seen.has(song.id)) return false;
              seen.add(song.id);
              return true;
            });
          }

          // If artists list is empty, synthesize top artist card from search or top track
          if (foundArtists.length === 0 && (foundSongs.length > 0 || trimmed.length >= 3)) {
            let topArtistName = trimmed;
            let topArtistImg = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
            if (foundSongs.length > 0) {
              const cand = foundSongs[0].primaryArtists ? foundSongs[0].primaryArtists.split(',')[0].trim() : trimmed;
              if (cand && cand !== 'Artist' && cand !== 'Official Artist' && cand !== 'Single / Track') {
                topArtistName = cand;
              }
              topArtistImg = (foundSongs[0].image && (foundSongs[0].image[1]?.url || foundSongs[0].image[0]?.url)) || topArtistImg;
            }
            if (topArtistName && topArtistName.length >= 3) {
              foundArtists = [{
                id: `artist-${encodeURIComponent(topArtistName)}`,
                name: topArtistName,
                image: topArtistImg
              }];
            }
          }

          setResults(foundSongs);
          setArtists(foundArtists);
          setYtResults(foundVideos);
          setMovieResults(foundMovies);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setArtists([]);
        setYtResults([]);
        setHasSearched(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handlePlayArtistTop = (artist) => {
    navigate(`/artist/${artist.id}`);
  };

  const categories = [
    { label: 'Trending Bollywood', query: 'Bollywood Hits 2026', gradient: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', icon: '🔥' },
    { label: 'Punjabi Pop', query: 'Punjabi Hits', gradient: 'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)', icon: '⚡' },
    { label: 'Sufi & Qawwali', query: 'Nusrat Fateh Ali Khan Rahat Qawwali', gradient: 'linear-gradient(135deg, #b92b27 0%, #1565C0 100%)', icon: '🕊️' },
    { label: 'Ghazals & Classics', query: 'Jagjit Singh Ghazals Classics', gradient: 'linear-gradient(135deg, #4b1248 0%, #f0c27b 100%)', icon: '🎻' },
    { label: 'Desi Hip-Hop', query: 'Desi Hip Hop Hits', gradient: 'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)', icon: '🎤' },
    { label: 'Urdu Rap & Hip-Hop', query: 'Urdu Rap Young Stunners Talha Anjum', gradient: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', icon: '🎧' },
    { label: 'Lo-Fi Chill', query: 'Indian Lo-Fi Chill', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '☕' },
    { label: 'Romantic 90s', query: '90s Romantic Bollywood', gradient: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', icon: '❤️' },
    { label: 'Devotional & Bhakti', query: 'Top Bhakti Devotional', gradient: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', icon: '🪔' },
    { label: 'Indie & Acoustic', query: 'Indian Indie Hits', gradient: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)', icon: '✨' },
    { label: 'South Indian Hits', query: 'South Indian Hits Telugu Tamil', gradient: 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)', icon: '🎵' },
    { label: 'International Hits', query: 'Global Billboard Hits', gradient: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', icon: '🌍' },
    { label: 'Workout Energy', query: 'Gym Workout Hindi', gradient: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', icon: '💪' },
  ];

  const totalFound = results.length + artists.length + ytResults.length;

  return (
    <div className="search-container animate-fade-in">
      {/* Search Header Bar */}
      <div className="search-header-section">
        <div className="search-bar-wrapper">
          <SearchIcon size={22} className="search-bar-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search songs, artists, albums, music videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          {query && (
            <button className="search-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              <X size={18} />
            </button>
          )}
        </div>
        
        {/* Amazon Music Filter Pills */}
        {hasSearched && (
          <div className="search-filter-pills">
            <button 
              className={`filter-pill ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Sparkles size={14} /> All ({totalFound})
            </button>
            <button 
              className={`filter-pill ${activeTab === 'songs' ? 'active' : ''}`}
              onClick={() => setActiveTab('songs')}
            >
              <Music size={14} /> Songs ({results.length})
            </button>
            <button 
              className={`filter-pill ${activeTab === 'artists' ? 'active' : ''}`}
              onClick={() => setActiveTab('artists')}
            >
              <User size={14} /> Artists ({artists.length})
            </button>
            <button 
              className={`filter-pill ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <Film size={14} /> Music Videos ({ytResults.length})
            </button>
          </div>
        )}
      </div>

      {/* Main Results Body */}
      <div className="search-body">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching everywhere...</p>
          </div>
        )}
        
        {!loading && hasSearched && totalFound === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><SearchIcon size={48} /></div>
            <h3>No results found for "{query}"</h3>
            <p>Try searching with different keywords, artist name, or check the spelling.</p>
          </div>
        )}

        {/* 1. TOP MATCH ARTIST HERO (Shown in 'all' or 'artists' tab) */}
        {!loading && (activeTab === 'all' || activeTab === 'artists') && artists.length > 0 && (
          <section className="search-section artist-section">
            <div className="section-title-row">
              <h2>Top Artists</h2>
            </div>
            <div className="artist-cards-grid">
              {artists.slice(0, activeTab === 'artists' ? 12 : 3).map(artist => (
                <div 
                  key={artist.id} 
                  className="artist-card-item hover-glow"
                  onClick={() => handlePlayArtistTop(artist)}
                >
                  <div className="artist-avatar-wrap">
                    <img 
                      src={artist.image} 
                      alt={artist.name} 
                      loading="lazy" 
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60'; }}
                    />
                    <div className="artist-play-btn-circle">
                      <Play size={20} fill="#000" color="#000" />
                    </div>
                  </div>
                  <div className="artist-card-details">
                    <div className="artist-name-row">
                      <span className="artist-name">{artist.name}</span>
                      <CheckCircle2 size={16} className="verified-badge" />
                    </div>
                    <span className="artist-tag">Artist • View Discography</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. AUDIO SONGS (Shown in 'all' or 'songs' tab) */}
        {!loading && (activeTab === 'all' || activeTab === 'songs') && results.length > 0 && (
          <section className="search-section songs-section">
            <div className="section-title-row">
              <h2>Audio Songs</h2>
              {activeTab === 'all' && results.length > 8 && (
                <button className="see-more-link" onClick={() => setActiveTab('songs')}>
                  See all ({results.length}) <ChevronRight size={16} />
                </button>
              )}
            </div>
            <div className="cards-grid">
              {(activeTab === 'all' ? results.slice(0, 10) : results).map(item => (
                <SongCard key={item.id} song={item} queueContext={results} />
              ))}
            </div>
          </section>
        )}

        {/* 3. MUSIC VIDEOS (YOUTUBE) (Shown in 'all' or 'videos' tab) */}
        {!loading && (activeTab === 'all' || activeTab === 'videos') && ytResults.length > 0 && (
          <section className="search-section videos-section">
            <div className="section-title-row">
              <h2>Music Videos (HD)</h2>
              {activeTab === 'all' && ytResults.length > 6 && (
                <button className="see-more-link" onClick={() => setActiveTab('videos')}>
                  See all ({ytResults.length}) <ChevronRight size={16} />
                </button>
              )}
            </div>
            <div className="video-cards-grid">
              {(activeTab === 'all' ? ytResults.slice(0, 6) : ytResults).map(v => (
                <div 
                  key={v.videoId} 
                  className="search-video-card" 
                  onClick={() => { pause(); setSelectedVideo({ ...v, id: v.videoId, type: 'youtube' }); }}
                >
                  <div className="video-thumb-container">
                    <img src={v.thumbnail} alt={v.title} loading="lazy" />
                    <div className="video-duration-pill">
                      {v.timestamp || (v.duration && v.duration.timestamp) || 'HD'}
                    </div>
                    <div className="video-hover-play">
                      <Play size={24} fill="#fff" color="#fff" />
                    </div>
                  </div>
                  <div className="video-info-meta">
                    <h4 className="video-title" title={v.title}>{v.title}</h4>
                    <p className="video-author">{v.author?.name || 'Official Video'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* ZERO-STATE: BROWSE ALL GENRES & QUICK PICKS */}
        {!hasSearched && !loading && (
          <div className="browse-categories-wrapper">
            <div className="browse-section-header">
              <h2>Explore Categories & Playlists</h2>
              <p>Discover trending soundtracks, regional hits, and viral moods</p>
            </div>
            <div className="browse-genre-grid">
              {categories.map((category) => (
                <div 
                  key={category.label} 
                  className="browse-genre-tile" 
                  style={{ background: category.gradient }}
                  onClick={() => setQuery(category.query)}
                >
                  <div className="tile-text">
                    <h3>{category.label}</h3>
                    <span>Explore songs & music</span>
                  </div>
                  <div className="tile-icon">{category.icon}</div>
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
