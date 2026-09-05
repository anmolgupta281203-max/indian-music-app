import React, { useState, useEffect, useCallback } from 'react';
import { Play } from 'lucide-react';
import { fetchAlbumDetails, searchSongs, fetchTrending } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import SongCard from '../components/SongCard';
import CompactSongCard from '../components/CompactSongCard';
import './Home.css';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const Home = () => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [latestAlbums, setLatestAlbums] = useState([]);
  const [hindiHits, setHindiHits] = useState([]);
  const [punjabiHits, setPunjabiHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [heroIndex, setHeroIndex] = useState(0);
  const { playSong, downloadedSongs } = usePlayer();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const filterDuplicates = (songs) => {
      if (!songs || !Array.isArray(songs)) return [];
      const seen = new Set();
      return songs.filter(song => {
        if (!song) return false;
        const nameStr = String(song.name || song.title || song.song || '').trim();
        if (!nameStr) return false;
        const key = nameStr.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const loadData = async () => {
      setLoading(true);
      let loadedTrending = [];
      let loadedTrendingAlbums = [];

      // 1. Fetch Trending Songs & Albums
      try {
        const trendingData = await fetchTrending();
        if (trendingData && trendingData.trending) {
          if (trendingData.trending.songs && Array.isArray(trendingData.trending.songs)) {
            loadedTrending = filterDuplicates(trendingData.trending.songs);
            setTrendingSongs(loadedTrending);
          }
          if (trendingData.trending.albums && Array.isArray(trendingData.trending.albums) && trendingData.trending.albums.length > 0) {
            loadedTrendingAlbums = filterDuplicates(trendingData.trending.albums);
            setTrendingAlbums(loadedTrendingAlbums);
          }
        } else if (Array.isArray(trendingData)) {
          loadedTrending = filterDuplicates(trendingData);
          setTrendingSongs(loadedTrending);
        }
      } catch (e) {
        console.warn("Trending fetch error:", e);
      }

      // Fallback if no trending songs loaded
      if (loadedTrending.length === 0) {
        try {
          const fallback = await searchSongs('Arijit Singh');
          loadedTrending = filterDuplicates(fallback || []);
          setTrendingSongs(loadedTrending);
        } catch (e) {}
      }

      // Trending Albums
      if (loadedTrendingAlbums.length === 0) {
        try {
          const albums = await searchSongs('Pritam');
          setTrendingAlbums(filterDuplicates(albums || []));
        } catch (e) {}
      }

      try {
        const latest = await searchSongs('latest hindi song');
        setLatestAlbums(filterDuplicates(latest || []));
      } catch (e) {
        console.warn("Latest releases error:", e);
      }

      try {
        const hindi = await searchSongs('Hindi');
        setHindiHits(filterDuplicates(hindi || []));
      } catch (e) {
        console.warn("Hindi hits error:", e);
      }

      try {
        const punjabi = await searchSongs('Punjabi');
        setPunjabiHits(filterDuplicates(punjabi || []));
      } catch (e) {
        console.warn("Punjabi hits error:", e);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-rotate hero carousel
  useEffect(() => {
    if (trendingSongs.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(trendingSongs.length, 5));
    }, 6000);
    return () => clearInterval(interval);
  }, [trendingSongs.length]);

  const getImage = useCallback((song) => {
    if (!song?.image) return 'https://via.placeholder.com/600x300/1c2128/25D1DA?text=Sv%C4%81r';
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image) && song.image.length > 0) {
      const last = song.image[song.image.length - 1];
      return typeof last === 'string' ? last : (last?.url || song.image[0]?.url || 'https://via.placeholder.com/600');
    }
    return 'https://via.placeholder.com/600';
  }, []);

  const heroSongs = trendingSongs.slice(0, 5);

  if (isOffline) {
    return (
      <div className="home-container animate-fade-in">
        <div className="greeting-header">
          <h1>{getGreeting()}</h1>
          <p>You're offline — playing downloaded songs</p>
        </div>
        
        <section className="music-section">
          <h2>Downloaded Songs</h2>
          {downloadedSongs && downloadedSongs.length > 0 ? (
            <div className="spotify-grid">
              {downloadedSongs.map((song, index) => (
                <CompactSongCard key={song.id || index} song={song} queueContext={downloadedSongs} />
              ))}
            </div>
          ) : (
            <div className="loading-state">
              <p>No songs downloaded yet. Download some while online.</p>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="home-container animate-fade-in">
      {/* Greeting */}
      <div className="greeting-header">
        <h1>{getGreeting()}</h1>
      </div>

      {/* Hero Carousel */}
      {heroSongs.length > 0 && (
        <div className="hero-carousel" onClick={() => playSong(heroSongs[heroIndex], trendingSongs)}>
          {heroSongs.map((song, idx) => {
            const img = getImage(song).replace('150x150', '500x500').replace('50x50', '500x500');
            const title = String(song.name || song.title || '');
            const artist = String(song.primaryArtists || '');
            return (
              <div key={song.id || idx} className={`hero-carousel-slide ${idx === heroIndex ? 'active' : ''}`}>
                <img src={img} alt={title} loading="lazy" />
                <div className="hero-carousel-gradient" />
                <div className="hero-carousel-content">
                  <span className="hero-carousel-badge">Trending Now</span>
                  <h2>{title}</h2>
                  <p>{artist}</p>
                  <button className="hero-play-btn" onClick={(e) => { e.stopPropagation(); playSong(song, trendingSongs); }}>
                    <Play size={18} fill="currentColor" /> Play
                  </button>
                </div>
              </div>
            );
          })}
          <div className="hero-carousel-dots">
            {heroSongs.map((_, idx) => (
              <button
                key={idx}
                className={`hero-dot ${idx === heroIndex ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setHeroIndex(idx); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Picks */}
      <section className="music-section">
        <h2>Quick Picks</h2>
        {trendingSongs.length > 0 ? (
          <div className="spotify-grid">
            {trendingSongs.slice(0, 6).map((song, index) => (
              <CompactSongCard key={song.id || index} song={song} queueContext={trendingSongs} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading..." : "No songs available"}</div>
        )}
      </section>

      {/* Trending Albums */}
      <section className="music-section">
        <h2>Trending Albums</h2>
        {trendingAlbums.length > 0 ? (
          <div className="cards-grid albums-grid">
            {trendingAlbums.map((album, index) => {
              const imgSrc = Array.isArray(album.image) 
                ? (album.image[1]?.url || album.image[0]?.url || 'https://via.placeholder.com/150')
                : (typeof album.image === 'string' ? album.image : 'https://via.placeholder.com/150');
              const albumName = String(album.name || album.title || 'Album');

              return (
                <div 
                  key={album.id || index} 
                  className="album-card" 
                  onClick={async () => {
                    if (album.type === 'album' || album.songs) {
                      try {
                        const details = await fetchAlbumDetails(album.id);
                        if (details?.songs?.length > 0) {
                          playSong(details.songs[0], details.songs);
                        }
                      } catch (e) {
                        playSong(album, trendingAlbums);
                      }
                    } else {
                      playSong(album, trendingAlbums);
                    }
                  }}
                >
                  <img src={imgSrc} alt={albumName} loading="lazy" />
                  <h4>{albumName}</h4>
                  <p>{album.artist || album.primaryArtists || 'Various Artists'}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading albums..." : "Loading..."}</div>
        )}
      </section>

      {/* Latest Releases */}
      <section className="music-section">
        <h2>Latest Releases</h2>
        {latestAlbums.length > 0 ? (
          <div className="cards-grid">
            {latestAlbums.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={latestAlbums} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading..." : "Loading..."}</div>
        )}
      </section>

      {/* Top Hindi Hits */}
      <section className="music-section">
        <h2>Top Hindi Hits</h2>
        {hindiHits.length > 0 ? (
          <div className="cards-grid">
            {hindiHits.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={hindiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading..." : "Loading..."}</div>
        )}
      </section>

      {/* Top Punjabi Hits */}
      <section className="music-section">
        <h2>Top Punjabi Hits</h2>
        {punjabiHits.length > 0 ? (
          <div className="cards-grid">
            {punjabiHits.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={punjabiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading..." : "Loading..."}</div>
        )}
      </section>
    </div>
  );
};

export default Home;
