import React from 'react';
import {
  UPGRADE_DEFS,
  VEHICLE_DEFS,
  canAffordUpgrade,
  getUpgradeCost,
  getVehicleDef,
} from '../game/rules';
import type {
  GarageTab,
  HudSnapshot,
  UpgradeKey,
  VehicleId,
} from '../game/types';
import {
  PauseIcon,
  RestartIcon,
  SnowCoinIcon,
  SoundIcon,
  UpgradeIcon,
  WeatherIcon,
  WrenchIcon,
} from './HudIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onToggleGarage: () => void;
  onSetGarageTab: (tab: GarageTab) => void;
  onToggleSalt: () => void;
  onBuyUpgrade: (key: UpgradeKey) => void;
  onSelectVehicle: (id: VehicleId) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onToggleMute,
  onTogglePause,
  onRestart,
  onToggleGarage,
  onSetGarageTab,
  onToggleSalt,
  onBuyUpgrade,
  onSelectVehicle,
}) => {
  const affordableCount = UPGRADE_DEFS.filter((def) =>
    canAffordUpgrade(hud.coins, hud.upgrades, def.key),
  ).length;

  const progressToTarget = Math.min(
    100,
    Math.round((hud.clearedPercent / Math.max(1, hud.targetPercent)) * 100),
  );

  const activeVehicle = getVehicleDef(hud.vehicleId);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: District Progress, Weather Cycle, Coins, Combo */}
        <div className="flex flex-col gap-2 min-w-0 flex-1 max-w-[220px] sm:max-w-[275px]">
          <div className="bg-[rgba(22,33,51,0.9)] border-2 border-[#cbd5e1]/30 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#93c5fd] truncate">
                D{hud.districtIndex} · {hud.districtName}
              </span>
              <span className="font-display font-bold text-base sm:text-lg text-white tabular-nums shrink-0">
                {hud.clearedPercent}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#0f172a] rounded-full overflow-hidden border border-[#334155]">
              <div
                className="h-full bg-[#38bdf8] transition-[width] duration-150"
                style={{ width: `${progressToTarget}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-[#cbd5e1]">
              <div className="flex items-center gap-1.5 truncate">
                <WeatherIcon weather={hud.weather} className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-semibold text-[11px]">{hud.weatherLabel}</span>
              </div>
              <div className="flex items-center gap-1 font-display font-bold text-base text-[#fbbf24] tabular-nums shrink-0">
                <SnowCoinIcon className="w-4 h-4" />
                <span>{hud.coins}</span>
              </div>
            </div>
          </div>

          {hud.comboCount > 0 && (
            <div className="bg-[rgba(28,39,60,0.92)] border-2 border-[#fbbf24]/60 rounded-xl px-3.5 py-2 shadow-lg w-fit min-w-[165px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#fde68a]">
                  Plow Combo
                </span>
                <span className="font-display font-bold text-2xl text-[#fbbf24] tabular-nums">
                  {hud.comboMultiplier}x
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full bg-[#0f172a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#fbbf24]"
                  style={{ width: `${Math.round(hud.comboTimerRatio * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#e2e8f0] tabular-nums">
                {hud.comboCount} tiles chained
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Square Utility Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
            title="Mute [M]"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(22,33,51,0.88)] hover:bg-[rgba(36,52,78,0.95)] text-[#e2e8f0] border-2 border-[#cbd5e1]/30 flex items-center justify-center shadow-md cursor-pointer"
          >
            <SoundIcon muted={hud.muted} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleGarage();
            }}
            aria-label="Toggle Garage and Fleet"
            title="Garage & Fleet [E]"
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center shadow-md cursor-pointer ${
              hud.garageOpen
                ? 'bg-[#f59e0b] text-[#0f172a] border-[#0f172a]'
                : 'bg-[rgba(22,33,51,0.88)] hover:bg-[rgba(36,52,78,0.95)] text-[#e2e8f0] border-[#cbd5e1]/30'
            }`}
          >
            <WrenchIcon />
            {affordableCount > 0 && !hud.garageOpen && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#fbbf24] text-[#0f172a] border border-[#0f172a] text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                {affordableCount}
              </span>
            )}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            aria-label="Generate New District"
            title="New District [R]"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(22,33,51,0.88)] hover:bg-[rgba(36,52,78,0.95)] text-[#e2e8f0] border-2 border-[#cbd5e1]/30 flex items-center justify-center shadow-md cursor-pointer"
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            aria-label="Pause Game"
            title="Pause [P / Esc]"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(22,33,51,0.88)] hover:bg-[rgba(36,52,78,0.95)] text-[#e2e8f0] border-2 border-[#cbd5e1]/30 flex items-center justify-center shadow-md cursor-pointer"
          >
            <PauseIcon />
          </button>
        </div>
      </div>

      {/* Bottom-Center Dock + Collapsible Garage / Fleet Drawer */}
      <div className="flex flex-col items-center gap-2">
        {hud.garageOpen && (
          <div className="pointer-events-auto w-full max-w-[860px] bg-[rgba(22,33,51,0.96)] border-2 border-[#cbd5e1]/35 rounded-2xl p-3.5 shadow-[0_18px_40px_rgba(15,23,42,0.48)]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-2.5">
              <div className="flex items-center gap-1.5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={hud.garageTab === 'upgrades'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetGarageTab('upgrades');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer ${
                    hud.garageTab === 'upgrades'
                      ? 'bg-[#fbbf24] text-[#0f172a]'
                      : 'bg-[#162033] text-[#cbd5e1] hover:bg-[#22314a]'
                  }`}
                >
                  Upgrades [1-5]
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={hud.garageTab === 'fleet'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSetGarageTab('fleet');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer ${
                    hud.garageTab === 'fleet'
                      ? 'bg-[#38bdf8] text-[#0f172a]'
                      : 'bg-[#162033] text-[#cbd5e1] hover:bg-[#22314a]'
                  }`}
                >
                  Vehicle Fleet ({hud.unlockedVehicles.length}/{VEHICLE_DEFS.length})
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#fbbf24] tabular-nums">
                <SnowCoinIcon className="w-4 h-4" />
                <span>{hud.coins} Coins</span>
              </div>
            </div>

            {hud.garageTab === 'upgrades' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {UPGRADE_DEFS.map((def) => {
                  const level = hud.upgrades[def.key];
                  const isMax = level >= def.maxLevel;
                  const cost = getUpgradeCost(def.key, level);
                  const affordable = canAffordUpgrade(hud.coins, hud.upgrades, def.key);

                  return (
                    <button
                      key={def.key}
                      type="button"
                      tabIndex={-1}
                      disabled={!affordable}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onBuyUpgrade(def.key);
                      }}
                      className={`text-left rounded-xl p-2.5 border-2 transition-colors flex flex-col justify-between gap-2 ${
                        isMax
                          ? 'bg-[#1e293b] border-[#334155] text-[#94a3b8] cursor-default'
                          : affordable
                            ? 'bg-[#24344d] hover:bg-[#2d4160] border-[#fbbf24] text-white cursor-pointer'
                            : 'bg-[#192436] border-[#334155] text-[#cbd5e1] opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <UpgradeIcon kind={def.key} className="w-5 h-5 shrink-0" />
                          <div>
                            <div className="font-display font-bold text-xs leading-tight text-white">
                              {def.name}
                            </div>
                            <div className="text-[10px] text-[#94a3b8] leading-snug mt-0.5">
                              {def.role}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-[#0f172a] text-[#cbd5e1]">
                          [{def.hotkey}]
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1" aria-label={`Level ${level} of ${def.maxLevel}`}>
                          {Array.from({ length: def.maxLevel }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-2 h-1.5 rounded-sm border border-[#0f172a] ${
                                i < level ? 'bg-[#fbbf24]' : 'bg-[#0f172a]'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-extrabold tabular-nums ${
                            isMax
                              ? 'text-[#38bdf8]'
                              : affordable
                                ? 'text-[#fbbf24]'
                                : 'text-[#64748b]'
                          }`}
                        >
                          {isMax ? 'MAX' : `${cost}c`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {VEHICLE_DEFS.map((v) => {
                  const unlocked = hud.unlockedVehicles.includes(v.id);
                  const active = hud.vehicleId === v.id;
                  const canBuy = !unlocked && hud.coins >= v.cost;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      tabIndex={-1}
                      disabled={!unlocked && !canBuy}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectVehicle(v.id);
                      }}
                      className={`text-left rounded-xl p-3 border-2 flex flex-col justify-between gap-2 ${
                        active
                          ? 'bg-[#253b59] border-[#38bdf8] text-white cursor-default'
                          : unlocked || canBuy
                            ? 'bg-[#1e2c42] hover:bg-[#293d5c] border-[#fbbf24]/75 text-white cursor-pointer'
                            : 'bg-[#162033] border-[#334155] text-[#94a3b8] opacity-75 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-bold text-sm text-white">
                            {v.name}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-[#0f172a]"
                            style={{ backgroundColor: v.accentColor }}
                          />
                        </div>
                        <p className="text-[11px] text-[#cbd5e1] mt-1">{v.tagline}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-[#334155]">
                        <span className="text-[#93c5fd] tabular-nums">
                          Torque {v.snowPowerMult.toFixed(1)}x
                        </span>
                        <span
                          className={
                            active
                              ? 'text-[#38bdf8]'
                              : unlocked
                                ? 'text-white'
                                : canBuy
                                  ? 'text-[#fbbf24]'
                                  : 'text-[#64748b]'
                          }
                        >
                          {active ? 'ACTIVE' : unlocked ? 'EQUIP' : `${v.cost}c`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Compact Bottom Telemetry + Salt & Hot Water Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[rgba(22,33,51,0.92)] border-2 border-[#cbd5e1]/30 rounded-xl px-3 py-2 shadow-lg max-w-[96vw]">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-[#e2e8f0]">
            <span>{activeVehicle.name}</span>
          </div>
          <div className="hidden md:block h-4 w-px bg-[#334155]" />

          {/* Boost meter */}
          <div className="flex items-center gap-1.5 min-w-[82px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#93c5fd]">
              Boost
            </span>
            <div className="h-2 w-12 bg-[#0f172a] rounded-full overflow-hidden border border-[#334155]">
              <div
                className="h-full bg-[#f59e0b]"
                style={{ width: `${Math.round(hud.boostRatio * 100)}%` }}
              />
            </div>
          </div>

          {/* Salt Spreader [Q] */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSalt();
            }}
            title="Toggle Salt Spreader [Q]"
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer ${
              hud.saltActive
                ? 'bg-[#eab308] text-[#0f172a] border-[#0f172a]'
                : 'bg-[#162033] hover:bg-[#23324d] text-[#fde047] border-[#475569]'
            }`}
          >
            <span>Salt [Q]</span>
            <div className="h-1.5 w-7 bg-[#0f172a]/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${Math.round(hud.saltTankRatio * 100)}%` }}
              />
            </div>
          </button>

          {/* Hot Water Steam Jet [F] */}
          <div
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border ${
              hud.hotWaterActive
                ? 'bg-[#fb923c] text-[#0f172a] border-[#0f172a]'
                : 'bg-[#162033] text-[#fdba74] border-[#475569]'
            }`}
            title="Hold [F] to spray Hot Water Jet"
          >
            <span>Steam [F]</span>
            <div className="h-1.5 w-7 bg-[#0f172a]/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#38bdf8]"
                style={{ width: `${Math.round(hud.hotWaterRatio * 100)}%` }}
              />
            </div>
          </div>

          <div className="text-xs font-bold text-[#e2e8f0] tabular-nums min-w-[52px] text-center">
            {hud.speedKmh} <span className="text-[#94a3b8]">km/h</span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleGarage();
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border cursor-pointer ${
              hud.garageOpen
                ? 'bg-[#fbbf24] text-[#0f172a] border-[#0f172a]'
                : affordableCount > 0
                  ? 'bg-[#2c405e] hover:bg-[#385075] text-[#fbbf24] border-[#fbbf24]/70'
                  : 'bg-[#1a273b] hover:bg-[#24344d] text-[#e2e8f0] border-[#475569]'
            }`}
          >
            <WrenchIcon className="w-3.5 h-3.5" />
            <span>{hud.garageOpen ? 'Close' : 'Fleet/Upgrades [E]'}</span>
            {affordableCount > 0 && !hud.garageOpen && (
              <span className="px-1 rounded bg-[#fbbf24] text-[#0f172a] text-[10px] font-extrabold tabular-nums">
                {affordableCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
