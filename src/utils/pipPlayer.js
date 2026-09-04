/**
 * Picture-in-Picture (PiP) Floating Mini-Player Utility
 * Supports Document Picture-in-Picture API with Canvas Video fallback.
 */

let pipWindow = null;

export async function openPictureInPicture({
  song,
  isPlaying,
  progress,
  duration,
  onTogglePlay,
  onPlayNext,
  onPlayPrev
}) {
  // 1. Document Picture-in-Picture (Chrome 111+, Edge)
  if ('documentPictureInPicture' in window) {
    try {
      if (pipWindow) {
        pipWindow.close();
        pipWindow = null;
        return null;
      }

      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 380,
      });

      // Copy stylesheet styles into the PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          if (styleSheet.href) {
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.padding = '16px';
      pipWindow.document.body.style.background = '#09090b';
      pipWindow.document.body.style.color = '#fff';
      pipWindow.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pipWindow.document.body.style.display = 'flex';
      pipWindow.document.body.style.flexDirection = 'column';
      pipWindow.document.body.style.alignItems = 'center';
      pipWindow.document.body.style.justifyContent = 'center';
      pipWindow.document.body.style.userSelect = 'none';

      const container = pipWindow.document.createElement('div');
      container.id = 'pip-content';
      container.style.width = '100%';
      container.style.textAlign = 'center';

      pipWindow.document.body.appendChild(container);

      updatePipContent({ song, isPlaying, progress, duration, onTogglePlay, onPlayNext, onPlayPrev });

      pipWindow.addEventListener('pagehide', () => {
        pipWindow = null;
      });

      return pipWindow;
    } catch (e) {
      console.warn('Document PiP request failed:', e);
    }
  }

  // Fallback: Notify user
  alert('Picture-in-Picture mini player is supported in Chrome, Edge, and modern browsers.');
  return null;
}

export function updatePipContent({ song, isPlaying, progress, duration, onTogglePlay, onPlayNext, onPlayPrev }) {
  if (!pipWindow || !pipWindow.document) return;
  const container = pipWindow.document.getElementById('pip-content');
  if (!container) return;

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  const imgUrl = typeof song?.image === 'string'
    ? song.image
    : (song?.image?.[2]?.url || song?.image?.[1]?.url || song?.image?.[0]?.url || 'https://via.placeholder.com/150');
  const title = song?.name || 'No song playing';
  const artist = song?.primaryArtists || 'Svar Music';

  // If DOM not built yet, construct structure once
  if (!pipWindow.document.getElementById('pip-progress-fill')) {
    container.innerHTML = `
      <div style="position: relative; margin-bottom: 12px; display: inline-block;">
        <img id="pip-art" src="${imgUrl}" style="width: 140px; height: 140px; border-radius: 12px; object-fit: cover; box-shadow: 0 8px 24px rgba(0,0,0,0.6);" />
      </div>
      <div id="pip-title" style="font-weight: 700; font-size: 15px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; margin-left: auto; margin-right: auto;">
        ${title}
      </div>
      <div id="pip-artist" style="font-size: 12px; color: #a1a1aa; margin-bottom: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; margin-left: auto; margin-right: auto;">
        ${artist}
      </div>

      <!-- Progress Bar -->
      <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin-bottom: 16px; overflow: hidden;">
        <div id="pip-progress-fill" style="width: ${pct}%; height: 100%; background: #1ed760; transition: width 0.05s linear;"></div>
      </div>

      <!-- Controls -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
        <button id="pip-prev-btn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 6px;">⏮</button>
        <button id="pip-play-btn" style="background: #fff; color: #000; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; font-size: 18px; font-weight: bold; display: flex; align-items: center; justify-content: center;">
          ${isPlaying ? '⏸' : '▶'}
        </button>
        <button id="pip-next-btn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 18px; padding: 6px;">⏭</button>
      </div>
    `;

    const playBtn = pipWindow.document.getElementById('pip-play-btn');
    const prevBtn = pipWindow.document.getElementById('pip-prev-btn');
    const nextBtn = pipWindow.document.getElementById('pip-next-btn');

    if (playBtn) playBtn.onclick = () => onTogglePlay && onTogglePlay();
    if (prevBtn) prevBtn.onclick = () => onPlayPrev && onPlayPrev();
    if (nextBtn) nextBtn.onclick = () => onPlayNext && onPlayNext();
    return;
  }

  // High-performance direct attribute updates
  const progressFill = pipWindow.document.getElementById('pip-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${pct}%`;
  }

  const artEl = pipWindow.document.getElementById('pip-art');
  if (artEl && artEl.src !== imgUrl) {
    artEl.src = imgUrl;
  }

  const titleEl = pipWindow.document.getElementById('pip-title');
  if (titleEl && titleEl.textContent !== title) {
    titleEl.textContent = title;
  }

  const artistEl = pipWindow.document.getElementById('pip-artist');
  if (artistEl && artistEl.textContent !== artist) {
    artistEl.textContent = artist;
  }

  const playBtn = pipWindow.document.getElementById('pip-play-btn');
  if (playBtn) {
    const desiredIcon = isPlaying ? '⏸' : '▶';
    if (playBtn.textContent.trim() !== desiredIcon) {
      playBtn.textContent = desiredIcon;
    }
  }
}

export function isPipActive() {
  return pipWindow !== null && !pipWindow.closed;
}

export function closePip() {
  if (pipWindow) {
    pipWindow.close();
    pipWindow = null;
  }
}
