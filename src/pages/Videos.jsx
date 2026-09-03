import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play } from 'lucide-react';
import { 
  getTrendingMovies, 
  getPopularSeries, 
  searchMoviesAndSeries, 
  getImageUrl, 
  discoverByGenre, 
  discoverByNetwork, 
  getTrendingAnime, 
  getPopularHindiMovies, 
  getPopularHindiSeries, 
  discoverByLanguage 
} from '../services/tmdbApi';
import { usePlayer } from '../context/PlayerContext';
import VideoPlayer from '../components/VideoPlayer';
import CategoryNav from '../components/CategoryNav';
import './Videos.css';

const Videos = () => {
  const { pause: pauseMusic } = usePlayer();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [hindiMovies, setHindiMovies] = useState([]);
  const [hindiSeries, setHindiSeries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  
  const [activeFilter, setActiveFilter] = useState({ type: 'home', value: null, name: 'Home' });
  const [filteredContent, setFilteredContent] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const [m, s, hm, hs] = await Promise.all([
        getTrendingMovies(),
        getPopularSeries(),
        getPopularHindiMovies(),
        getPopularHindiSeries()
      ]);
      // Only keep top 12 for UI
      setMovies(m.slice(0, 12));
      setSeries(s.slice(0, 12));
      setHindiMovies(hm.slice(0, 12));
      setHindiSeries(hs.slice(0, 12));
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        setSearchLoading(true);
        setSearchResults([]);
        
        // Fetch TMDB immediately
        searchMoviesAndSeries(query).then(tmdbRes => {
          setSearchResults(tmdbRes);
          setSearchLoading(false); // Stop loading spinner as soon as TMDB finishes
        }).catch(() => setSearchLoading(false));
      } else {
        setSearchResults([]);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  useEffect(() => {
    const fetchFilterData = async () => {
      if (!activeFilter || activeFilter.type === 'home') {
        setFilteredContent([]);
        return;
      }

      setFilterLoading(true);
      setQuery(''); // Clear search query when changing categories
      
      try {
        let results = [];
        if (activeFilter.type === 'language') {
          results = await discoverByLanguage(activeFilter.value);
        } else if (activeFilter.type === 'genre') {
          results = await discoverByGenre(activeFilter.value);
        } else if (activeFilter.type === 'ott') {
          results = await discoverByNetwork(activeFilter.value);
        } else if (activeFilter.type === 'category') {
          if (activeFilter.value === 'movie') results = await getTrendingMovies();
          else if (activeFilter.value === 'tv') results = await getPopularSeries();
          else if (activeFilter.value === 'anime') results = await getTrendingAnime();
        } else if (activeFilter.type === 'genz') {
          results = await getTrendingAnime(); // Fallback for GenZ
        } else if (activeFilter.type === 'collection') {
          results = await getPopularHindiMovies(); // Fallback for collection
        }
        setFilteredContent(results);
      } catch (err) {
        console.error(err);
      }
      setFilterLoading(false);
    };
    
    fetchFilterData();
  }, [activeFilter]);

  const handlePlay = (item, type = null) => {
    pauseMusic();
    // Attempt to force fullscreen and landscape mode immediately on click for mobile devices
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().then(() => {
            if (window.screen?.orientation?.lock) {
              window.screen.orientation.lock('landscape').catch(e => console.log('Orientation lock failed', e));
            }
          }).catch(e => console.log('Fullscreen failed', e));
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } catch (err) {
        console.log(err);
      }
    }

    // Determine type if not provided
    const mediaType = type || item.media_type || (item.name ? 'tv' : 'movie');
    setSelectedVideo({ ...item, media_type: mediaType, type: type === 'youtube' ? 'youtube' : 'tmdb' });
  };

  return (
    <div className="videos-page animate-fade-in">
      <div className="videos-header">
        <h1>Movies & Web Series</h1>
        <div className="video-search-bar">
          <SearchIcon size={24} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search for movies or web series..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <CategoryNav activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>

      {query.trim() && searchLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      )}

      {query.trim() && !searchLoading && searchResults.length > 0 && (
        <div className="video-category animate-fade-in" style={{ marginTop: '20px' }}>
          <h2>Search Results</h2>
          <div className="video-grid">
            {searchResults.map(item => (
              <div key={item.id} className="video-card" onClick={() => handlePlay(item)}>
                <div className="video-thumb">
                  <img src={getImageUrl(item.poster_path)} alt={item.title || item.name} />
                  <div className="play-overlay">
                    <Play fill="white" size={32} />
                  </div>
                </div>
                <h3>{item.title || item.name}</h3>
                <div className="video-meta">
                  <span>{item.media_type === 'tv' ? 'Web Series' : 'Movie'}</span>
                  <span className="rating">★ {item.vote_average?.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!query.trim() && activeFilter && activeFilter.type !== 'home' && (
        <div className="video-category animate-fade-in" style={{ marginTop: '20px' }}>
          <h2>{activeFilter.name}</h2>
          {filterLoading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : filteredContent.length > 0 ? (
            <div className="video-grid">
              {filteredContent.map(item => (
                <div key={item.id} className="video-card" onClick={() => handlePlay(item)}>
                  <div className="video-thumb">
                    <img src={getImageUrl(item.poster_path)} alt={item.title || item.name} />
                    <div className="play-overlay">
                      <Play fill="white" size={32} />
                    </div>
                  </div>
                  <h3>{item.title || item.name}</h3>
                  <div className="video-meta">
                    <span>{item.media_type === 'tv' ? 'Web Series' : 'Movie'}</span>
                    <span className="rating">★ {item.vote_average?.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>No content found for this category.</p>
          )}
        </div>
      )}

      {!query.trim() && (!activeFilter || activeFilter.type === 'home') && !loading && (
        <>
          {hindiMovies.length > 0 && (
            <div className="video-hero" onClick={() => handlePlay(hindiMovies[0], 'movie')}>
              <div className="hero-backdrop">
                <img src={`https://image.tmdb.org/t/p/original${hindiMovies[0].backdrop_path}`} alt={hindiMovies[0].title} />
                <div className="hero-gradient"></div>
              </div>
              <div className="hero-content">
                <h2>{hindiMovies[0].title}</h2>
                <div className="hero-meta">
                  <span className="media-badge">MOVIE</span>
                  <span>{hindiMovies[0].release_date?.substring(0,4)}</span>
                  <span className="rating">★ {hindiMovies[0].vote_average?.toFixed(1)}</span>
                </div>
                <p className="hero-overview">{hindiMovies[0].overview}</p>
                <button className="hero-play-btn">
                  <Play fill="black" size={20} /> Play Now
                </button>
              </div>
            </div>
          )}

          <div className="video-section">
            <h2>Trending Hindi Movies</h2>
            <div className="video-row">
              {hindiMovies.slice(1).map(movie => (
                <div key={movie.id} className="video-card" onClick={() => handlePlay(movie, 'movie')}>
                  <div className="video-card-img-container">
                    <img src={getImageUrl(movie.poster_path)} alt={movie.title} loading="lazy" />
                    <div className="media-badge">MOVIE</div>
                    <div className="play-overlay">
                      <div className="play-button-small"><Play fill="black" size={24} /></div>
                    </div>
                  </div>
                  <h3>{movie.title}</h3>
                  <p>{movie.release_date?.substring(0,4)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="video-section">
            <h2>Trending Hindi Web Series</h2>
            <div className="video-row">
              {hindiSeries.map(show => (
                <div key={show.id} className="video-card" onClick={() => handlePlay(show, 'tv')}>
                  <div className="video-card-img-container">
                    <img src={getImageUrl(show.poster_path)} alt={show.name} loading="lazy" />
                    <div className="media-badge tv">WEB SERIES</div>
                    <div className="play-overlay">
                      <div className="play-button-small"><Play fill="black" size={24} /></div>
                    </div>
                  </div>
                  <h3>{show.name}</h3>
                  <p>{show.first_air_date?.substring(0,4)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="video-section">
            <h2>Global Trending Movies</h2>
            <div className="video-row">
              {movies.map(movie => (
                <div key={movie.id} className="video-card" onClick={() => handlePlay(movie, 'movie')}>
                  <div className="video-card-img-container">
                    <img src={getImageUrl(movie.poster_path)} alt={movie.title} loading="lazy" />
                    <div className="media-badge">MOVIE</div>
                    <div className="play-overlay">
                      <div className="play-button-small"><Play fill="black" size={24} /></div>
                    </div>
                  </div>
                  <h3>{movie.title}</h3>
                  <p>{movie.release_date?.substring(0,4)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="video-section">
            <h2>Top Global Web Series</h2>
            <div className="video-row">
              {series.map(show => (
                <div key={show.id} className="video-card" onClick={() => handlePlay(show, 'tv')}>
                  <div className="video-card-img-container">
                    <img src={getImageUrl(show.poster_path)} alt={show.name} loading="lazy" />
                    <div className="media-badge tv">WEB SERIES</div>
                    <div className="play-overlay">
                      <div className="play-button-small"><Play fill="black" size={24} /></div>
                    </div>
                  </div>
                  <h3>{show.name}</h3>
                  <p>{show.first_air_date?.substring(0,4)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedVideo && (
        <VideoPlayer 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </div>
  );
};

export default Videos;
