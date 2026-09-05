import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchArtistTopSongs, searchSongs } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { Play } from 'lucide-react';
import SongCard from '../components/SongCard';
import './Artist.css';
import './Home.css'; // For .music-section and .cards-grid

const Artist = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const artistName = searchParams.get('name') || 'Artist';

  const [topSongs, setTopSongs] = useState([]);
  const [latestSongs, setLatestSongs] = useState([]);
  const [oldSongs, setOldSongs] = useState([]);
  const [collabSongs, setCollabSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { playSong } = usePlayer();

  useEffect(() => {
    const loadArtistData = async () => {
      setLoading(true);
      try {
        // Fetch Top Songs natively by artist ID
        const top = await fetchArtistTopSongs(id);
        
        // Dynamically fetch other categories using search
        const [latest, old, collabs] = await Promise.all([
          searchSongs(`${artistName} Latest`),
          searchSongs(`${artistName} Old`),
          searchSongs(`${artistName} Duets`)
        ]);

        // Helper to filter out completely identical songs
        const filterDuplicates = (songs) => {
          if (!songs || !Array.isArray(songs)) return [];
          const seen = new Set();
          return songs.filter(song => {
            const key = song.name;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        setTopSongs(filterDuplicates(top || []));
        setLatestSongs(filterDuplicates(latest || []));
        setOldSongs(filterDuplicates(old || []));
        setCollabSongs(filterDuplicates(collabs || []));

      } catch (err) {
        console.error("Error loading artist data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadArtistData();
  }, [id, artistName]);

  const handlePlayArtist = () => {
    if (topSongs.length > 0) {
      playSong(topSongs[0], topSongs);
    }
  };

  // Safely extract artist hero background image
  const getArtistImage = () => {
    if (!topSongs || topSongs.length === 0 || !topSongs[0].image) return 'https://via.placeholder.com/500';
    const img = topSongs[0].image;
    if (typeof img === 'string') return img;
    if (Array.isArray(img) && img.length > 0) {
      const last = img[img.length - 1];
      return typeof last === 'string' ? last : (last?.url || img[0]?.url || 'https://via.placeholder.com/500');
    }
    return 'https://via.placeholder.com/500';
  };
  const artistImage = getArtistImage();

  return (
    <div className="artist-container animate-fade-in">
      <div className="artist-hero">
        <div className="artist-hero-bg" style={{ backgroundImage: `url(${artistImage})` }}></div>
        <div className="artist-hero-content">
          <img src={artistImage} alt={artistName} className="artist-hero-img" />
          <div className="artist-hero-info">
            <span className="artist-badge">Verified Artist</span>
            <h1>{artistName}</h1>
            <button className="artist-play-btn" onClick={handlePlayArtist}>
              <Play size={28} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{marginTop: '1rem'}}>Loading {artistName}'s profile...</p>
        </div>
      ) : (
        <>
          {topSongs.length > 0 && (
            <section className="music-section">
              <h2>Top Hits</h2>
              <div className="cards-grid">
                {topSongs.map((song) => (
                  <SongCard key={song.id} song={song} queueContext={topSongs} />
                ))}
              </div>
            </section>
          )}

          {latestSongs.length > 0 && (
            <section className="music-section">
              <h2>Latest Releases</h2>
              <div className="cards-grid">
                {latestSongs.map((song) => (
                  <SongCard key={song.id} song={song} queueContext={latestSongs} />
                ))}
              </div>
            </section>
          )}

          {oldSongs.length > 0 && (
            <section className="music-section">
              <h2>Golden Oldies</h2>
              <div className="cards-grid">
                {oldSongs.map((song) => (
                  <SongCard key={song.id} song={song} queueContext={oldSongs} />
                ))}
              </div>
            </section>
          )}

          {collabSongs.length > 0 && (
            <section className="music-section">
              <h2>Collaborations & Duets</h2>
              <div className="cards-grid">
                {collabSongs.map((song) => (
                  <SongCard key={song.id} song={song} queueContext={collabSongs} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Artist;
