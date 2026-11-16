import type {
  ComboState,
  CustomDistrictConfig,
  DistrictBiome,
  DistrictLayout,
  ObstacleBox,
  SnowCell,
  TruckState,
  UpgradeDef,
  UpgradeKey,
  UpgradeLevels,
  VehicleDef,
  VehicleId,
  WeatherType,
} from './types';

export const VEHICLE_DEFS: VehicleDef[] = [
  {
    id: 'pickup',
    name: 'Ranger 4x4',
    tagline: 'Nimble alpine pickup with V-blade',
    cost: 0,
    speedMult: 1.0,
    snowPowerMult: 1.0,
    bladeScaleMult: 1.0,
    turnMult: 1.1,
    saltCapMult: 1.0,
    accentColor: '#d94436',
  },
  {
    id: 'bigRig',
    name: 'Titan Heavy Rig',
    tagline: '6x6 municipal hauler · Crushes deep drifts',
    cost: 75,
    speedMult: 0.94,
    snowPowerMult: 1.85,
    bladeScaleMult: 1.38,
    turnMult: 0.84,
    saltCapMult: 1.6,
    accentColor: '#f59e0b',
  },
  {
    id: 'trackedSki',
    name: 'Glacier Ski-Plow',
    tagline: 'Tracked crawler + front skis · Ignores deep snow',
    cost: 120,
    speedMult: 1.06,
    snowPowerMult: 2.6,
    bladeScaleMult: 1.28,
    turnMult: 1.18,
    saltCapMult: 1.35,
    accentColor: '#0ea5e9',
  },
];

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    key: 'bladeWidth',
    hotkey: '1',
    name: 'Wide V-Blade',
    role: 'Sweeps wider snow lanes per pass',
    maxLevel: 5,
    baseCost: 18,
    costMultiplier: 1.65,
    accentColor: '#f59e0b',
  },
  {
    key: 'enginePower',
    hotkey: '2',
    name: 'Diesel Torque',
    role: 'Higher speed & pushes deep snow faster',
    maxLevel: 5,
    baseCost: 22,
    costMultiplier: 1.65,
    accentColor: '#ef4444',
  },
  {
    key: 'saltSystem',
    hotkey: '3',
    name: 'Salt Spreader',
    role: 'Wider salt spray [Q] & bigger brine tank',
    maxLevel: 5,
    baseCost: 20,
    costMultiplier: 1.6,
    accentColor: '#eab308',
  },
  {
    key: 'hotWaterSystem',
    hotkey: '4',
    name: 'Hot Water Jet',
    role: 'Hotter steam blast [F] & faster boiler charge',
    maxLevel: 5,
    baseCost: 24,
    costMultiplier: 1.68,
    accentColor: '#fb923c',
  },
  {
    key: 'comboWarmth',
    hotkey: '5',
    name: 'Thermos Combo',
    role: 'Longer combo hold & +15% coin bonus',
    maxLevel: 5,
    baseCost: 18,
    costMultiplier: 1.6,
    accentColor: '#38bdf8',
  },
];

export const INITIAL_UPGRADES: UpgradeLevels = {
  bladeWidth: 0,
  enginePower: 0,
  saltSystem: 0,
  hotWaterSystem: 0,
  comboWarmth: 0,
};

export const DEFAULT_CUSTOM_CONFIG: CustomDistrictConfig = {
  biome: 'auto',
  size: 'standard',
  snowIntensity: 'normal',
};

export function getVehicleDef(id: VehicleId): VehicleDef {
  return VEHICLE_DEFS.find((v) => v.id === id) ?? VEHICLE_DEFS[0];
}

