import sys

with open('src/components/MusicPlayer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def replace_block(lines, target, replacement):
    target_lines = target.split('\n')
    replacement_lines = replacement.split('\n')
    for i in range(len(lines) - len(target_lines) + 1):
        match = True
        for j in range(len(target_lines)):
            if lines[i+j].rstrip('\r\n') != target_lines[j]:
                match = False
                break
        if match:
            return lines[:i] + [r + '\n' for r in replacement_lines] + lines[i+len(target_lines):]
    return lines

# 1. Imports
t1 = '''import ReactPlayer from 'react-player/youtube';
import './MusicPlayer.css';'''
r1 = '''import ReactPlayer from 'react-player/youtube';
import DownloadOptionsModal from './DownloadOptionsModal';
import './MusicPlayer.css';'''
lines = replace_block(lines, t1, r1)

# 2. usePlayer
t2 = '''    downloadedSongs, 
    handleDownloadToggle, 
    currentUrl, 
    openQueueModal, '''
r2 = '''    downloadedSongs, 
    handleDownloadToggle, 
    downloadSongToDevice,
    currentUrl, 
    openQueueModal, '''
lines = replace_block(lines, t2, r2)

# 3. State
t3 = '''  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  
  // Popovers'''
r3 = '''  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  
  // Popovers'''
lines = replace_block(lines, t3, r3)

# 4. Mini Player Button
t4 = '''          <button 
            className="action-btn" 
            onClick={() => handleDownloadToggle(currentSong)}
            title={isDownloaded ? "Remove Download" : "Download"}
          >
            <Download size={20} color={isDownloaded ? "var(--primary-color)" : "currentColor"} />
          </button>'''
r4 = '''          <button 
            className="action-btn" 
            onClick={() => setIsDownloadModalOpen(true)}
            title="Download Options"
          >
            <Download size={20} color={isDownloaded ? "var(--primary-color)" : "currentColor"} />
          </button>'''
lines = replace_block(lines, t4, r4)

# 5. Full Player Button
t5 = '''              <button 
                className="fs-action-circle"
                onClick={() => handleDownloadToggle(currentSong)}
                title="Download MP3"
              >
                <Download size={20} color="#fff" />
              </button>'''
r5 = '''              <button 
                className="fs-action-circle"
                onClick={() => setIsDownloadModalOpen(true)}
                title="Download Options"
              >
                <Download size={20} color={isDownloaded ? "#1ed760" : "#fff"} />
              </button>'''
lines = replace_block(lines, t5, r5)

# 6. End of component
t6 = '''        </div>
      </div>
    </>
  );
};'''
r6 = '''        </div>
      </div>
      
      <DownloadOptionsModal 
        song={currentSong}
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownloadInApp={handleDownloadToggle}
        onDownloadToDevice={downloadSongToDevice}
      />
    </>
  );
};'''
lines = replace_block(lines, t6, r6)

with open('src/components/MusicPlayer.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
