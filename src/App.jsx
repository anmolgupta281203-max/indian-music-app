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
import AuthModal from './components/AuthModal';
import RetroPlayerView from './components/RetroPlayerView';
import Paywall from './components/Paywall';
import AdminPanel from './pages/AdminPanel';
import Artist from './pages/Artist';
import { useLocation } from 'react-router-dom';
import { Download, Play, Trash2, HardDrive, WifiOff } from 'lucide-react';
import { supabase } from './services/supabase';
import { extractDominantColors } from './utils/colorExtractor';
import { getSongDetails } from './services/api';
import { deleteOfflineSong, getAllOfflineSongs } from './utils/offlineStorage';

const Library = () => {
  const { 
    favorites, 
    downloadedSongs, 
    setDownloadedSongs, 
    playSong, 
    openQueueModal, 
    queue, 
    handleDownloadToggle 
  } = usePlayer();
  const [activeTab, setActiveTab] = useState(() => !navigator.onLine ? 'downloaded' : 'liked');
  const [subData, setSubData] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const isOffline = !navigator.onLine;

  const totalSizeMb = (downloadedSongs.reduce((acc, s) => {
    return acc + (s.blobSize || s.blob?.size || 4.2 * 1024 * 1024);
  }, 0) / (1024 * 1024)).toFixed(1);

  const syncAllLikedSongs = async () => {
    if (favorites.length === 0 || isSyncingOffline) return;
    setIsSyncingOffline(true);
    const downloadedIds = new Set(downloadedSongs.map(s => s.id));
    const toDownload = favorites.filter(s => !downloadedIds.has(s.id));
    
    setSyncProgress({ current: 0, total: toDownload.length });
    let count = 0;

    for (const song of toDownload) {
      count++;
      setSyncProgress({ current: count, total: toDownload.length });
      try {
        await handleDownloadToggle(song);
      } catch (e) {}
    }
    setIsSyncingOffline(false);
  };

  const handleClearAllOffline = async () => {
    if (window.confirm(`Delete all ${downloadedSongs.length} downloaded songs from offline storage?`)) {
      for (const song of downloadedSongs) {
        await deleteOfflineSong(song.id);
      }
      const refreshed = await getAllOfflineSongs();
      setDownloadedSongs(refreshed);
    }
  };

  React.useEffect(() => {
    const fetchSub = async () => {
      try {
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
      } catch (e) {
        console.warn('Subscription check error:', e);
      }
    };
    fetchSub();
  }, []);

  const currentList = activeTab === 'liked' ? favorites : downloadedSongs;

  return (
    <div style={{padding: '2rem', color: '#fff'}} className="animate-fade-in">
      {isOffline && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '1.5rem',
          fontSize: '14px'
        }}>
          <WifiOff size={18} />
          <span><strong>Offline Mode Active:</strong> You are currently disconnected. Enjoy all your downloaded offline music!</span>
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h2 style={{margin: 0}}>Your Music Library</h2>
          {activeTab === 'downloaded' && (
            <p style={{margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <HardDrive size={14} color="var(--primary-color)" />
              <span>{downloadedSongs.length} tracks offline • ~{totalSizeMb} MB cached locally</span>
            </p>
          )}
        </div>

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

      <div style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center'}}>
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

        {activeTab === 'liked' && favorites.length > 0 && (
          <button 
            className="filter-pill"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              marginLeft: 'auto', 
              background: isSyncingOffline ? 'rgba(30,215,96,0.2)' : 'rgba(255,255,255,0.08)', 
              color: isSyncingOffline ? '#1ed760' : '#fff',
              borderColor: isSyncingOffline ? '#1ed760' : undefined
            }}
            onClick={syncAllLikedSongs}
            disabled={isSyncingOffline}
            title="Download all liked songs for offline listening"
          >
            <Download size={15} />
            <span>{isSyncingOffline ? `Syncing (${syncProgress.current}/${syncProgress.total})...` : 'Download All Offline'}</span>
          </button>
        )}

        {activeTab === 'downloaded' && downloadedSongs.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button 
              className="filter-pill active"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', color: '#000', fontWeight: 'bold' }}
              onClick={() => playSong(downloadedSongs[0], downloadedSongs)}
              title="Play all downloaded songs"
            >
              <Play size={14} fill="currentColor" />
              <span>Play All</span>
            </button>
            <button 
              className="filter-pill"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff7b72', borderColor: 'rgba(255,123,114,0.3)' }}
              onClick={handleClearAllOffline}
              title="Clear all offline songs"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {currentList.length === 0 ? (
        <div style={{
          padding: '3rem 1rem', 
          textAlign: 'center', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '16px', 
          border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <p style={{color: 'var(--text-secondary)', margin: 0, fontSize: '15px'}}>
            {activeTab === 'liked' 
              ? "You haven't liked any songs yet. Tap the heart on any track to save it here!" 
              : "No songs downloaded yet. Tap the download icon on any song to save it for offline listening without internet!"}
          </p>
        </div>
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
  const { currentSong, playSong, nativeAudioRef } = usePlayer();
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isAiDjOpen, setIsAiDjOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [auraStyle, setAuraStyle] = useState(null);
  const [isRetroOpen, setIsRetroOpen] = useState(true);
  
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Dynamic Color Aura from Album Art
  React.useEffect(() => {
    if (!currentSong) return;
    const imgUrl = typeof currentSong.image === 'string'
      ? currentSong.image
      : (currentSong.image?.[2]?.url || currentSong.image?.[1]?.url || currentSong.image?.[0]?.url || '');
    if (imgUrl) {
      extractDominantColors(imgUrl).then(colors => {
        document.documentElement.style.setProperty('--aura-primary', colors.primary);
        document.documentElement.style.setProperty('--aura-secondary', colors.secondary);
        document.documentElement.style.setProperty('--aura-glow', colors.glow);
        setAuraStyle({
          background: `radial-gradient(circle at 20% 20%, ${colors.primary} 0%, transparent 60%), radial-gradient(circle at 80% 80%, ${colors.secondary} 0%, transparent 60%)`
        });
      });
    }
  }, [currentSong?.id]);

  // Timestamp & Song Deep Linking: ?song=id&t=seconds
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const songId = params.get('song');
    const seekTime = parseFloat(params.get('t') || '0');
    if (songId) {
      getSongDetails(songId).then(song => {
        if (song) {
          playSong(song);
          if (seekTime > 0) {
            setTimeout(() => {
              if (nativeAudioRef?.current) {
                nativeAudioRef.current.currentTime = seekTime;
              }
            }, 800);
          }
        }
      }).catch(err => console.warn('Deep link song load failed:', err));
    }
  }, []);

  if (isAdminRoute) {
    return <AdminPanel />;
  }

  return (
    <div className="app-container">
      {/* Dynamic Ambient Background with Color Aura */}
      {currentSong && currentSong.image && (() => {
        const bgUrl = typeof currentSong.image === 'string'
          ? currentSong.image
          : (currentSong.image[2]?.url || currentSong.image[1]?.url || currentSong.image[0]?.url || currentSong.image[2]?.link || '');
        return bgUrl ? (
          <>
            <div className="app-ambient-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
            {auraStyle && <div className="app-ambient-aura" style={auraStyle} />}
          </>
        ) : null;
      })()}
      <div className="app-ambient-overlay"></div>

      <Sidebar onOpenAiDj={() => setIsAiDjOpen(true)} onOpenPaywall={() => setIsPaywallOpen(true)} />
      
      <div className="app-main-layout">
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          <TopNav onToggleRetro={() => setIsRetroOpen(prev => !prev)} isRetroOpen={isRetroOpen} />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/artist/:id" element={<Artist />} />
              <Route path="/library" element={<Library />} />
            </Routes>
          </div>
        </main>

        <RetroPlayerView isOpen={isRetroOpen} onClose={() => setIsRetroOpen(false)} />
      </div>
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
