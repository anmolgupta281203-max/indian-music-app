import React, { useRef, useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';

export default function AudioVisualizer({ mode = 'bars', onToggleMode, isVisible = true }) {
  const canvasRef = useRef(null);
  const { isPlaying, nativeAudioRef } = usePlayer();
  const [activeMode, setActiveMode] = useState(mode);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let phase = 0;

    // Simulate reactive frequency data if Web Audio is idle / cross-origin protected
    const fakeBars = new Array(32).fill(0);

    const render = () => {
      const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 300;
      const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 80;
      ctx.clearRect(0, 0, width, height);

      const auraColor = getComputedStyle(document.documentElement).getPropertyValue('--aura-primary').trim() || '#1ed760';
      const auraSecondary = getComputedStyle(document.documentElement).getPropertyValue('--aura-secondary').trim() || '#a855f7';

      if (!isPlaying) {
        // Render calm resting baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      phase += 0.05;

      if (activeMode === 'bars') {
        // Neon Bars Frequency Spectrum
        const barCount = 28;
        const barWidth = (width / barCount) * 0.65;
        const gap = (width / barCount) * 0.35;

        for (let i = 0; i < barCount; i++) {
          // Dynamic harmonic movement
          const harmonic = Math.sin(phase * 1.8 + i * 0.35) * 0.5 + 0.5;
          const bassBoost = i < 6 ? Math.cos(phase * 2.5) * 0.4 + 0.6 : 0.8;
          const targetHeight = (harmonic * 0.7 + Math.random() * 0.3) * (height * 0.85) * bassBoost;
          
          fakeBars[i] = fakeBars[i] * 0.8 + targetHeight * 0.2;
          const barH = Math.max(fakeBars[i], 4);
          const x = i * (barWidth + gap) + gap / 2;
          const y = height - barH;

          // Gradient bar fill
          const grad = ctx.createLinearGradient(0, y, 0, height);
          grad.addColorStop(0, auraColor);
          grad.addColorStop(1, auraSecondary);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
          ctx.fill();

          // Glowing cap
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, y, barWidth, 2);
        }
      } else if (activeMode === 'wave') {
        // Fluid Oscilloscope Wave
        ctx.lineWidth = 3 * window.devicePixelRatio;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, auraColor);
        grad.addColorStop(0.5, '#fff');
        grad.addColorStop(1, auraSecondary);
        ctx.strokeStyle = grad;

        ctx.beginPath();
        const slices = 40;
        const sliceWidth = width / slices;

        for (let i = 0; i <= slices; i++) {
          const x = i * sliceWidth;
          const wave1 = Math.sin(phase * 2 + i * 0.25) * (height * 0.28);
          const wave2 = Math.cos(phase * 1.3 - i * 0.15) * (height * 0.18);
          const y = height / 2 + wave1 + wave2;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Secondary soft glow wave
        ctx.lineWidth = 6 * window.devicePixelRatio;
        ctx.strokeStyle = auraColor.replace('rgb', 'rgba').replace(')', ', 0.25)');
        ctx.stroke();
      } else if (activeMode === 'pulse') {
        // Aura Beat Ring
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.28;
        const pulse = Math.sin(phase * 2.2) * 8 + 8;

        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = auraSecondary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + pulse * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, activeMode, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="audio-visualizer-container" 
      onClick={onToggleMode}
      title="Click to change visualizer mode (Bars / Wave / Pulse)"
      style={{
        width: '100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', maxWidth: '340px' }}
      />
    </div>
  );
}
