import React from 'react';
import type { UpgradeKey, WeatherType } from '../game/types';

export const SnowCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#1e293b" strokeWidth="2" />
    <circle cx="12" cy="12" r="7" fill="#fbbf24" />
    <path
      d="M12 6.5v11M7.2 9.2l9.6 5.6M16.8 9.2l-9.6 5.6"
      stroke="#fffbeb"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const WeatherIcon: React.FC<{ weather: WeatherType; className?: string }> = ({
  weather,
  className = 'w-4 h-4',
}) => {
  if (weather === 'clear') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.6" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
          stroke="#fde047"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (weather === 'blizzard') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M3 10h13a3 3 0 100-6 3 3 0 00-2.8 2M4 14h16a2.5 2.5 0 110 5"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="6" cy="19" r="1.4" fill="#ffffff" />
        <circle cx="12" cy="18.5" r="1.4" fill="#ffffff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"
        stroke="#bae6fd"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
    </svg>
  );
};

export const UpgradeIcon: React.FC<{ kind: UpgradeKey; className?: string }> = ({
  kind,
  className = 'w-6 h-6',
}) => {
  if (kind === 'bladeWidth') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M3 16l3.5-8h11L21 16H3z"
          fill="#f59e0b"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 8v8M5 13h14" stroke="#fef3c7" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'enginePower') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M13 3L5 14h6l-1 7 9-11h-6l0-7z"
          fill="#ef4444"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === 'saltSystem') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="#eab308" stroke="#1e293b" strokeWidth="2" />
        <circle cx="9" cy="10" r="1.4" fill="#fffbeb" />
        <circle cx="15" cy="10" r="1.4" fill="#fffbeb" />
        <circle cx="12" cy="14.5" r="1.4" fill="#fffbeb" />
      </svg>
    );
  }
  if (kind === 'hotWaterSystem') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M12 3c2.5 3.2 5 5.6 5 9.2A5 5 0 117 12.2C7 8.6 9.5 6.2 12 3z"
          fill="#fb923c"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 10.5c1.2 1.4 2 2.4 2 3.8a2 2 0 11-4 0c0-1.4.8-2.4 2-3.8z" fill="#fef08a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="7" y="6" width="10" height="14" rx="3" fill="#38bdf8" stroke="#1e293b" strokeWidth="2" />
      <rect x="8.5" y="3" width="7" height="3.5" rx="1" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.6" />
      <path d="M10 11h4M12 9v4" stroke="#f0f9ff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};

export const SoundIcon: React.FC<{ muted: boolean; className?: string }> = ({
  muted,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 9.5h4l5-4v13l-5-4H4z"
      fill="currentColor"
      stroke="#0f172a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {muted ? (
      <path d="M16.5 9l4 6m0-6l-4 6" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" />
    ) : (
      <path
        d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const PauseIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" />
    <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" />
  </svg>
);

export const RestartIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 12a8 8 0 102.3-5.6L4 8.8M4 4v5h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const WrenchIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M14.7 6.3a4.5 4.5 0 00-5.8 5.8L4 17l3 3 4.9-4.9a4.5 4.5 0 005.8-5.8l-2.6 2.6-2.2-2.2 2.6-2.6z"
      fill="currentColor"
      stroke="#0f172a"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
