import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MusicPlayer from './components/MusicPlayer';
import TopNav from './components/TopNav';
import Home from './pages/Home';
import Search from './pages/Search';
import { usePlayer } from './context/PlayerContext';
import SongCard from './components/SongCard';
import QueueModal from './components/QueueModal';
import Videos from './pages/Videos';
import AuthModal from './components/AuthModal';
import Paywall from './components/Paywall';
import AdminPanel from './pages/AdminPanel';
import { useLocation } from 'react-router-dom';

const Library = () => {
  const { favorites, downloadedSongs, openQueueModal, queue } = usePlayer();
  const [activeTab, setActiveTab] = useState('liked');
  const [subData, setSubData] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);

  React.useEffect(() => {
    const fetchSub = async () => {
      import('./services/supabase').then(async ({ supabase }) => {
        const phone = localStorage.getItem('svar_user_phone');
        if (!phone) return;
        const { data: user } = await supabase.from('users').select('id, name').eq('phone_number', phone).single();
        if (user) {
          const { data: sub } = await supabase.from('subscriptions').select('*, users(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
          if (sub && sub.status === 'approved') {
            setSubData(sub);
            const expires = new Date(sub.expires_at);
            const now = new Date();
            const diff = expires.getTime() - now.getTime();
            setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 3600 * 24))));
          }
        }
      });
    };
    fetchSub();
  }, []);

  let currentList = [];
  if (activeTab === 'liked') currentList = favorites;
  if (activeTab === 'downloaded') currentList = downloadedSongs;

  const handleInstallClick = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
      }
    } else {
      alert("Automatic installation isn't available right now.\n\nWHY?\n1. You might have already installed the app!\n2. You are using an in-app browser (like Instagram/WhatsApp). Please open this link in Chrome or Safari.\n\nHOW TO INSTALL MANUALLY:\n- Android (Chrome): Tap the 3 dots in the top right and select 'Install app' or 'Add to Home Screen'.\n- iPhone (Safari): Tap the Share icon at the bottom and select 'Add to Home Screen'.");
    }
  };

  return (
    <div className="animate-fade-in" style={{padding: '2rem'}}>
      {subData && subData.status === 'approved' && (
        <div style={{
          backgroundColor: 'rgba(30, 215, 96, 0.1)', 
          border: '1px solid var(--primary-color)', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          marginBottom: '2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem' 
        }}>
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
              <h3 style={{ margin: '0', color: 'var(--primary-color)' }}>Premium Profile</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Welcome, {subData.users?.name}</p>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <strong style={{color: '#fff', fontSize: '1.5rem', display: 'block'}}>{daysLeft}</strong>
            <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Days Left</span>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Install App</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Download the app to your device for a full-screen native experience.</p>
        </div>
        <button 
          onClick={handleInstallClick}
          style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Click here to download app
        </button>
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
        <button 
          className={`filter-pill ${activeTab === 'liked' ? 'active' : ''}`}
          onClick={() => setActiveTab('liked')}
        >
          Liked Songs ({favorites.length})
        </button>
        <button 
          className={`filter-pill ${activeTab === 'downloaded' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloaded')}
        >
          Downloaded (Offline) ({downloadedSongs.length})
        </button>
        <button 
          className="filter-pill"
          onClick={openQueueModal}
        >
          Up Next Queue ({queue.length})
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
  const [hasAccess, setHasAccess] = useState(false);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  if (!hasAccess) {
    return (
      <Paywall 
        onAccessGranted={(u, sub) => {
          setUser(u);
          setSubscription(sub);
          setHasAccess(true);
        }} 
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </div>
      </main>
      <MusicPlayer />
      <QueueModal />
      <AuthModal />
    </div>
  );
}

export default App;
