import React, { useState, useEffect } from 'react';
import './LandingPage.css';

const LandingPage = ({ onContinue }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("App installation is not supported or already installed on this device.");
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="landing-container animate-fade-in">
      <div className="landing-content">
        <div className="landing-logo">
          <span style={{ color: 'var(--text-main)', fontSize: '4rem', fontWeight: 'bold' }}>Svār</span>
        </div>
        <h1 className="landing-title">Your Ultimate Music Experience</h1>
        <p className="landing-desc">
          Stream your favorite Indian music, movies, and TV series anywhere, anytime. 
          Install our app for the best experience!
        </p>
        
        <div className="landing-actions">
          <button 
            className={`btn-primary ${!isInstallable ? 'btn-disabled' : ''}`} 
            onClick={handleInstallClick}
          >
            Download App (APK)
          </button>
          
          <button className="btn-secondary" onClick={onContinue}>
            Continue to Web App
          </button>
        </div>
        
        {!isInstallable && (
          <p className="install-note">
            * If the download button is disabled, the app might already be installed or your browser doesn't support automatic installation. You can "Add to Home Screen" from your browser menu.
          </p>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