export function getUpgradeCost(key: UpgradeKey, currentLevel: number): number {
  const def = UPGRADE_DEFS.find((d) => d.key === key);
  if (!def || currentLevel >= def.maxLevel) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

export function canAffordUpgrade(
  coins: number,
  upgrades: UpgradeLevels,
  key: UpgradeKey,
): boolean {
  const def = UPGRADE_DEFS.find((d) => d.key === key);
  if (!def) return false;
  const lvl = upgrades[key];
  if (lvl >= def.maxLevel) return false;
  return coins >= getUpgradeCost(key, lvl);
}

export interface DerivedTruckSpecs {
  bladeHalfWidth: number;
  bladeForwardReach: number;
  bladeVisualScale: number;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  boostMaxSpeed: number;
  boostDrainRate: number;
  boostRechargeRate: number;
  plowPower: number;
  snowResistanceFactor: number;
  saltRadius: number;
  saltDuration: number;
  saltDrainRate: number;
  saltRechargeRate: number;
  hotWaterPower: number;
  hotWaterReach: number;
  hotWaterDrainRate: number;
  hotWaterRechargeRate: number;
  comboHoldDuration: number;
  coinBonusFactor: number;
}

export function getDerivedSpecs(
  upgrades: UpgradeLevels,
  vehicleId: VehicleId = 'pickup',
): DerivedTruckSpecs {
  const veh = getVehicleDef(vehicleId);
  return {
    bladeHalfWidth: (1.58 + upgrades.bladeWidth * 0.28) * veh.bladeScaleMult,
    bladeForwardReach: 1.78 + upgrades.bladeWidth * 0.08 + (vehicleId === 'bigRig' ? 0.32 : 0),
    bladeVisualScale: (1 + upgrades.bladeWidth * 0.16) * veh.bladeScaleMult,
    maxSpeed: (8.8 + upgrades.enginePower * 1.1) * veh.speedMult,
    accel: (20 + upgrades.enginePower * 2.8) * veh.speedMult,
    turnRate: (2.7 + upgrades.enginePower * 0.12) * veh.turnMult,
    boostMaxSpeed: (13.8 + upgrades.enginePower * 1.45) * veh.speedMult,
    boostDrainRate: 0.34,
    boostRechargeRate: 0.21 + upgrades.enginePower * 0.04,
    plowPower: (1.15 + upgrades.enginePower * 0.32) * veh.snowPowerMult,
    snowResistanceFactor: Math.max(0.18, 0.55 / (veh.snowPowerMult * (1 + upgrades.enginePower * 0.18))),
    saltRadius: 2.3 + upgrades.saltSystem * 0.55,
    saltDuration: 18 + upgrades.saltSystem * 5,
    saltDrainRate: Math.max(0.055, 0.14 / (veh.saltCapMult * (1 + upgrades.saltSystem * 0.2))),
    saltRechargeRate: 0.085 + upgrades.saltSystem * 0.025,
    hotWaterPower: 3.4 + upgrades.hotWaterSystem * 1.25,
    hotWaterReach: 4.4 + upgrades.hotWaterSystem * 0.55,
    hotWaterDrainRate: Math.max(0.15, 0.34 / (1 + upgrades.hotWaterSystem * 0.18)),
    hotWaterRechargeRate: 0.16 + upgrades.hotWaterSystem * 0.05,
    comboHoldDuration: 2.7 + upgrades.comboWarmth * 0.6,
    coinBonusFactor: 1 + upgrades.comboWarmth * 0.15,
  };
}

export function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 49) return 8;
  if (comboCount >= 33) return 6;
  if (comboCount >= 21) return 5;
  if (comboCount >= 13) return 4;
  if (comboCount >= 7) return 3;
  if (comboCount >= 3) return 2;
  return 1;
}

export function stepCombo(
  combo: ComboState,
  dt: number,
  cellsClearedNow: number,
  comboHoldDuration: number,
): ComboState {
  let count = combo.count;
  let timer = combo.timer;
  let maxComboReached = combo.maxComboReached;

  if (cellsClearedNow > 0) {
    count += cellsClearedNow;
    timer = comboHoldDuration;
    if (count > maxComboReached) {
      maxComboReached = count;
    }
  } else if (timer > 0) {
    timer = Math.max(0, timer - dt);
    if (timer === 0) {
      count = 0;
    }
  }

  return {
    count,
    multiplier: getComboMultiplier(count),
    timer,
    maxTimer: comboHoldDuration,
    maxComboReached,
  };
}

export function calculateSnowReward(
  clearedMaxDepth: number,
  multiplier: number,
  coinBonusFactor: number,
): { coins: number; score: number } {
  const baseCoins =
    clearedMaxDepth >= 3.2
      ? 8
      : clearedMaxDepth >= 2.2
        ? 5
        : clearedMaxDepth >= 1.3
          ? 3
          : 2;
  const coins = Math.max(2, Math.round(baseCoins * multiplier * coinBonusFactor));
  const score = Math.round(baseCoins * 25 * multiplier);
  return { coins, score };
}

// Deterministic Mulberry32 PRNG so every district number & custom config creates a unique new map
function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const BIOME_ORDER: DistrictBiome[] = ['village', 'city', 'fields'];

const BIOME_NAMES: Record<DistrictBiome, string[]> = {
  village: ['Pinebrook Square', 'Larchwood Hamlet', 'Hollybell Hollow', 'Timberline Crossing'],
  city: ['Frosthaven Metro', 'Northgate Avenue', 'Boreal Midtown', 'Winterbridge Plaza'],
  fields: ['Summit Snowfields', 'Glacier Meadows', 'Whitewind Valley', 'Highpass Pastures'],
};

