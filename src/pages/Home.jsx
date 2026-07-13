import React, { useState, useEffect } from 'react';
import { fetchTrending, fetchAlbumDetails, searchSongs } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import SongCard from '../components/SongCard';
import './Home.css';

const Home = () => {
  const [trendingSongs, setTrendingSongs] = useState([]);
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [latestAlbums, setLatestAlbums] = useState([]);
  const [hindiHits, setHindiHits] = useState([]);
  const [punjabiHits, setPunjabiHits] = useState([]);
  const [folkSongs, setFolkSongs] = useState([]);
  const [qawaliSongs, setQawaliSongs] = useState([]);
  const [nusratSongs, setNusratSongs] = useState([]);
  const [arijitSongs, setArijitSongs] = useState([]);
  const [shreyaSongs, setShreyaSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbumId, setLoadingAlbumId] = useState(null);
  const { playSong } = usePlayer();

  useEffect(() => {
    const loadData = async () => {
      const [data, hindi, punjabi, folk, qawali, nusrat, arijit, shreya] = await Promise.all([
        fetchTrending(),
        searchSongs('Latest Hindi'),
        searchSongs('Latest Punjabi'),
        searchSongs('Indian Folk'),
        searchSongs('Qawali'),
        searchSongs('Ustad Nusrat Fateh Ali Khan'),
        searchSongs('Arijit Singh'),
        searchSongs('Shreya Ghoshal')
      ]);

      const filterDuplicates = (songs) => {
        if (!songs || !Array.isArray(songs)) return [];
        const seen = new Set();
        return songs.filter(song => {
          if (!song || !song.name) return false;
          // Decode HTML entities and use strict lowercase name matching
          const rawName = song.name.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          const key = rawName.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      if (data && data.trending && (data.trending.songs?.length > 0 || data.trending.albums?.length > 0 || data.trending.latestAlbums?.length > 0)) {
        setTrendingSongs(filterDuplicates(data.trending.songs));
        setTrendingAlbums(data.trending.albums || []);
        setLatestAlbums(data.trending.latestAlbums || []);
      } else {
        // Safe fallback in case the API completely fails to return arrays
        setTrendingSongs([]);
        setTrendingAlbums([]);
        setLatestAlbums([]);
      }
      
      setHindiHits(filterDuplicates(hindi?.results || hindi));
      setPunjabiHits(filterDuplicates(punjabi?.results || punjabi));
      setFolkSongs(filterDuplicates(folk?.results || folk));
      setQawaliSongs(filterDuplicates(qawali?.results || qawali));
      setNusratSongs(filterDuplicates(nusrat?.results || nusrat));
      setArijitSongs(filterDuplicates(arijit?.results || arijit));
      setShreyaSongs(filterDuplicates(shreya?.results || shreya));

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
        // Play the first song and pass the entire album as the queue
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
          <button className="hero-play-btn">Start Listening</button>
        </div>
      </div>

      <section className="music-section">
        <h2>Trending Songs</h2>
        {loading ? (
          <div className="loading-state">Loading real songs...</div>
        ) : trendingSongs.length > 0 ? (
          <div className="cards-grid">
            {trendingSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={trendingSongs} />
            ))}
          </div>
        ) : (
          <p className="error-text">Failed to load trending songs from API. Please try again later.</p>
        )}
      </section>

      <section className="music-section">
        <h2>Trending Albums</h2>
        {loading ? (
          <div className="loading-state">Loading albums...</div>
        ) : trendingAlbums.length > 0 ? (
          <div className="cards-grid albums-grid">
            {trendingAlbums.map((album) => (
              <div 
                key={album.id} 
                className="album-card" 
                onClick={() => handleAlbumClick(album.id)}
                style={{ position: 'relative' }}
              >
                {loadingAlbumId === album.id && (
                  <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '16px'}}>
                    <div className="spinner"></div>
                  </div>
                )}
                <img src={album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4>{album.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <p className="error-text">Failed to load albums.</p>
        )}
      </section>

      <section className="music-section">
        <h2>Latest Releases</h2>
        {loading ? (
          <div className="loading-state">Loading latest...</div>
        ) : latestAlbums.length > 0 ? (
          <div className="cards-grid albums-grid">
            {latestAlbums.map((album) => (
              <div 
                key={album.id} 
                className="album-card" 
                onClick={() => handleAlbumClick(album.id)}
                style={{ position: 'relative' }}
              >
                {loadingAlbumId === album.id && (
                  <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '16px'}}>
                    <div className="spinner"></div>
                  </div>
                )}
                <img src={album.image[0]?.url || 'https://via.placeholder.com/150'} alt={album.name} />
                <h4>{album.name}</h4>
              </div>
            ))}
          </div>
        ) : (
          <p className="error-text">Failed to load latest releases.</p>
        )}
      </section>

      {/* NEW GENRE SECTIONS */}
      <section className="music-section">
        <h2>Latest Hindi Hits</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : hindiHits.length > 0 ? (
          <div className="cards-grid">
            {hindiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={hindiHits} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Latest Punjabi Bangers</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : punjabiHits.length > 0 ? (
          <div className="cards-grid">
            {punjabiHits.map((song) => (
              <SongCard key={song.id} song={song} queueContext={punjabiHits} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Folk & Traditional</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : folkSongs.length > 0 ? (
          <div className="cards-grid">
            {folkSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={folkSongs} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Soulful Qawali</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : qawaliSongs.length > 0 ? (
          <div className="cards-grid">
            {qawaliSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={qawaliSongs} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Legendary: Ustad Nusrat Fateh Ali Khan</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : nusratSongs.length > 0 ? (
          <div className="cards-grid">
            {nusratSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={nusratSongs} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Artist Spotlight: Arijit Singh</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : arijitSongs.length > 0 ? (
          <div className="cards-grid">
            {arijitSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={arijitSongs} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="music-section">
        <h2>Melodies of Shreya Ghoshal</h2>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : shreyaSongs.length > 0 ? (
          <div className="cards-grid">
            {shreyaSongs.map((song) => (
              <SongCard key={song.id} song={song} queueContext={shreyaSongs} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default Home;
