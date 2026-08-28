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
import AIDjModal from './components/AIDjModal';
import Videos from './pages/Videos';
import AuthModal from './components/AuthModal';
import Paywall from './components/Paywall';
import AdminPanel from './pages/AdminPanel';
import LandingPage from './pages/LandingPage';
import Artist from './pages/Artist';
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
          if (sub) {
            setSubData(sub);
            if (sub.status === 'approved' && sub.expires_at) {
              const exp = new Date(sub.expires_at);
              const now = new Date();
              const diffTime = exp - now;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              setDaysLeft(Math.max(0, diffDays));
            }
          }
        }
      });
    };
    fetchSub();
  }, []);

  const currentList = activeTab === 'liked' ? favorites : downloadedSongs;

  return (
    <div style={{padding: '2rem', color: '#fff'}} className="animate-fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
        <h2>Your Music Library</h2>

        {subData && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: subData.status === 'approved' ? '#4ade80' : '#f59e0b'}}></span>
            <span>Plan: <strong style={{color: '#fff', textTransform: 'capitalize'}}>{subData.plan_type}</strong></span>
            {subData.status === 'approved' ? (
              <span style={{color: '#4ade80', marginLeft: '4px'}}>({daysLeft} Days Left)</span>
            ) : (
              <span style={{color: '#f59e0b', marginLeft: '4px'}}>(Pending Approval)</span>
            )}
          </div>
        )}
      </div>

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem'}}>
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
          Downloaded Offline ({downloadedSongs.length})
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
  const { currentSong } = usePlayer();
  const [hasVisited, setHasVisited] = useState(() => {
    return localStorage.getItem('svar_has_visited') === 'true';
  });
  const [hasAccess, setHasAccess] = useState(() => {
    return localStorage.getItem('svar_skipped_paywall') === 'true';
  });
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isAiDjOpen, setIsAiDjOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  if (!hasVisited) {
    return (
      <LandingPage 
        onContinue={() => {
          localStorage.setItem('svar_has_visited', 'true');
          setHasVisited(true);
        }} 
      />
    );
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
      {/* Dynamic Ambient Background */}
      {currentSong && currentSong.image && (
        <div className="app-ambient-bg" style={{ backgroundImage: `url(${currentSong.image[2]?.link || currentSong.image[1]?.link || currentSong.image[0]?.link})` }}></div>
      )}
      <div className="app-ambient-overlay"></div>

      <Sidebar onOpenAiDj={() => setIsAiDjOpen(true)} onOpenPaywall={() => setIsPaywallOpen(true)} />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/artist/:id" element={<Artist />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </div>
      </main>
      <MusicPlayer />
      <QueueModal />
      <AIDjModal isOpen={isAiDjOpen} onClose={() => setIsAiDjOpen(false)} />
      <AuthModal />
      {isPaywallOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          <Paywall 
            onClose={() => setIsPaywallOpen(false)}
            onAccessGranted={(u, sub) => {
              setUser(u);
              setSubscription(sub);
              setHasAccess(true);
              setIsPaywallOpen(false);
            }} 
          />
        </div>
      )}
    </div>
  );
}

export default App;