export function generateDistrictLayout(
  districtIndex: number,
  customConfig: CustomDistrictConfig = DEFAULT_CUSTOM_CONFIG,
  layoutNonce = 0,
): DistrictLayout {
  const biome: DistrictBiome =
    customConfig.biome === 'auto'
      ? BIOME_ORDER[(districtIndex - 1) % BIOME_ORDER.length]
      : customConfig.biome;

  const gridSize = customConfig.size === 'large' ? 42 : 36;
  const tileSize = 1.5;
  const halfExtent = (gridSize * tileSize) / 2;
  const seed = districtIndex * 7919 + layoutNonce * 104729 + (biome === 'city' ? 31 : biome === 'fields' ? 67 : 13);
  const rng = createRng(seed);

  const namePool = BIOME_NAMES[biome];
  const name = namePool[(districtIndex + layoutNonce) % namePool.length];
  const subtitle =
    biome === 'city'
      ? 'Urban Boulevards · Heavy traffic avenues & deep curbs'
      : biome === 'fields'
        ? 'Open Snow Fields · Deep wind-carved drifts'
        : 'Alpine Village · Cozy lanes & central square';

  const toWorld = (g: number) => (g + 0.5) * tileSize - halfExtent;
  const mid = Math.floor(gridSize / 2);

  // Build procedural unique road/field grid mask (0=non-road, 1=road, 2=plaza, 3=open field)
  const mask = new Uint8Array(gridSize * gridSize);
  const setMask = (gx: number, gz: number, val: number) => {
    if (gx >= 1 && gx < gridSize - 1 && gz >= 1 && gz < gridSize - 1) {
      mask[gz * gridSize + gx] = val;
    }
  };
  const carveRect = (x0: number, z0: number, x1: number, z1: number, val: number) => {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        setMask(x, z, val);
      }
    }
  };

  if (biome === 'fields') {
    // Open Snow Fields: broad sweeping playable fields with winding groomed corridors
    carveRect(2, 2, gridSize - 3, gridSize - 3, 3);
    // Carve a few scenic country lane intersections through the center
    carveRect(2, mid - 2, gridSize - 3, mid + 2, 1);
    carveRect(mid - 2, 2, mid + 2, gridSize - 3, 1);
  } else if (biome === 'city') {
    // Winter City: Procedural multi-avenue urban block grid
    const ringMin = 3;
    const ringMax = gridSize - 4;
    carveRect(ringMin, ringMin, ringMax, ringMin + 2, 1);
    carveRect(ringMin, ringMax - 2, ringMax, ringMax, 1);
    carveRect(ringMin, ringMin, ringMin + 2, ringMax, 1);
    carveRect(ringMax - 2, ringMin, ringMax, ringMax, 1);

    // Central avenues (4 tiles wide)
    carveRect(ringMin, mid - 2, ringMax, mid + 1, 1);
    carveRect(mid - 2, ringMin, mid + 1, ringMax, 1);

    // Random extra cross streets (2 tiles wide) unique per district so urban blocks stay full of buildings
    const streetX = Math.floor(8 + rng() * 3);
    const streetX2 = gridSize - 1 - streetX;
    const streetZ = Math.floor(8 + rng() * 3);
    const streetZ2 = gridSize - 1 - streetZ;
    carveRect(streetX, ringMin, streetX + 1, ringMax, 1);
    carveRect(streetX2 - 1, ringMin, streetX2, ringMax, 1);
    carveRect(ringMin, streetZ, ringMax, streetZ + 1, 1);
    carveRect(ringMin, streetZ2 - 1, ringMax, streetZ2, 1);

    // Central urban plaza
    carveRect(mid - 4, mid - 4, mid + 3, mid + 3, 2);
  } else {
    // Alpine Village: Procedural ring + cross + randomized side cul-de-sacs & plaza
    const ringA = 3 + Math.floor(rng() * 2);
    const ringB = gridSize - 4 - Math.floor(rng() * 2);
    carveRect(ringA, ringA, ringB, ringA + 2, 1);
    carveRect(ringA, ringB - 2, ringB, ringB, 1);
    carveRect(ringA, ringA, ringA + 2, ringB, 1);
    carveRect(ringB - 2, ringA, ringB, ringB, 1);

    // Central cross avenues (4 tiles wide)
    carveRect(2, mid - 2, gridSize - 3, mid + 1, 1);
    carveRect(mid - 2, 2, mid + 1, gridSize - 3, 1);

    // Central town square plaza
    carveRect(mid - 5, mid - 5, mid + 4, mid + 4, 2);

    // 3 random neighborhood spurs unique to this district
    for (let s = 0; s < 3; s++) {
      const sx = 6 + Math.floor(rng() * (gridSize - 14));
      const sz = 6 + Math.floor(rng() * (gridSize - 14));
      const w = 3 + Math.floor(rng() * 5);
      const h = 3 + Math.floor(rng() * 4);
      carveRect(sx, sz, sx + w, sz + h, 1);
    }
  }

  // Always guarantee an unobstructed 4-tile-wide spawn corridor south of center facing -Z
  const spawnGx = mid - 0.5;
  const spawnGz = gridSize - 7.5;
  carveRect(mid - 2, gridSize - 11, mid + 2, gridSize - 5, 1);
  const spawnX = toWorld(spawnGx);
  const spawnZ = toWorld(spawnGz);
  const spawnAngle = Math.PI; // Facing north (-Z) toward center landmark

  // Place Obstacles cleanly avoiding spawn lane and roads (except central monument)
  const obstacles: ObstacleBox[] = [];
  const isNearSpawnCorridor = (wx: number, wz: number, extraRadius: number) => {
    if (Math.abs(wx - spawnX) < 3.4 + extraRadius && wz > spawnZ - 7.5 && wz < spawnZ + 4.5) {
      return true;
    }
    return false;
  };
  const overlapsExisting = (wx: number, wz: number, radius: number) => {
    for (const o of obstacles) {
      if (Math.hypot(wx - o.x, wz - o.z) < o.radius + radius + 1.1) return true;
    }
    return false;
  };

  // Central landmark
  if (biome !== 'fields') {
    obstacles.push({
      id: 'landmark-center',
      kind: 'clocktower',
      x: 0,
      z: 0,
      radius: 2.1,
      rotation: 0,
      scale: biome === 'city' ? 1.15 : 1.0,
      variant: biome === 'city' ? 1 : 0,
    });
  } else {
    // Scenic field barn off-center so center meadow stays wide open
    obstacles.push({
      id: 'barn-north',
      kind: 'barn',
      x: toWorld(mid - 7),
      z: toWorld(6),
      radius: 2.8,
      rotation: 0.2,
      scale: 1.1,
      variant: 0,
    });
    obstacles.push({
      id: 'barn-east',
      kind: 'barn',
      x: toWorld(gridSize - 7),
      z: toWorld(mid - 5),
      radius: 2.8,
      rotation: -Math.PI * 0.45,
      scale: 1.0,
      variant: 1,
    });
  }

  // Place buildings/cabins/trees/boulders procedurally in non-road blocks (or scattered islands in fields)
  const desiredStructures = biome === 'city' ? 18 : biome === 'village' ? 10 : 4;
  for (let attempt = 0; attempt < 320 && obstacles.length < desiredStructures + 2; attempt++) {
    const gx = 2 + Math.floor(rng() * (gridSize - 4));
    const gz = 2 + Math.floor(rng() * (gridSize - 4));
    const cellVal = mask[gz * gridSize + gx];
    if (biome !== 'fields' && cellVal !== 0) continue;
    if (biome === 'fields' && cellVal === 1) continue; // keep carved lanes clear

    const wx = toWorld(gx);
    const wz = toWorld(gz);
    const radius = biome === 'city' ? 2.25 : biome === 'fields' ? 1.8 : 2.3;
    if (isNearSpawnCorridor(wx, wz, radius)) continue;
    if (overlapsExisting(wx, wz, radius)) continue;

    // Ensure non-road footing for structures (city buildings fit snugger on urban corners)
    if (biome === 'village') {
      let clearBlock = true;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (mask[(gz + dz) * gridSize + (gx + dx)] !== 0) clearBlock = false;
        }
      }
      if (!clearBlock) continue;
    } else if (biome === 'city') {
      let zeroNeighbors = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (mask[(gz + dz) * gridSize + (gx + dx)] === 0) zeroNeighbors++;
        }
      }
      if (zeroNeighbors < 6) continue;
    }

    obstacles.push({
      id: `struct-${obstacles.length}`,
      kind: biome === 'city' ? 'building' : biome === 'fields' ? 'boulder' : 'cabin',
      x: wx,
      z: wz,
      radius,
      rotation: Math.floor(rng() * 4) * (Math.PI / 2),
      scale: 0.92 + rng() * 0.22,
      variant: Math.floor(rng() * 3),
    });
  }

  // Streetlamps around plaza / avenues
  if (biome !== 'fields') {
    const lampOffset = biome === 'city' ? 4.2 : 4.8;
    const corners: Array<[number, number]> = [
      [-lampOffset, -lampOffset],
      [lampOffset, -lampOffset],
      [-lampOffset, lampOffset],
      [lampOffset, lampOffset],
    ];
    corners.forEach(([lx, lz], idx) => {
      if (!overlapsExisting(lx, lz, 0.5) && !isNearSpawnCorridor(lx, lz, 0.5)) {
        obstacles.push({
          id: `lamp-${idx}`,
          kind: 'lamp',
          x: lx,
          z: lz,
          radius: 0.45,
          rotation: 0,
          scale: 1,
          variant: 0,
        });
      }
    });
  }

  // Pine trees & snowmen
  const treeTarget = biome === 'fields' ? 18 : biome === 'village' ? 16 : 8;
  for (let attempt = 0; attempt < 220 && obstacles.length < desiredStructures + treeTarget + 6; attempt++) {
    const gx = 1 + Math.floor(rng() * (gridSize - 2));
    const gz = 1 + Math.floor(rng() * (gridSize - 2));
    const cellVal = mask[gz * gridSize + gx];
    if (biome !== 'fields' && cellVal !== 0) continue;
    if (biome === 'fields' && cellVal === 1) continue;

    const wx = toWorld(gx);
    const wz = toWorld(gz);
    if (isNearSpawnCorridor(wx, wz, 1.2)) continue;
    if (overlapsExisting(wx, wz, 0.95)) continue;

    const isSnowman = biome === 'village' && attempt % 13 === 0;
    obstacles.push({
      id: `prop-${obstacles.length}`,
      kind: isSnowman ? 'snowman' : 'pine',
      x: wx,
      z: wz,
      radius: isSnowman ? 0.65 : 0.9,
      rotation: rng() * Math.PI * 2,
      scale: isSnowman ? 1 : 0.85 + rng() * 0.34,
      variant: Math.floor(rng() * 3),
    });
  }

  // Build snow cells
  const cells: SnowCell[] = [];
  let playableCount = 0;
  const heavyFactor = customConfig.snowIntensity === 'heavy' ? 1.0 : 0.0;
  const tierScale = Math.min(1.35, (districtIndex - 1) * 0.25) + heavyFactor;

  for (let gz = 0; gz < gridSize; gz++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const roadVal = mask[gz * gridSize + gx];
      const worldX = toWorld(gx);
      const worldZ = toWorld(gz);

      let blocked = false;
      for (const obs of obstacles) {
        const dx = worldX - obs.x;
        const dz = worldZ - obs.z;
        if (dx * dx + dz * dz < (obs.radius + 0.55) * (obs.radius + 0.55)) {
          blocked = true;
          break;
        }
      }

      const distToSpawn = Math.hypot(worldX - spawnX, worldZ - spawnZ);
      const isPlayable = roadVal > 0 && !blocked;

      let depth = 0;
      if (isPlayable) {
        playableCount++;
        if (distToSpawn < 1.5) {
          depth = 0;
        } else {
          // Layered drift noise for organic deep snowbanks
          const driftWave =
            Math.sin(gx * 0.35 + seed * 0.1) * Math.cos(gz * 0.31 - seed * 0.07) * 0.5 + 0.5;
          const n = rng();
          const base =
            biome === 'fields'
              ? 1.8 + driftWave * 2.1
              : biome === 'city'
                ? 1.3 + driftWave * 1.8
                : 1.2 + driftWave * 1.6;
          depth = Math.min(4.2, Math.max(1.0, Number((base + tierScale * 0.75 + (n - 0.5) * 0.7).toFixed(2))));
        }
      }

      cells.push({
        gx,
        gz,
        worldX,
        worldZ,
        depth,
        maxDepth: Math.max(1, depth),
        saltTimer: 0,
        surfaceType: roadVal === 2 ? 1 : roadVal === 3 ? 2 : 0,
        isPlayable,
      });
    }
  }

  return {
    districtIndex,
    biome,
    name,
    subtitle,
    gridSize,
    tileSize,
    clearTargetRatio: biome === 'fields' ? 0.85 : 0.9,
    spawnX,
    spawnZ,
    spawnAngle,
    cells,
    playableCount,
    obstacles,
  };
}

