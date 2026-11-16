import React from 'react';
import type {
  BiomeSelection,
  CustomDistrictConfig,
  DistrictSize,
  SnowIntensity,
} from '../game/types';
import { SoundIcon } from './HudIcons';

interface TitleOverlayProps {
  muted: boolean;
  customConfig: CustomDistrictConfig;
  onStart: () => void;
  onToggleMute: () => void;
  onConfigChange: (config: CustomDistrictConfig) => void;
}

const BIOME_OPTIONS: Array<{ value: BiomeSelection; label: string }> = [
  { value: 'auto', label: 'Cycle' },
  { value: 'village', label: 'Village' },
  { value: 'city', label: 'City' },
  { value: 'fields', label: 'Fields' },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  muted,
  customConfig,
  onStart,
  onToggleMute,
  onConfigChange,
}) => {
  const setBiome = (biome: BiomeSelection) => onConfigChange({ ...customConfig, biome });
  const setSize = (size: DistrictSize) => onConfigChange({ ...customConfig, size });
  const setSnow = (snowIntensity: SnowIntensity) =>
    onConfigChange({ ...customConfig, snowIntensity });

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto w-full max-w-[360px] bg-[rgba(24,35,54,0.9)] border-2 border-[#e2ecf7]/30 rounded-2xl p-5 shadow-[0_18px_42px_rgba(15,23,42,0.42)]">
          {/* Bespoke inline SVG Title Lockup */}
          <svg
            viewBox="0 0 360 100"
            className="w-full h-auto mb-3"
            role="img"
            aria-label="Frost and Plow"
          >
            <path
              d="M22 84L38 34l16 50H22zm24 0l12-34 12 34H46z"
              fill="#38735b"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M32 52l6-18 6 18-6-3-6 3z" fill="#f1f7fd" />
            <path
              d="M14 90l24-12 38 0-8 14H14z"
              fill="#f59e0b"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <text
              x="90"
              y="48"
              fill="#f8fafc"
              fontFamily="'Fredoka', sans-serif"
              fontWeight="700"
              fontSize="42"
              letterSpacing="1"
              stroke="#0f172a"
              strokeWidth="5"
              paintOrder="stroke fill"
            >
              FROST
            </text>
            <text
              x="92"
              y="88"
              fill="#fbbf24"
              fontFamily="'Fredoka', sans-serif"
              fontWeight="700"
              fontSize="40"
              letterSpacing="1.5"
              stroke="#0f172a"
              strokeWidth="5"
              paintOrder="stroke fill"
            >
              &amp; PLOW
            </text>
            <g transform="translate(316, 36)" stroke="#bae6fd" strokeWidth="2.6" strokeLinecap="round">
              <line x1="0" y1="-14" x2="0" y2="14" />
              <line x1="-12" y1="-7" x2="12" y2="7" />
              <line x1="12" y1="-7" x2="-12" y2="7" />
              <circle cx="0" cy="0" r="3" fill="#ffffff" stroke="none" />
            </g>
          </svg>

          {/* Custom Procedural District Configurator */}
          <div className="mb-3.5 space-y-2 border-t border-[#cbd5e1]/20 pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#93c5fd]">
                District
              </span>
              <div className="flex gap-1" role="group" aria-label="District Biome">
                {BIOME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setBiome(opt.value);
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold border cursor-pointer ${
                      customConfig.biome === opt.value
                        ? 'bg-[#fbbf24] text-[#0f172a] border-[#0f172a]'
                        : 'bg-[#162033] hover:bg-[#23324d] text-[#cbd5e1] border-[#334155]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#93c5fd]">
                Map &amp; Snow
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setSize(customConfig.size === 'standard' ? 'large' : 'standard');
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#162033] hover:bg-[#23324d] text-white border border-[#475569] cursor-pointer"
                >
                  {customConfig.size === 'large' ? 'Large Map' : 'Std Map'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setSnow(customConfig.snowIntensity === 'normal' ? 'heavy' : 'normal');
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border cursor-pointer ${
                    customConfig.snowIntensity === 'heavy'
                      ? 'bg-[#38bdf8] text-[#0f172a] border-[#0f172a]'
                      : 'bg-[#162033] hover:bg-[#23324d] text-[#cbd5e1] border-[#475569]'
                  }`}
                >
                  {customConfig.snowIntensity === 'heavy' ? 'Heavy Drifts' : 'Normal Snow'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="w-full py-3 px-6 rounded-xl bg-[#e0483a] hover:bg-[#eb5648] active:translate-y-0.5 text-white font-display font-bold text-xl tracking-wide border-2 border-[#0f172a] shadow-[0_4px_0_#0f172a] transition-colors cursor-pointer"
          >
            START SHIFT
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          title={muted ? 'Unmute [M]' : 'Mute [M]'}
          className="pointer-events-auto w-11 h-11 rounded-xl bg-[rgba(24,35,54,0.88)] hover:bg-[rgba(36,52,78,0.95)] text-[#e2ecf7] border-2 border-[#e2ecf7]/30 flex items-center justify-center shadow-lg cursor-pointer"
        >
          <SoundIcon muted={muted} />
        </button>
      </div>

      <div className="flex justify-center">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#f8fafc] hud-text-stroke text-center">
          WASD Drive · Space Boost · Q Salt Spreader · F Hot Water Jet · E Fleet &amp; Upgrades · Esc Pause
        </p>
      </div>
    </div>
  );
};
