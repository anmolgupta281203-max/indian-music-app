import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

const TimelineContext = createContext(null);

export const TimelineProvider = ({ children }) => {
  const { 
    currentSong, 
    isPlaying, 
    youtubeVideoId, 
    nativeAudioRef, 
    ytPlayerRef 
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const isSeekingRef = useRef(false);

  // Sync timeline progress from native audio
  useEffect(() => {
    const audio = nativeAudioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (!youtubeVideoId && !isSeekingRef.current) {
        const cur = audio.currentTime || 0;
        setProgress(cur);
        const dur = audio.duration;
        let activeDur = 0;
        if (dur && isFinite(dur) && dur > 0) {
          activeDur = dur;
          setDuration(dur);
        } else if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
          activeDur = currentSong.duration;
          setDuration(currentSong.duration);
        }
        if ('mediaSession' in navigator && activeDur > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: activeDur,
              playbackRate: 1,
              position: Math.min(cur, activeDur)
            });
          } catch (e) {}
        }
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('durationchange', updateProgress);
    audio.addEventListener('canplay', updateProgress);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('durationchange', updateProgress);
      audio.removeEventListener('canplay', updateProgress);
    };
  }, [youtubeVideoId, currentSong, nativeAudioRef]);

  // Real-time timeline synchronization (smooth 60fps & YouTube/native tracking)
  useEffect(() => {
    let animFrame;
    const tick = () => {
      if (isPlaying && !isSeekingRef.current) {
        if (!youtubeVideoId && nativeAudioRef?.current) {
          const cur = nativeAudioRef.current.currentTime || 0;
          setProgress(cur);
          const audioDur = nativeAudioRef.current.duration;
          if (audioDur && isFinite(audioDur) && audioDur > 0) {
            setDuration(audioDur);
          }
        } else if (youtubeVideoId && ytPlayerRef?.current) {
          try {
            const ytCur = ytPlayerRef.current.getCurrentTime();
            if (ytCur != null && isFinite(ytCur)) {
              setProgress(ytCur);
            }
            const ytDur = ytPlayerRef.current.getDuration();
            if (ytDur != null && isFinite(ytDur) && ytDur > 0) {
              setDuration(ytDur);
            }
          } catch (e) {}
        }
      }
      if (isPlaying) {
        animFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrame = requestAnimationFrame(tick);
    }
    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isPlaying, youtubeVideoId, nativeAudioRef, ytPlayerRef]);

  // Reset progress when currentSong changes
  useEffect(() => {
    setProgress(0);
    if (currentSong?.duration && isFinite(currentSong.duration) && currentSong.duration > 0) {
      setDuration(currentSong.duration);
    } else {
      setDuration(0);
    }
  }, [currentSong?.id, youtubeVideoId]);

  const handleSeekChange = (e) => {
    isSeekingRef.current = true;
    const time = Number(e.target.value);
    setProgress(time);
    if (!youtubeVideoId && nativeAudioRef?.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
  };

  const handleSeekMouseUp = (e) => {
    const time = Number(e.target.value);
    setProgress(time);
    if (youtubeVideoId && ytPlayerRef?.current) {
      try {
        ytPlayerRef.current.seekTo(time, 'seconds');
      } catch (err) {}
    } else if (nativeAudioRef?.current) {
      try {
        nativeAudioRef.current.currentTime = time;
      } catch (err) {}
    }
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 150);
  };

  return (
    <TimelineContext.Provider value={{
      progress,
      duration,
      setProgress,
      setDuration,
      handleSeekChange,
      handleSeekMouseUp
    }}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimeline = () => {
  const context = useContext(TimelineContext);
  if (!context) {
    // Fallback if not wrapped
    return {
      progress: 0,
      duration: 0,
      setProgress: () => {},
      setDuration: () => {},
      handleSeekChange: () => {},
      handleSeekMouseUp: () => {}
    };
  }
  return context;
};