export function getWeatherAtTime(elapsed: number): {
  weather: WeatherType;
  label: string;
  blizzardIntensity: number;
  windStrength: number;
} {
  // 80s full cycle: 0-20 Calm, 20-42 Flurry, 42-64 Blizzard, 64-80 Golden Clear
  const cycle = ((elapsed % 80) + 80) % 80;
  if (cycle < 20) {
    return { weather: 'calm', label: 'Crisp Dawn', blizzardIntensity: 0, windStrength: 0.3 };
  }
  if (cycle < 42) {
    return { weather: 'flurry', label: 'Snow Flurry', blizzardIntensity: 0.25, windStrength: 1.0 };
  }
  if (cycle < 64) {
    return { weather: 'blizzard', label: 'Heavy Blizzard', blizzardIntensity: 1.0, windStrength: 2.5 };
  }
  return { weather: 'clear', label: 'Golden Clear', blizzardIntensity: 0, windStrength: 0.2 };
}

export function applyWeatherAccumulation(
  layout: DistrictLayout,
  weather: WeatherType,
  blizzardIntensity: number,
  dt: number,
): number {
  let newlyCovered = 0;
  for (let i = 0; i < layout.cells.length; i++) {
    const cell = layout.cells[i];
    if (!cell.isPlayable) continue;

    // Salted cells resist refreezing and gently melt surface frost
    if (cell.saltTimer > 0) {
      cell.saltTimer = Math.max(0, cell.saltTimer - dt);
      if (cell.depth > 0) {
        const wasPositive = cell.depth > 0;
        cell.depth = Math.max(0, cell.depth - 0.55 * dt);
        if (wasPositive && cell.depth === 0) {
          newlyCovered -= 1; // net cleared!
        }
      }
      continue;
    }

    // During blizzard, unsalted cells slowly build light snow back up
    if (blizzardIntensity > 0.1 && (weather === 'blizzard' || weather === 'flurry')) {
      const rate = blizzardIntensity * 0.065 * dt;
      if (cell.depth === 0 && rate > 0) {
        // Re-accumulation only builds thin dusting up to 1.4, and happens gradually
        cell.depth = Math.min(1.4, cell.depth + rate);
        if (cell.depth > 0.08) {
          newlyCovered += 1;
        }
      } else if (cell.depth > 0 && cell.depth < 3.5) {
        cell.depth = Math.min(3.5, cell.depth + rate * 0.6);
      }
    }
  }
  return newlyCovered;
}

