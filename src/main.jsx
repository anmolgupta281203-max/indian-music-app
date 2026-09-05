import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
import { TimelineProvider } from './context/TimelineContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredPrompt = e;
});
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    if (
      error?.name === 'TypeError' ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed')
    ) {
      const hasReloaded = sessionStorage.getItem('svar_chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('svar_chunk_reload', 'true');
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.name === 'TypeError' ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed');

      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', background: '#09090b', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>{isChunkError ? 'New Version Available' : 'Something went wrong loading Svar'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', maxWidth: '450px', margin: '0 0 1.5rem' }}>
            {isChunkError ? 'A new update was deployed to Svar Music. Tap below to reload and access the latest features!' : 'An unexpected error occurred.'}
          </p>
          <button 
            onClick={() => { 
              sessionStorage.removeItem('svar_chunk_reload');
              localStorage.removeItem('svar_chunk_reload');
              window.location.reload(); 
            }}
            style={{ padding: '12px 28px', background: '#25D1DA', color: '#000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
          >
            {isChunkError ? 'Update & Reload App' : 'Reset & Reload App'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PlayerProvider>
          <TimelineProvider>
            <BrowserRouter>
              <App />
              <Analytics />
              <SpeedInsights />
            </BrowserRouter>
          </TimelineProvider>
        </PlayerProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
