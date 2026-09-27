import React, { useState, useEffect, useRef } from 'react';
import './SplashScreen.css';

/**
 * SplashScreen Component
 * Recreates the brand identity from the design guide & 0927.mp4 motion graphics.
 *
 * @param {Object} props
 * @param {Function} props.onFinish Callback when splash screen completes
 * @param {'coded' | 'video'} [props.mode='coded'] Display mode: 'coded' (responsive 60fps vector) or 'video' (MP4 player)
 * @param {number} [props.duration=2500] Duration in milliseconds before smooth fade-out (for 'coded' mode)
 */
export function SplashScreen({ onFinish, mode = 'coded', duration = 2500 }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    if (mode === 'video') {
      const video = videoRef.current;
      if (video) {
        // Attempt autoplay
        video.play().catch(() => {
          // If autoplay fails, fallback to timer
          triggerExit(duration);
        });
      }
    } else {
      // Coded vector animation timer
      const timer = setTimeout(() => {
        triggerExit();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [mode, duration]);

  const triggerExit = (delay = 0) => {
    if (delay > 0) {
      setTimeout(() => triggerExit(), delay);
      return;
    }
    setIsExiting(true);
    setTimeout(() => {
      setIsMounted(false);
      if (onFinish) onFinish();
    }, 500); // matches 0.5s CSS transition
  };

  const handleVideoEnded = () => {
    triggerExit();
  };

  if (!isMounted) return null;

  return (
    <div className={`viotrack-splash-overlay ${isExiting ? 'splash-exit' : ''}`}>
      {/* Subtle Corner Graphic Accents */}
      <div className="splash-bg-shape-top-left" />
      <div className="splash-bg-shape-bottom-right" />
      <div className="splash-glow" />

      {mode === 'video' ? (
        <div className="splash-video-wrapper">
          <video
            ref={videoRef}
            src="/0927.mp4"
            className="splash-video-element"
            playsInline
            muted
            autoPlay
            onEnded={handleVideoEnded}
          />
        </div>
      ) : (
        <div className="splash-content">
          {/* Exact Brand Logo Emblem Recreated in 100% Vector Precision */}
          <svg
            className="splash-logo-svg"
            viewBox="0 0 500 370"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Figure (Deep Navy #07345F) */}
            <g className="splash-left-figure">
              {/* Head Circle */}
              <circle cx="195" cy="96" r="30" fill="#07345F" />
              {/* Left Wing with Exact Corner Rounding */}
              <path
                d="M 120 105
                   Q 108 96 110 110
                   L 122 206
                   Q 124 214 132 222
                   L 235 324
                   Q 243 332 243 320
                   L 243 202
                   Q 243 194 235 188
                   Z"
                fill="#07345F"
              />
            </g>

            {/* Right Figure (Teal #0EA5A0 with Navy Head) */}
            <g className="splash-right-figure">
              {/* Head Circle */}
              <circle cx="305" cy="96" r="30" fill="#07345F" />
              {/* Right Wing with Exact Corner Rounding */}
              <path
                d="M 380 105
                   Q 392 96 390 110
                   L 378 206
                   Q 376 214 368 222
                   L 265 324
                   Q 257 332 257 320
                   L 257 202
                   Q 257 194 265 188
                   Z"
                fill="#0EA5A0"
              />
            </g>
          </svg>

          {/* Typography */}
          <div className="splash-text-container">
            <h1 className="splash-brand-title">VIOTRACK</h1>
            <p className="splash-brand-tagline">Track. Manage. Stay Compliant.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SplashScreen;
