import re

with open('src/components/VideoPlayer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new JSX return block
new_return = """  return ReactDOM.createPortal(
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
                src={
                  server === '2embed' 
                    ? (video.media_type === 'tv' ? `https://www.2embed.cc/embedtv/${video.id}&s=${season}&e=${episode}` : `https://www.2embed.cc/embed/${video.id}`)
                    : server === 'vidsrc.me'
                    ? (video.media_type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${video.id}&season=${season}&episode=${episode}` : `https://vidsrc.me/embed/movie?tmdb=${video.id}`)
                    : server === 'vidsrc.cc'
                    ? (video.media_type === 'tv' ? `https://vidsrc.cc/v3/embed/tv/${video.id}/${season}/${episode}` : `https://vidsrc.cc/v3/embed/movie/${video.id}`)
                    : server === 'multiembed'
                    ? (video.media_type === 'tv' ? `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1&s=${season}&e=${episode}` : `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1`)
                    : (video.media_type === 'tv' ? `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1&s=${season}&e=${episode}` : `https://multiembed.mov/directstream.php?video_id=${video.id}&tmdb=1`)
                }
                allowFullScreen
                sandbox={adBlockEnabled ? "allow-scripts allow-same-origin" : "allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"}
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

export default VideoPlayer;"""

# Split the file at "return ReactDOM.createPortal("
parts = content.split("  return ReactDOM.createPortal(", 1)
if len(parts) == 2:
    new_content = parts[0] + new_return
    with open('src/components/VideoPlayer.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Could not find return statement")
