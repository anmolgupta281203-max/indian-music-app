import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Maximize, Play, Pause } from 'lucide-react';
import ReactPlayer from 'react-player/youtube';
import { getSeriesDetails, getSeasonDetails, getImageUrl } from '../services/tmdbApi';

import './VideoPlayer.css';

const SERVERS = [
  { id: 'vidsrc.cc', name: 'Server 1 (VidSrc.cc) [Recommended]' },
  { id: 'embed.su', name: 'Server 2 (Embed.su) [HD]' },
  { id: 'multiembed', name: 'Server 3 (MultiEmbed)' },
  { id: 'vidsrc.in', name: 'Server 4 (VidSrc.in)' },
  { id: 'autoembed', name: 'Server 5 (AutoEmbed)' },
  { id: 'vidlink', name: 'Server 6 (VidLink)' }
];

const VideoPlayer = ({ video, onClose, onEnded }) => {
  const [iframeSrc, setIframeSrc] = useState(null);
  const [server, setServer] = useState('vidsrc.cc'); // Set vidsrc.cc as default working server
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adBlockEnabled, setAdBlockEnabled] = useState(false);
  
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

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
    setPlayedSeconds(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e) => {
    setIsSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat(e.target.value), 'seconds');
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
    if (video.type === 'youtube') {
      setIsVideoLoading(false);
      setIsPlaying(true);
      return;
    }

    let src = '';
    if (video.media_type === 'movie') {
      switch (server) {
        case 'embed.su': src = `https://embed.su/embed/movie/${video.id}`; break;
        case 'multiembed': src = `https://multiembed.mov/?video_id=${video.id}&tmdb=1`; break;
        case 'vidsrc.in': src = `https://vidsrc.in/embed/movie?tmdb=${video.id}`; break;
        case 'autoembed': src = `https://autoembed.co/movie/tmdb/${video.id}`; break;
        case 'vidlink': src = `https://vidlink.pro/movie/${video.id}`; break;
        case 'vidsrc.cc': default: src = `https://vidsrc.cc/v2/embed/movie/${video.id}`; break;
      }
    } else if (video.media_type === 'tv') {
      switch (server) {
        case 'embed.su': src = `https://embed.su/embed/tv/${video.id}/${season}/${episode}`; break;
        case 'multiembed': src = `https://multiembed.mov/?video_id=${video.id}&tmdb=1&s=${season}&e=${episode}`; break;
        case 'vidsrc.in': src = `https://vidsrc.in/embed/tv?tmdb=${video.id}&season=${season}&episode=${episode}`; break;
        case 'autoembed': src = `https://autoembed.co/tv/tmdb/${video.id}-${season}-${episode}`; break;
        case 'vidlink': src = `https://vidlink.pro/tv/${video.id}/${season}/${episode}`; break;
        case 'vidsrc.cc': default: src = `https://vidsrc.cc/v2/embed/tv/${video.id}/${season}/${episode}`; break;
      }
    }
    setIframeSrc(src);
  }, [video, server, season, episode]);

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

  if (!video) return null;

  return ReactDOM.createPortal(
    <div className="video-modal-overlay">
      <div className="video-controls-header">
        {video.type !== 'youtube' && (
          <div className="server-selector" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="server-label">Server:</span>
              <select value={server} onChange={(e) => setServer(e.target.value)}>
                {SERVERS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,0,0,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,0,0,0.3)' }}>
              <span style={{ fontSize: '12px', color: '#ff4444', fontWeight: 'bold' }}>Ad-Blocker:</span>
              <label className="switch" style={{ width: '34px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={adBlockEnabled}
                  onChange={(e) => setAdBlockEnabled(e.target.checked)}
                />
                <span className="slider round" style={{ background: adBlockEnabled ? '#ff4444' : '#ccc' }}></span>
              </label>
            </div>

            {video.media_type === 'tv' && (
              <div className="ep-selector">
                <div className="ep-nav-btns">
                  <button onClick={() => setEpisode(Math.max(1, episode - 1))}>Prev Ep</button>
                  <button onClick={() => {
                    const maxEp = seasonData ? seasonData.episodes.length : 999;
                    if (episode < maxEp) {
                      setEpisode(episode + 1);
                    } else if (seriesDetails) {
                      const seasons = seriesDetails.seasons?.filter(s => s.season_number > 0) || [];
                      const currentIdx = seasons.findIndex(s => s.season_number === season);
                      if (currentIdx !== -1 && currentIdx < seasons.length - 1) {
                        setSeason(seasons[currentIdx + 1].season_number);
                        setEpisode(1);
                      }
                    }
                  }}>Next Ep</button>
                </div>
              </div>
            )}
          </div>
        )}
        <button className="video-modal-close" onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log(e));
          }
          if (window.screen?.orientation?.unlock) {
            window.screen.orientation.unlock();
          }
          onClose();
        }}>
          <X size={24} />
        </button>
      </div>

      <div className="video-modal-content animate-fade-in">
        {video.type === 'youtube' ? (
          <div 
            ref={containerRef}
            style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={{ width: '100%', height: '100%' }}>
                <ReactPlayer
                  ref={playerRef}
                  url={`https://www.youtube.com/watch?v=${video.id}`}
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
                        playsinline: 1,
                        rel: 0,
                        showinfo: 0,
                        controls: 0,
                        disablekb: 1,
                        iv_load_policy: 3,
                        cc_load_policy: 0
                      }
                    }
                  }}
                />
              </div>

              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', zIndex: 10 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', zIndex: 10 }}></div>
              
              <div 
                style={{ position: 'absolute', top: '80px', bottom: '60px', left: 0, right: 0, zIndex: 15, cursor: 'pointer' }}
                onClick={() => setIsPlaying(!isPlaying)}
              ></div>
              
              {!isPlaying && (
                <div 
                  onClick={() => setIsPlaying(true)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 20
                  }}
                >
                  <div style={{ 
                    width: 0, 
                    height: 0, 
                    borderTop: '12px solid transparent', 
                    borderBottom: '12px solid transparent', 
                    borderLeft: '20px solid white', 
                    marginLeft: '4px' 
                  }}></div>
                </div>
              )}
            </div>

            <div style={{
              height: '50px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 15px',
              gap: '15px',
              zIndex: 30
            }}>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <div style={{ color: 'white', fontSize: '12px', minWidth: '40px' }}>
                {formatTime(playedSeconds)}
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step="any"
                value={playedSeconds}
                onChange={handleSeekChange}
                onMouseUp={handleSeekMouseUp}
                onTouchEnd={handleSeekMouseUp}
                className="custom-video-slider"
                style={{
                  flex: 1, 
                  cursor: 'pointer', 
                  background: `linear-gradient(to right, var(--primary-color) ${(playedSeconds / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(playedSeconds / (duration || 1)) * 100}%)`
                }}
              />
              <div style={{ color: 'white', fontSize: '12px', minWidth: '40px' }}>
                {formatTime(duration)}
              </div>
              <button 
                onClick={toggleFullScreen}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Maximize size={20} />
              </button>
            </div>
          </div>
        ) : (
          iframeSrc && (
            <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black' }}>
              <iframe 
                src={iframeSrc} 
                className="video-iframe"
                allowFullScreen
                allow="autoplay; fullscreen"
                {...(adBlockEnabled ? { sandbox: "allow-same-origin allow-scripts allow-forms" } : {})}
                style={{ width: '100%', height: '100%', border: 'none' }}
              ></iframe>
              {needsFullscreen && (
                <div 
                  onClick={handleReenterFullscreen}
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'white', zIndex: 50, cursor: 'pointer'
                  }}
                >
                  <Maximize size={48} style={{ marginBottom: '16px' }} />
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Resume Fullscreen</h3>
                  <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>(Tap to fix rotation after ad)</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {video.media_type === 'tv' && seasonData && (
        <div className="episodes-list-container">
          <div className="season-header">
            <div className="season-badge">{season}</div>
            <div className="season-info">
              <h3>
                Season {season}
                {seasonData.air_date && <span className="season-date">{new Date(seasonData.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
              </h3>
              {video.vote_average > 0 && (
                <div className="season-rating">
                  <span style={{ color: '#ffd700' }}>★</span> {(video.vote_average).toFixed(1)}
                </div>
              )}
            </div>
          </div>
          
          <div className="episodes-list">
            {seasonData.episodes.map(ep => (
              <div 
                key={ep.id} 
                className={`episode-row ${episode === ep.episode_number ? 'active' : ''}`}
                onClick={() => setEpisode(ep.episode_number)}
              >
                <div className="episode-thumb">
                  {ep.still_path ? (
                    <img src={getImageUrl(ep.still_path, 'w300')} alt={ep.name} />
                  ) : (
                    <span style={{ color: '#666' }}>No Image</span>
                  )}
                </div>
                <div className="episode-number">{season} - {ep.episode_number}</div>
                <div className="episode-details">
                  <h4 className="episode-title">{ep.name}</h4>
                  {ep.air_date && <p className="episode-date">{new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>,
    document.body
  );
};

export default VideoPlayer;
