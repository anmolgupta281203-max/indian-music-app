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

      // 1. Fetch Trending Songs & Albums
      try {
        const trendingData = await fetchTrending();
        if (trendingData && trendingData.trending) {
          if (trendingData.trending.songs && Array.isArray(trendingData.trending.songs)) {
            setTrendingSongs(filterDuplicates(trendingData.trending.songs));
          }
          if (trendingData.trending.albums && Array.isArray(trendingData.trending.albums) && trendingData.trending.albums.length > 0) {
            setTrendingAlbums(filterDuplicates(trendingData.trending.albums));
          }
        } else if (Array.isArray(trendingData)) {
          setTrendingSongs(filterDuplicates(trendingData));
        }
      } catch (e) {
        console.warn("Trending fetch error:", e);
      }

      // Ensure Trending Songs is populated
      if (trendingSongs.length === 0) {
        try {
          const fallback = await searchSongs('Arijit Singh');
          setTrendingSongs(filterDuplicates(fallback || []));
        } catch (e) {}
      }

      // Ensure Trending Albums is populated
      try {
        const albums = await searchSongs('Pritam');
        setTrendingAlbums(filterDuplicates(albums || []));
      } catch (e) {}

      try {
        const latest = await searchSongs('latest hindi song');
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
            {trendingSongs.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={trendingSongs} />
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
            {trendingAlbums.map((album, index) => {
              const imgSrc = Array.isArray(album.image) 
                ? (album.image[1]?.url || album.image[0]?.url || 'https://via.placeholder.com/150')
                : (typeof album.image === 'string' ? album.image : 'https://via.placeholder.com/150');
              const albumName = String(album.name || album.title || 'Album');

              return (
                <div 
                  key={album.id || index} 
                  className="album-card" 
                  onClick={() => album.type === 'album' || album.songs ? handleAlbumClick(album.id) : playSong(album, trendingAlbums)}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
                  <img src={imgSrc} alt={albumName} />
                  <h4 dangerouslySetInnerHTML={{ __html: albumName }}></h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{album.artist || album.primaryArtists || 'Featured Album'}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="loading-state">{loading ? "Loading albums..." : "Loading albums..."}</div>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Releases</h2>
        {latestAlbums.length > 0 ? (
          <div className="cards-grid">
            {latestAlbums.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={latestAlbums} />
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
            {hindiHits.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={hindiHits} />
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
            {punjabiHits.map((song, index) => (
              <SongCard key={song.id || index} song={song} queueContext={punjabiHits} />
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
