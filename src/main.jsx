import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext.jsx'
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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#ff6b6b', background: '#09090b', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#fff' }}>Something went wrong loading Svar</h2>
          <pre style={{ background: 'rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', color: '#ff7b72' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '1.5rem', padding: '12px 24px', background: '#25D1DA', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reset Cache & Reload App
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
          <BrowserRouter>
            <App />
            <Analytics />
            <SpeedInsights />
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
