import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import TopNav from './components/TopNav';
import Home from './pages/Home';
import Search from './pages/Search';
import { usePlayer } from './context/PlayerContext';
import SongCard from './components/SongCard';

const Library = () => {
  const { favorites, downloadedSongs } = usePlayer();
  const [activeTab, setActiveTab] = React.useState('liked');

  const currentList = activeTab === 'liked' ? favorites : downloadedSongs;

  return (
    <div className="animate-fade-in" style={{padding: '2rem'}}>
      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
        <button 
          className={`filter-pill ${activeTab === 'liked' ? 'active' : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          Liked Songs
        </button>
        <button 
          className={`filter-pill ${activeTab === 'downloaded' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloaded')}
        >
          Downloaded (Offline)
        </button>
      </div>

      {currentList.length === 0 ? (
        <p style={{color: 'var(--text-secondary)'}}>
          {activeTab === 'liked' ? "You haven't liked any songs yet." : "You haven't downloaded any songs for offline playback."}
        </p>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.5rem'}}>
          {currentList.map(song => (
            <SongCard key={song.id} song={song} queueContext={currentList} />
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <div style={{ flex: 1 }}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
        </Routes>
        </div>
      </main>
      <MusicPlayer />
    </div>
  );
}

export default App;