export interface PlowHitResult {
  clearedIndices: number[];
  damagedIndices: number[];
  totalCoins: number;
  totalScore: number;
}

export function applyPlowClear(
  layout: DistrictLayout,
  truck: TruckState,
  specs: DerivedTruckSpecs,
  dt: number,
  comboMultiplier: number,
  alreadyClearedCount: { value: number },
): PlowHitResult {
  const sinA = Math.sin(truck.angle);
  const cosA = Math.cos(truck.angle);

  const bladeX = truck.x + sinA * specs.bladeForwardReach;
  const bladeZ = truck.z + cosA * specs.bladeForwardReach;

  const halfW = specs.bladeHalfWidth;
  const halfL = 1.15;

  const clearedIndices: number[] = [];
  const damagedIndices: number[] = [];
  let totalCoins = 0;
  let totalScore = 0;

  const halfExtent = (layout.gridSize * layout.tileSize) / 2;
  const searchRadius = halfW + 1.8;
  const minGx = Math.max(0, Math.floor((bladeX - searchRadius + halfExtent) / layout.tileSize));
  const maxGx = Math.min(
    layout.gridSize - 1,
    Math.floor((bladeX + searchRadius + halfExtent) / layout.tileSize),
  );
  const minGz = Math.max(0, Math.floor((bladeZ - searchRadius + halfExtent) / layout.tileSize));
  const maxGz = Math.min(
    layout.gridSize - 1,
    Math.floor((bladeZ + searchRadius + halfExtent) / layout.tileSize),
  );

  // Moving faster or boosting increases clearing bite, but deep snow requires sustained pushing
  const speedFactor = Math.max(0.45, Math.min(1.65, Math.abs(truck.speed) / 6.2));
  const boostMult = truck.isBoosting ? 1.45 : 1.0;
  const damageAmount = specs.plowPower * speedFactor * boostMult * Math.max(dt * 8.5, 0.45);

  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * layout.gridSize + gx;
      const cell = layout.cells[idx];
      if (!cell || !cell.isPlayable || cell.depth <= 0) continue;

      const dx = cell.worldX - bladeX;
      const dz = cell.worldZ - bladeZ;

      const localFwd = dx * sinA + dz * cosA;
      const localRight = dx * cosA - dz * sinA;

      if (Math.abs(localRight) <= halfW && Math.abs(localFwd) <= halfL) {
        const prevDepth = cell.depth;
        cell.depth = Math.max(0, prevDepth - damageAmount);
        if (cell.depth === 0) {
          clearedIndices.push(idx);
          alreadyClearedCount.value += 1;
          const reward = calculateSnowReward(
            cell.maxDepth,
            comboMultiplier,
            specs.coinBonusFactor,
          );
          totalCoins += reward.coins;
          totalScore += reward.score;
        } else {
          damagedIndices.push(idx);
        }
      }
    }
  }

  return {
    clearedIndices,
    damagedIndices,
    totalCoins,
    totalScore,
  };
}

