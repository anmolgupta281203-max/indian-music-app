import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Maximize, Play, Pause, Users, Heart, Flame, ThumbsUp, Copy, Check } from 'lucide-react';
import ReactPlayer from 'react-player/youtube';
import { getSeriesDetails, getSeasonDetails, getImageUrl } from '../services/tmdbApi';

import './VideoPlayer.css';

const SERVERS = [
  { id: '2embed', name: 'Server 1 (2Embed)' },
  { id: 'vidsrc.me', name: 'Server 2 (VidSrc)' },
  { id: 'multiembed', name: 'Server 3 (MultiEmbed)' },
  { id: 'superembed', name: 'Server 4 (SuperEmbed)' },
  { id: 'vidsrc.cc', name: 'Server 5 (VidSrc CC)' }
];

const VideoPlayer = ({ video, onClose, onEnded }) => {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [server, setServer] = useState('2embed');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(false);
  
  // Watch Party & Reactions State
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [roomCode] = useState(() => `SVAR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState([]);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [musicVideoId, setMusicVideoId] = useState(null);
  const [controlsActive, setControlsActive] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const hideControlsTimeout = useRef(null);

  const handleMouseMove = () => {
    setControlsActive(true);
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => setControlsActive(false), 3500);
    }
  };

  const handleMouseLeave = () => {
    if (isPlaying) setControlsActive(false);
  };


  const handleProgress = (state) => {
    if (!isSeeking) {
      setPlayedSeconds(state.playedSeconds);
    }
  };

  const handleDuration = (dur) => {
    setDuration(dur);
  };

  const handleSeekChange = (e) => {
    setIsSeeking(true);
    const fraction = parseFloat(e.target.value);
    setPlayedSeconds(fraction * duration);
  };

  const handleSeekMouseUp = (e) => {
    setIsSeeking(false);
    if (playerRef.current) {
      const fraction = parseFloat(e.target.value);
      playerRef.current.seekTo(fraction, 'fraction');
    }
  };

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      const elem = containerRef.current;
      const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
      if (requestFS) {
        try {
          await Promise.resolve(requestFS.call(elem));
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            await window.screen.orientation.lock('landscape').catch(() => {});
          }
        } catch (e) {
          console.warn("Fullscreen or orientation lock failed", e);
        }
      }
    } else {
      const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exitFS) {
        try {
          await Promise.resolve(exitFS.call(document));
          if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
            window.screen.orientation.unlock();
          }
        } catch (e) {
          console.warn("Exit fullscreen failed", e);
        }
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const addReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(20 + Math.random() * 60);
    setReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (video?.media_type === 'tv') {
      getSeriesDetails(video.id).then(details => {
        if (details) {
          setSeriesDetails(details);
        }
      });
    }
  }, [video]);

  const [seasonData, setSeasonData] = useState(null);
  
  useEffect(() => {
    if (video?.media_type === 'tv' && season) {
      getSeasonDetails(video.id, season).then(data => {
        if (data) {
          setSeasonData(data);
        }
      });
    }
  }, [video, season]);

  useEffect(() => {
    setIsVideoLoading(true);
    setPlayedSeconds(0);
    setDuration(0);

    // Music video: search YouTube for the official video
    if (video.type === 'music-video') {
      setIsVideoLoading(true);
      setIsPlaying(false);
      const query = `${video.name || video.title} ${video.artist || ''} official video`;
      fetch(`/api/yt-search?q=${encodeURIComponent(query)}&limit=1`)
        .then(r => r.json())
        .then(data => {
          const vid = data?.results?.[0]?.videoId || data?.videoIds?.[0];
          if (vid) {
            // Reuse the 'youtube' rendering path by patching video id in state
            setMusicVideoId(vid);
          }
          setIsVideoLoading(false);
          setIsPlaying(true);
        })
        .catch(() => setIsVideoLoading(false));
      return;
    }

    if (video.type === 'youtube') {
      setIsVideoLoading(false);
      setIsPlaying(true);
      return;
    }

    let src = '';
    if (video.media_type === 'movie') {
      switch (server) {
        case 'vidsrc.me': src = `https://vidsrc.me/embed/movie?tmdb=${video.id}`; break;
        case 'multiembed': src = `https://multiembed.mov/?video_id=${video.id}&tmdb=1`; break;
        case 'superembed': src = `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1`; break;
        case 'vidsrc.cc': src = `https://vidsrc.cc/v2/embed/movie/${video.id}`; break;
        case '2embed': default: src = `https://www.2embed.cc/embed/${video.id}?server=vcr`; break;
      }
    } else {
      switch (server) {
        case 'vidsrc.me': src = `https://vidsrc.me/embed/tv?tmdb=${video.id}&season=${season}&episode=${episode}`; break;
        case 'multiembed': src = `https://multiembed.mov/?video_id=${video.id}&tmdb=1&s=${season}&e=${episode}`; break;
        case 'superembed': src = `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1&s=${season}&e=${episode}`; break;
        case 'vidsrc.cc': src = `https://vidsrc.cc/v2/embed/tv/${video.id}/${season}/${episode}`; break;
        case '2embed': default: src = `https://www.2embed.cc/embedtv/${video.id}?s=${season}&e=${episode}&server=vcr`; break;
      }
    }
    setIframeSrc(src);
  }, [video, server, season, episode]);

  // Attempt to auto-fullscreen and lock to landscape when a video is opened on mobile
  useEffect(() => {
    if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      const elem = containerRef.current;
      if (elem) {
        const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
        if (requestFS) {
          try {
            Promise.resolve(requestFS.call(elem)).then(() => {
              if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
                window.screen.orientation.lock('landscape').catch(() => {});
              }
            }).catch(() => {
              // Silently fail if gesture token expired
            });
          } catch (err) {}
        }
      }
    }
  }, []);

  const [needsFullscreen, setNeedsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        setNeedsFullscreen(true);
      } else {
        setNeedsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleReenterFullscreen = () => {
    setNeedsFullscreen(false);
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => {
          if (window.screen?.orientation?.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isPlaying) {
      if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => setControlsActive(false), 3500);
    } else {
      setControlsActive(true);
    }
  }, [isPlaying]);

  if (!video) return null;

  return ReactDOM.createPortal(
    <div className="video-modal-overlay">
      <div 
        className={`video-theater ${controlsActive ? 'controls-active' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="video-main-content" style={{ paddingRight: showSidebar && video.media_type === 'tv' ? '380px' : '0' }}>
          
          <div className="video-iframe-container" ref={containerRef}>
            {/* The actual video player */}
            {(video.type === 'youtube' || video.type === 'music-video') ? (
              (() => {
                const ytId = video.type === 'music-video' ? musicVideoId : video.id;
                if (!ytId) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, color: '#fff' }}>
                      <div className="spinner" />
                      <span>Searching for video...</span>
                    </div>
                  );
                }
                return (
                  <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ width: '100%', height: '100%' }}>
                        <ReactPlayer
                          ref={playerRef}
                          url={`https://www.youtube.com/watch?v=${ytId}`}
                          playing={isPlaying}
                          controls={false}
                          onEnded={onEnded}
                          onProgress={handleProgress}
                          onDuration={handleDuration}
                          width="100%"
                          height="100%"
                          style={{ position: 'absolute', top: 0, left: 0 }}
                          config={{
                            youtube: {
                              playerVars: { 
                                playsinline: 1, rel: 0, showinfo: 0, controls: 0, disablekb: 1, iv_load_policy: 3, cc_load_policy: 0
                              }
                            }
                          }}
                        />
                      </div>

                      {/* Click catcher for play/pause */}
                      <div 
                        style={{ position: 'absolute', top: '80px', bottom: '60px', left: 0, right: 0, zIndex: 15, cursor: 'pointer' }}
                        onClick={() => setIsPlaying(!isPlaying)}
                      ></div>
                      
                      {/* Play icon overlay */}
                      {!isPlaying && (
                        <div 
                          onClick={() => setIsPlaying(true)}
                          style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: '50%', width: '80px', height: '80px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20
                          }}
                        >
                          <Play size={40} fill="white" color="white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Minimal internal seek bar for YT */}
                    <div style={{
                      height: '60px', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '20px', zIndex: 30
                    }}>
                      <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                      <div style={{ color: 'white', fontSize: '13px', minWidth: '45px', fontWeight: 'bold' }}>{formatTime(playedSeconds)}</div>
                      <input 
                        type="range" min={0} max={0.999999} step="any"
                        value={duration ? playedSeconds / duration : 0}
                        onChange={handleSeekChange}
                        onMouseUp={handleSeekMouseUp}
                        onTouchEnd={handleSeekMouseUp}
                        className="custom-video-slider"
                        style={{ flex: 1 }}
                      />
                      <div style={{ color: 'white', fontSize: '13px', minWidth: '45px', fontWeight: 'bold' }}>{formatTime(duration)}</div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <iframe
                className="video-iframe"
                src={iframeSrc}
                allowFullScreen
                sandbox={adBlockEnabled ? "allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox" : undefined}
              ></iframe>
            )}
          </div>

          {/* Cinematic Overlay (Slides in on hover) */}
          <div className="video-controls-overlay">
            {/* Top Bar */}
            <div className="video-top-controls">
              <div className="video-title-area">
                <h2>{video.name || video.title || 'Playing Video'}</h2>
                <div className="video-subtitle">
                  {video.media_type === 'tv' ? `Season ${season} • Episode ${episode} ${seasonData ? '• ' + seasonData.episodes.find(e => e.episode_number === episode)?.name : ''}` : 'Feature Film'}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => setShowWatchParty(!showWatchParty)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '10px 16px', borderRadius: '30px', fontWeight: 'bold', backdropFilter: 'blur(10px)', cursor: 'pointer' }}
                >
                  <Users size={16} /> Watch Party
                </button>
                <button className="video-modal-close" onClick={() => {
                  if (document.fullscreenElement) document.exitFullscreen().catch(e => console.log(e));
                  onClose();
                }}>
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Floating Reactions */}
            <div style={{ position: 'absolute', bottom: '120px', left: 0, right: 0, pointerEvents: 'none', height: '300px', overflow: 'hidden' }}>
              {reactions.map(r => (
                <div key={r.id} className="floating-emoji" style={{ left: `${r.left}%` }}>{r.emoji}</div>
              ))}
            </div>

            {/* Bottom Bar */}
            <div className="video-bottom-controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {video.type !== 'youtube' && video.type !== 'music-video' && (
                  <div className="server-selector">
                    <span className="server-label">Server</span>
                    <select value={server} onChange={(e) => setServer(e.target.value)}>
                      {SERVERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Ad-Block</span>
                  <label className="switch">
                    <input type="checkbox" checked={adBlockEnabled} onChange={(e) => setAdBlockEnabled(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              
              <div className="toolbar-actions">
                <button 
                  onClick={toggleFullScreen}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Maximize size={20} />
                </button>
                
                {video.media_type === 'tv' && (
                  <button 
                    className={`toggle-sidebar-btn ${showSidebar ? 'active' : ''}`}
                    onClick={() => setShowSidebar(!showSidebar)}
                  >
                    Episodes
                  </button>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Watch Party Bar */}
        {showWatchParty && (
          <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(30, 27, 75, 0.9)', backdropFilter: 'blur(10px)', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '24px', borderRadius: '16px', zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>Room Code:</span>
              <code style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '6px', fontSize: '16px', letterSpacing: '2px' }}>{roomCode}</code>
              <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['😂', '🔥', '❤️', '🤯'].map(emoji => (
                <button key={emoji} onClick={() => addReaction(emoji)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', fontSize: '20px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>{emoji}</button>
              ))}
            </div>
          </div>
        )}

        {/* Sidebar for TV Episodes */}
        {video.media_type === 'tv' && (
          <div className={`episodes-sidebar ${showSidebar ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h3>{video.name || video.title}</h3>
              <div className="ep-nav-btns">
                {seriesDetails?.seasons?.filter(s => s.season_number > 0).map(s => (
                  <button 
                    key={s.season_number} 
                    className={s.season_number === season ? 'active' : ''}
                    onClick={() => { setSeason(s.season_number); setEpisode(1); }}
                  >
                    Season {s.season_number}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="episodes-list">
              {seasonData?.episodes ? (
                seasonData.episodes.map((ep) => (
                  <div 
                    key={ep.id} 
                    className={`episode-card ${episode === ep.episode_number ? 'active' : ''}`}
                    onClick={() => setEpisode(ep.episode_number)}
                  >
                    <div className="episode-card-thumb">
                      <img src={getImageUrl(ep.still_path, 'w300')} alt={ep.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/300x169?text=No+Image' }} />
                      <div className="play-overlay"><Play size={24} fill="white" color="white" /></div>
                    </div>
                    <div className="episode-card-info">
                      <h4 className="episode-card-title">{ep.episode_number}. {ep.name}</h4>
                      <p className="episode-card-meta">{ep.runtime ? `${ep.runtime} min` : ''} • {ep.air_date ? new Date(ep.air_date).getFullYear() : ''}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading episodes...</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default VideoPlayer;