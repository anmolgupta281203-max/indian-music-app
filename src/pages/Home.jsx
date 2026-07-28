import React, { useState, useEffect } from 'react';
import { fetchAlbumDetails, searchSongs, fetchTrending } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import SongCard from '../components/SongCard';
import './Home.css';

const Home = () => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [latestAlbums, setLatestAlbums] = useState([]);
  const [hindiHits, setHindiHits] = useState([]);
  const [punjabiHits, setPunjabiHits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbumId, setLoadingAlbumId] = useState(null);
  const { playSong } = usePlayer();

  useEffect(() => {
    const filterDuplicates = (songs) => {
      if (!songs || !Array.isArray(songs)) return [];
      const seen = new Set();
      return songs.filter(song => {
        if (!song || !song.name) return false;
        const rawName = song.name.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
        const key = rawName.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const loadData = async () => {
      setLoading(true);

      // Load Trending Songs
      try {
        let trending = await fetchTrending();
        if (!trending || trending.length === 0) {
          trending = await searchSongs('Bollywood Top 2024');
        }
        if (trending && trending.trending) {
          setTrendingSongs(filterDuplicates(trending.trending.songs || []));
          setTrendingAlbums(trending.trending.albums || []);
        } else if (Array.isArray(trending)) {
          setTrendingSongs(filterDuplicates(trending));
        }
      } catch (e) {
        console.warn("Trending fetch failed, searching fallback...", e);
        try {
          const fallback = await searchSongs('Arijit Singh Top Hits');
          setTrendingSongs(filterDuplicates(fallback || []));
        } catch (err) {}
      }

      // Load Hindi Hits
      try {
        const hindi = await searchSongs('Latest Hindi Hits');
        setHindiHits(filterDuplicates(hindi || []));
      } catch (e) {
        console.warn("Hindi hits fetch failed", e);
      }

      // Load Punjabi Hits
      try {
        const punjabi = await searchSongs('Latest Punjabi Hits');
        setPunjabiHits(filterDuplicates(punjabi || []));
      } catch (e) {
        console.warn("Punjabi hits fetch failed", e);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleAlbumClick = async (albumId) => {
    setLoadingAlbumId(albumId);
    try {
      const albumData = await fetchAlbumDetails(albumId);
      if (albumData && albumData.songs && albumData.songs.length > 0) {
        playSong(albumData.songs[0], albumData.songs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAlbumId(null);
    }
  };

  return (
    <div className="home-container animate-fade-in">
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-subtitle">NEW RELEASE</div>
          <h1 className="hero-title">Discover Premium Indian Music</h1>
          <p className="hero-desc">Stream your favorite hits across genres, eras, and regions in high fidelity.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="hero-play-btn" onClick={() => trendingSongs.length > 0 && playSong(trendingSongs[0], trendingSongs)}>
              Start Listening
            </button>
          </div>
        </div>
      </div>

      <section className="music-section">
        <h2>Trending Songs</h2>
        {trendingSongs.length > 0 ? (
          <div className="cards-grid">
            {trendingSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={trendingSongs} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading top hits..." : "Failed to load trending songs. Please try again."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Trending Albums</h2>
        {trendingAlbums.length > 0 ? (
          <div className="cards-grid albums-grid">
            {trendingAlbums.map((album) => (
              <div 
                key={album.id} 
                className="album-card" 
                onClick={() => handleAlbumClick(album.id)}
                style={{ position: 'relative' }}
              >
                <img src={album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4>{album.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading albums..." : "No albums found."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Releases</h2>
        {latestAlbums.length > 0 ? (
          <div className="cards-grid albums-grid">
            {latestAlbums.map((album) => (
              <div 
                key={album.id} 
                className="album-card"
                onClick={() => handleAlbumClick(album.id)}
              >
                <img src={album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4>{album.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading latest..." : "No latest albums."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Top Hindi Hits</h2>
        {hindiHits.length > 0 ? (
          <div className="cards-grid">
            {hindiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={hindiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading Hindi hits..." : "No Hindi songs found."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Top Punjabi Hits</h2>
        {punjabiHits.length > 0 ? (
          <div className="cards-grid">
            {punjabiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={punjabiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading Punjabi hits..." : "No Punjabi songs found."}</div>
        )}
      </section>
    </div>
  );
};

export default Home;