export function applySaltSpread(
  layout: DistrictLayout,
  truck: TruckState,
  specs: DerivedTruckSpecs,
  dt: number,
  comboMultiplier: number,
): PlowHitResult {
  const clearedIndices: number[] = [];
  const damagedIndices: number[] = [];
  let totalCoins = 0;
  let totalScore = 0;

  if (!truck.saltActive || truck.saltTank <= 0.01) {
    return { clearedIndices, damagedIndices, totalCoins, totalScore };
  }

  truck.saltTank = Math.max(0, truck.saltTank - specs.saltDrainRate * dt);
  if (truck.saltTank <= 0.001) {
    truck.saltActive = false;
  }

  const sinA = Math.sin(truck.angle);
  const cosA = Math.cos(truck.angle);
  // Spreader sits at rear hopper
  const spreadX = truck.x - sinA * 1.4;
  const spreadZ = truck.z - cosA * 1.4;

  const halfExtent = (layout.gridSize * layout.tileSize) / 2;
  const rad = specs.saltRadius;
  const minGx = Math.max(0, Math.floor((spreadX - rad + halfExtent) / layout.tileSize));
  const maxGx = Math.min(layout.gridSize - 1, Math.floor((spreadX + rad + halfExtent) / layout.tileSize));
  const minGz = Math.max(0, Math.floor((spreadZ - rad + halfExtent) / layout.tileSize));
  const maxGz = Math.min(layout.gridSize - 1, Math.floor((spreadZ + rad + halfExtent) / layout.tileSize));

  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * layout.gridSize + gx;
      const cell = layout.cells[idx];
      if (!cell || !cell.isPlayable) continue;
      const dist = Math.hypot(cell.worldX - spreadX, cell.worldZ - spreadZ);
      if (dist <= rad) {
        cell.saltTimer = specs.saltDuration;
        if (cell.depth > 0) {
          cell.depth = Math.max(0, cell.depth - 0.85 * dt);
          if (cell.depth === 0) {
            clearedIndices.push(idx);
            const r = calculateSnowReward(cell.maxDepth, comboMultiplier, specs.coinBonusFactor);
            totalCoins += r.coins;
            totalScore += r.score;
          } else {
            damagedIndices.push(idx);
          }
        }
      }
    }
  }

  return { clearedIndices, damagedIndices, totalCoins, totalScore };
}

