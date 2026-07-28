import React, { useState, useEffect } from 'react';
import './PromoBanner.css';

// You can add your actual affiliate links and promotional content here
const ads = [
  {
    id: 1,
    title: "Protect Your Privacy",
    description: "Get 70% off Surfshark VPN today + 2 months free!",
    buttonText: "Claim Offer",
    link: "https://surfshark.com" // Replace with your affiliate link
  },
  {
    id: 2,
    title: "Listen Ad-Free",
    description: "Upgrade to Spotify Premium for 3 months free.",
    buttonText: "Learn More",
    link: "https://spotify.com" // Replace with your affiliate link
  },
  {
    id: 3,
    title: "Web Hosting Deal",
    description: "Start your own website for just $2.95/mo with Bluehost.",
    buttonText: "Start Now",
    link: "https://bluehost.com" // Replace with your affiliate link
  }
];

const PromoBanner = () => {
  const [isApp, setIsApp] = useState(false);
  const [currentAd, setCurrentAd] = useState(ads[0]);

  useEffect(() => {
    // Check if the user is using the installed Android app (PWA standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsApp(isStandalone);

    // Pick a random ad to display
    const randomAd = ads[Math.floor(Math.random() * ads.length)];
    setCurrentAd(randomAd);
  }, []);

  // DO NOT SHOW ADS IF IT IS THE INSTALLED APP
  if (isApp) return null;

  return (
    <div className="promo-banner-container">
      <div className="promo-badge">Ad</div>
      <div className="promo-content">
        <h4>{currentAd.title}</h4>
        <p>{currentAd.description}</p>
        <a href={currentAd.link} target="_blank" rel="noopener noreferrer" className="promo-btn">
          {currentAd.buttonText}
        </a>
      </div>
    </div>
  );
};

export default PromoBanner;
