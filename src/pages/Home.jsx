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
    const loadData = async () => {
      const [trendingData, hindi, punjabi] = await Promise.all([
        fetchTrending(),
        searchSongs('Latest Hindi Hits', true),
        searchSongs('Latest Punjabi Hits', true)
      ]);

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

      if (trendingData && trendingData.trending) {
        setTrendingSongs(trendingData.trending.songs || []);
        setTrendingAlbums(trendingData.trending.albums || []);
        setLatestAlbums(trendingData.trending.latestAlbums || []);
      }
      
      setHindiHits(filterDuplicates(hindi?.results || hindi));
      setPunjabiHits(filterDuplicates(punjabi?.results || punjabi));
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleAlbumClick = async (albumId) => {
    if (loadingAlbumId) return;
    setLoadingAlbumId(albumId);
    try {
      const albumSongs = await fetchAlbumDetails(albumId);
      if (albumSongs && albumSongs.length > 0) {
        playSong(albumSongs[0], albumSongs);
      } else {
        alert("Sorry, no playable songs found for this album.");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading album.");
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
          <button className="hero-play-btn" onClick={() => trendingSongs.length > 0 && playSong(trendingSongs[0], trendingSongs)}>
            Start Listening
          </button>
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
                style={{ position: 'relative' }}
              >
                <img src={album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4>{album.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading latest..." : "No releases found."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Hindi Hits</h2>
        {hindiHits.length > 0 ? (
          <div className="cards-grid">
            {hindiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={hindiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading Hindi hits..." : null}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Punjabi Bangers</h2>
        {punjabiHits.length > 0 ? (
          <div className="cards-grid">
            {punjabiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={punjabiHits} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading Punjabi hits..." : null}</div>
        )}
      </section>
    </div>
  );
};

export default Home;