export function applyHotWaterJet(
  layout: DistrictLayout,
  truck: TruckState,
  specs: DerivedTruckSpecs,
  dt: number,
  comboMultiplier: number,
): PlowHitResult {
  const clearedIndices: number[] = [];
  const damagedIndices: number[] = [];
  let totalCoins = 0;
  let totalScore = 0;

  if (!truck.hotWaterActive || truck.hotWaterEnergy <= 0.02) {
    return { clearedIndices, damagedIndices, totalCoins, totalScore };
  }

  truck.hotWaterEnergy = Math.max(0, truck.hotWaterEnergy - specs.hotWaterDrainRate * dt);

  const sinA = Math.sin(truck.angle);
  const cosA = Math.cos(truck.angle);
  const noseX = truck.x + sinA * 1.4;
  const noseZ = truck.z + cosA * 1.4;

  const halfExtent = (layout.gridSize * layout.tileSize) / 2;
  const reach = specs.hotWaterReach;
  const minGx = Math.max(0, Math.floor((noseX - reach + halfExtent) / layout.tileSize));
  const maxGx = Math.min(layout.gridSize - 1, Math.floor((noseX + reach + halfExtent) / layout.tileSize));
  const minGz = Math.max(0, Math.floor((noseZ - reach + halfExtent) / layout.tileSize));
  const maxGz = Math.min(layout.gridSize - 1, Math.floor((noseZ + reach + halfExtent) / layout.tileSize));

  const meltAmt = specs.hotWaterPower * dt;
  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const idx = gz * layout.gridSize + gx;
      const cell = layout.cells[idx];
      if (!cell || !cell.isPlayable || cell.depth <= 0) continue;

      const dx = cell.worldX - noseX;
      const dz = cell.worldZ - noseZ;
      const fwd = dx * sinA + dz * cosA;
      const side = Math.abs(dx * cosA - dz * sinA);

      if (fwd >= 0 && fwd <= reach && side <= 1.2 + fwd * 0.35) {
        cell.depth = Math.max(0, cell.depth - meltAmt);
        cell.saltTimer = Math.max(cell.saltTimer, 6); // Warm wet asphalt resists quick freeze
        if (cell.depth === 0) {
          clearedIndices.push(idx);
          const r = calculateSnowReward(cell.maxDepth, comboMultiplier, specs.coinBonusFactor);
          totalCoins += r.coins;
          totalScore += r.score;
        } else {
          damagedIndices.push(idx);
        }
      }
    }
  }

  return { clearedIndices, damagedIndices, totalCoins, totalScore };
}

export function sampleSnowDepthAt(layout: DistrictLayout, wx: number, wz: number): number {
  const halfExtent = (layout.gridSize * layout.tileSize) / 2;
  const gx = Math.floor((wx + halfExtent) / layout.tileSize);
  const gz = Math.floor((wz + halfExtent) / layout.tileSize);
  if (gx < 0 || gx >= layout.gridSize || gz < 0 || gz >= layout.gridSize) return 0;
  const cell = layout.cells[gz * layout.gridSize + gx];
  return cell && cell.isPlayable ? cell.depth : 0;
}

export interface DriveInputs {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  hotWater: boolean;
}

