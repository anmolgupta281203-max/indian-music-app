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

      // 1. Fetch Trending Songs & Albums
      try {
        const trendingData = await fetchTrending();
        if (trendingData && trendingData.trending) {
          setTrendingSongs(filterDuplicates(trendingData.trending.songs || []));
          setTrendingAlbums(filterDuplicates(trendingData.trending.albums || []));
        } else if (Array.isArray(trendingData)) {
          setTrendingSongs(filterDuplicates(trendingData));
        }
      } catch (e) {
        console.warn("Trending fetch error:", e);
      }

      // 2. Load Latest Releases
      try {
        const latest = await searchSongs('Shreya Ghoshal');
        setLatestAlbums(filterDuplicates(latest || []));
      } catch (e) {
        console.warn("Latest releases error:", e);
      }

      // 3. Load Top Hindi Hits
      try {
        const hindi = await searchSongs('Hindi');
        setHindiHits(filterDuplicates(hindi || []));
      } catch (e) {
        console.warn("Hindi hits error:", e);
      }

      // 4. Load Top Punjabi Hits
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
          <div className="loading-state">{loading ? "Loading top hits..." : "Loading recommendations..."}</div>
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
                onClick={() => album.songs ? playSong(album.songs[0], album.songs) : (album.id ? handleAlbumClick(album.id) : playSong(album, trendingAlbums))}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                <img src={album.image[1]?.url || album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4 dangerouslySetInnerHTML={{ __html: album.name }}></h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{album.artist || album.primaryArtists || 'Featured Album'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading albums..." : "Loading albums..."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Releases</h2>
        {latestAlbums.length > 0 ? (
          <div className="cards-grid">
            {latestAlbums.map((song) => (
              <SongCard key={song.id} song={song} queueContext={latestAlbums} />
            ))}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading latest..." : "Loading latest..."}</div>
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
          <div className="loading-state">{loading ? "Loading Hindi hits..." : "Loading Hindi hits..."}</div>
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
          <div className="loading-state">{loading ? "Loading Punjabi hits..." : "Loading Punjabi hits..."}</div>
        )}
      </section>
    </div>
  );
};

export default Home;
