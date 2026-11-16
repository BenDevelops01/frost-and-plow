export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type DistrictBiome = 'village' | 'city' | 'fields';
export type BiomeSelection = 'auto' | DistrictBiome;
export type DistrictSize = 'standard' | 'large';
export type SnowIntensity = 'normal' | 'heavy';

export interface CustomDistrictConfig {
  biome: BiomeSelection;
  size: DistrictSize;
  snowIntensity: SnowIntensity;
}

export type WeatherType = 'calm' | 'flurry' | 'blizzard' | 'clear';

export type VehicleId = 'pickup' | 'bigRig' | 'trackedSki';

export interface VehicleDef {
  id: VehicleId;
  name: string;
  tagline: string;
  cost: number;
  speedMult: number;
  snowPowerMult: number;
  bladeScaleMult: number;
  turnMult: number;
  saltCapMult: number;
  accentColor: string;
}

export type UpgradeKey =
  | 'bladeWidth'
  | 'enginePower'
  | 'saltSystem'
  | 'hotWaterSystem'
  | 'comboWarmth';

export type UpgradeLevels = Record<UpgradeKey, number>;

export interface UpgradeDef {
  key: UpgradeKey;
  hotkey: string;
  name: string;
  role: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  accentColor: string;
}

export interface SnowCell {
  gx: number;
  gz: number;
  worldX: number;
  worldZ: number;
  /** 0 = cleared, 1..4.5 = dusting -> packed -> deep drift -> blizzard bank */
  depth: number;
  maxDepth: number;
  /** Remaining seconds of salt protection (prevents blizzard refreeze & melts crust) */
  saltTimer: number;
  /** 0 = asphalt/road, 1 = plaza/crosswalk, 2 = field/dirt */
  surfaceType: number;
  isPlayable: boolean;
}

export type PropKind =
  | 'cabin'
  | 'building'
  | 'barn'
  | 'pine'
  | 'lamp'
  | 'clocktower'
  | 'snowman'
  | 'boulder';

export interface ObstacleBox {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  radius: number;
  rotation: number;
  scale: number;
  variant: number;
}

export interface DistrictLayout {
  districtIndex: number;
  biome: DistrictBiome;
  name: string;
  subtitle: string;
  gridSize: number;
  tileSize: number;
  clearTargetRatio: number;
  spawnX: number;
  spawnZ: number;
  spawnAngle: number;
  cells: SnowCell[];
  playableCount: number;
  obstacles: ObstacleBox[];
}

export interface TruckState {
  x: number;
  z: number;
  angle: number;
  speed: number;
  steerAngle: number;
  boostEnergy: number;
  isBoosting: boolean;
  saltActive: boolean;
  saltTank: number;
  hotWaterActive: boolean;
  hotWaterEnergy: number;
  underSnowDepth: number;
  wheelRoll: number;
}

export interface ComboState {
  count: number;
  multiplier: number;
  timer: number;
  maxTimer: number;
  maxComboReached: number;
}

export interface RunSummary {
  districtIndex: number;
  districtName: string;
  biome: DistrictBiome;
  clearedPercent: number;
  clearedCells: number;
  totalCells: number;
  coinsEarned: number;
  maxCombo: number;
  elapsedSeconds: number;
  score: number;
}

export type GarageTab = 'upgrades' | 'fleet';

export interface HudSnapshot {
  phase: GamePhase;
  districtIndex: number;
  biome: DistrictBiome;
  districtName: string;
  districtSubtitle: string;
  weather: WeatherType;
  weatherLabel: string;
  vehicleId: VehicleId;
  unlockedVehicles: VehicleId[];
  coins: number;
  score: number;
  clearedCells: number;
  totalCells: number;
  clearedPercent: number;
  targetPercent: number;
  comboCount: number;
  comboMultiplier: number;
  comboTimerRatio: number;
  maxCombo: number;
  boostRatio: number;
  saltActive: boolean;
  saltTankRatio: number;
  hotWaterActive: boolean;
  hotWaterRatio: number;
  speedKmh: number;
  elapsedSeconds: number;
  upgrades: UpgradeLevels;
  muted: boolean;
  garageOpen: boolean;
  garageTab: GarageTab;
  customConfig: CustomDistrictConfig;
  runSummary: RunSummary | null;
}
