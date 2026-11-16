import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import { DEFAULT_CUSTOM_CONFIG, INITIAL_UPGRADES } from './game/rules';
import type {
  CustomDistrictConfig,
  GarageTab,
  HudSnapshot,
  UpgradeKey,
  VehicleId,
} from './game/types';
import { SnowplowWorld } from './scene/SnowplowWorld';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  districtIndex: 1,
  biome: 'village',
  districtName: 'Pinebrook Square',
  districtSubtitle: 'Alpine Village · Cozy lanes & central square',
  weather: 'calm',
  weatherLabel: 'Crisp Dawn',
  vehicleId: 'pickup',
  unlockedVehicles: ['pickup'],
  coins: 0,
  score: 0,
  clearedCells: 0,
  totalCells: 400,
  clearedPercent: 0,
  targetPercent: 90,
  comboCount: 0,
  comboMultiplier: 1,
  comboTimerRatio: 0,
  maxCombo: 0,
  boostRatio: 1,
  saltActive: false,
  saltTankRatio: 1,
  hotWaterActive: false,
  hotWaterRatio: 1,
  speedKmh: 0,
  elapsedSeconds: 0,
  upgrades: { ...INITIAL_UPGRADES },
  muted: false,
  garageOpen: false,
  garageTab: 'upgrades',
  customConfig: { ...DEFAULT_CUSTOM_CONFIG },
  runSummary: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<SnowplowWorld | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const world = new SnowplowWorld(
      mount,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onPhaseChange: () => {},
      },
      autostart,
    );

    worldRef.current = world;
    return () => {
      worldRef.current = null;
      world.dispose();
    };
  }, []);

  const handleStart = useCallback(() => worldRef.current?.startShift(), []);
  const handleToggleMute = useCallback(() => worldRef.current?.toggleMute(), []);
  const handleTogglePause = useCallback(() => worldRef.current?.togglePause(), []);
  const handleRestart = useCallback(() => worldRef.current?.restartDistrict(), []);
  const handleNextDistrict = useCallback(() => worldRef.current?.nextDistrict(), []);
  const handleReturnTitle = useCallback(() => worldRef.current?.returnToTitle(), []);
  const handleToggleGarage = useCallback(() => worldRef.current?.toggleGarage(), []);
  const handleSetGarageTab = useCallback(
    (tab: GarageTab) => worldRef.current?.setGarageTab(tab),
    [],
  );
  const handleToggleSalt = useCallback(() => worldRef.current?.toggleSaltSpreader(), []);
  const handleBuyUpgrade = useCallback(
    (key: UpgradeKey) => worldRef.current?.buyUpgrade(key),
    [],
  );
  const handleSelectVehicle = useCallback(
    (id: VehicleId) => worldRef.current?.selectOrBuyVehicle(id),
    [],
  );
  const handleCustomConfigChange = useCallback(
    (cfg: CustomDistrictConfig) => worldRef.current?.generateNewDistrictFromConfig(cfg),
    [],
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#b8cde4]">
      <div
        ref={canvasMountRef}
        data-testid="snowplow-canvas-mount"
        className="absolute inset-0 w-full h-full"
      />

      {hud.phase === 'title' && (
        <TitleOverlay
          muted={hud.muted}
          customConfig={hud.customConfig}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          onConfigChange={handleCustomConfigChange}
        />
      )}

      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onToggleGarage={handleToggleGarage}
          onSetGarageTab={handleSetGarageTab}
          onToggleSalt={handleToggleSalt}
          onBuyUpgrade={handleBuyUpgrade}
          onSelectVehicle={handleSelectVehicle}
        />
      )}

      <StatusModal
        phase={hud.phase}
        districtIndex={hud.districtIndex}
        districtName={hud.districtName}
        summary={hud.runSummary}
        onResume={handleTogglePause}
        onRestart={handleRestart}
        onNextDistrict={handleNextDistrict}
        onTitle={handleReturnTitle}
      />
    </main>
  );
}