export function stepTruckKinematics(
  truck: TruckState,
  inputs: DriveInputs,
  specs: DerivedTruckSpecs,
  layout: DistrictLayout,
  dt: number,
): void {
  const throttle = (inputs.forward ? 1 : 0) - (inputs.backward ? 1 : 0);
  const steerInput = (inputs.left ? 1 : 0) - (inputs.right ? 1 : 0);

  // Boost energy
  const wantsBoost = inputs.boost && Math.abs(throttle) > 0 && truck.boostEnergy > 0.05;
  truck.isBoosting = wantsBoost;
  if (wantsBoost) {
    truck.boostEnergy = Math.max(0, truck.boostEnergy - specs.boostDrainRate * dt);
  } else {
    truck.boostEnergy = Math.min(1, truck.boostEnergy + specs.boostRechargeRate * dt);
  }

  // Hot Water boiler energy
  truck.hotWaterActive = inputs.hotWater && truck.hotWaterEnergy > 0.03;
  if (!truck.hotWaterActive) {
    truck.hotWaterEnergy = Math.min(1, truck.hotWaterEnergy + specs.hotWaterRechargeRate * dt);
  }

  // Salt hopper gentle recharge when spreader is off (or slow refill depot regen)
  if (!truck.saltActive) {
    truck.saltTank = Math.min(1, truck.saltTank + specs.saltRechargeRate * dt);
  }

  // Snow resistance under nose/chassis makes deep drifts feel heavy!
  const sinA = Math.sin(truck.angle);
  const cosA = Math.cos(truck.angle);
  const d1 = sampleSnowDepthAt(layout, truck.x + sinA * 1.4, truck.z + cosA * 1.4);
  const d2 = sampleSnowDepthAt(layout, truck.x, truck.z);
  const snowDepth = Math.max(d1, d2 * 0.8);
  truck.underSnowDepth = snowDepth;

  // Resistance scales down top speed when pushing heavy snow (reduced by Boost & heavier vehicles)
  const dragPenalty = snowDepth * specs.snowResistanceFactor * (wantsBoost ? 0.45 : 1.0);
  const snowSpeedScale = 1 / (1 + dragPenalty);

  const rawMax = wantsBoost ? specs.boostMaxSpeed : specs.maxSpeed;
  const targetMaxSpeed = rawMax * snowSpeedScale;
  const targetSpeed =
    throttle > 0
      ? targetMaxSpeed
      : throttle < 0
        ? -specs.maxSpeed * 0.52 * snowSpeedScale
        : 0;

  const rate = throttle !== 0 ? specs.accel * (wantsBoost ? 1.35 : 1) : 14;
  if (truck.speed < targetSpeed) {
    truck.speed = Math.min(targetSpeed, truck.speed + rate * dt);
  } else if (truck.speed > targetSpeed) {
    truck.speed = Math.max(targetSpeed, truck.speed - rate * dt);
  }

  const targetSteer = steerInput * 0.55;
  truck.steerAngle += (targetSteer - truck.steerAngle) * Math.min(1, 12 * dt);

  const speedAbs = Math.abs(truck.speed);
  const turnAuthority = speedAbs > 0.25 ? Math.min(1, speedAbs / 3.0) : 0.38;
  const reverseSign = truck.speed < -0.2 ? -1 : 1;
  truck.angle += steerInput * specs.turnRate * turnAuthority * reverseSign * dt;

  truck.x += Math.sin(truck.angle) * truck.speed * dt;
  truck.z += Math.cos(truck.angle) * truck.speed * dt;
  truck.wheelRoll += truck.speed * dt * 2.1;

  const boundsHalfExtent = (layout.gridSize * layout.tileSize) / 2;
  const limit = boundsHalfExtent - 1.5;
  if (truck.x < -limit) {
    truck.x = -limit;
    truck.speed *= 0.6;
  } else if (truck.x > limit) {
    truck.x = limit;
    truck.speed *= 0.6;
  }
  if (truck.z < -limit) {
    truck.z = -limit;
    truck.speed *= 0.6;
  } else if (truck.z > limit) {
    truck.z = limit;
    truck.speed *= 0.6;
  }

  const truckRadius = 1.25;
  for (const obs of layout.obstacles) {
    const dx = truck.x - obs.x;
    const dz = truck.z - obs.z;
    const minDist = truckRadius + obs.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 0.001;
      const nx = dx / dist;
      const nz = dz / dist;
      const push = minDist - dist;
      truck.x += nx * push;
      truck.z += nz * push;
      truck.speed *= 0.85;
    }
  }
}

export function countClearedCells(layout: DistrictLayout): number {
  let cleared = 0;
  for (const cell of layout.cells) {
    if (cell.isPlayable && cell.depth <= 0) {
      cleared++;
    }
  }
  return cleared;
}

export function checkDistrictClear(clearedCells: number, layout: DistrictLayout): boolean {
  if (layout.playableCount <= 0) return false;
  return clearedCells / layout.playableCount >= layout.clearTargetRatio;
}
