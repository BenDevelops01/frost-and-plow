import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CUSTOM_CONFIG,
  INITIAL_UPGRADES,
  applyHotWaterJet,
  applyPlowClear,
  applySaltSpread,
  applyWeatherAccumulation,
  calculateSnowReward,
  canAffordUpgrade,
  checkDistrictClear,
  countClearedCells,
  generateDistrictLayout,
  getComboMultiplier,
  getDerivedSpecs,
  getUpgradeCost,
  getWeatherAtTime,
  stepCombo,
  stepTruckKinematics,
} from './rules';
import type { ComboState, TruckState } from './types';

function makeTestTruck(x: number, z: number, angle: number): TruckState {
  return {
    x,
    z,
    angle,
    speed: 8,
    steerAngle: 0,
    boostEnergy: 1,
    isBoosting: false,
    saltActive: false,
    saltTank: 1,
    hotWaterActive: false,
    hotWaterEnergy: 1,
    underSnowDepth: 0,
    wheelRoll: 0,
  };
}

test('generateDistrictLayout creates unique layouts per district and across all 3 biomes with open spawn', () => {
  const biomes = ['village', 'city', 'fields'] as const;
  for (const biome of biomes) {
    const layout = generateDistrictLayout(1, {
      biome,
      size: 'standard',
      snowIntensity: 'normal',
    });
    assert.equal(layout.biome, biome);
    assert.ok(layout.playableCount > 250, `Expected playable snow in ${biome}`);

    for (const obs of layout.obstacles) {
      const dist = Math.hypot(layout.spawnX - obs.x, layout.spawnZ - obs.z);
      assert.ok(dist > obs.radius + 1.3, `${biome} spawn overlaps ${obs.id}`);
    }
  }

  // Different district indices produce distinct snow/obstacle arrangements
  const d1 = generateDistrictLayout(1, DEFAULT_CUSTOM_CONFIG);
  const d4 = generateDistrictLayout(4, DEFAULT_CUSTOM_CONFIG);
  assert.notDeepEqual(
    d1.obstacles.map((o) => [o.x, o.z]),
    d4.obstacles.map((o) => [o.x, o.z]),
  );
});

test('vehicle specs and snow resistance make heavier vehicles push snow faster', () => {
  const layout = generateDistrictLayout(1, {
    biome: 'fields',
    size: 'standard',
    snowIntensity: 'heavy',
  });
  const pickupSpecs = getDerivedSpecs(INITIAL_UPGRADES, 'pickup');
  const trackedSpecs = getDerivedSpecs(INITIAL_UPGRADES, 'trackedSki');

  assert.ok(trackedSpecs.snowResistanceFactor < pickupSpecs.snowResistanceFactor);
  assert.ok(trackedSpecs.plowPower > pickupSpecs.plowPower);

  const tPickup = makeTestTruck(layout.spawnX, layout.spawnZ - 3, layout.spawnAngle);
  tPickup.speed = 0;
  const tTracked = makeTestTruck(layout.spawnX, layout.spawnZ - 3, layout.spawnAngle);
  tTracked.speed = 0;

  for (let i = 0; i < 20; i++) {
    stepTruckKinematics(
      tPickup,
      { forward: true, backward: false, left: false, right: false, boost: false, hotWater: false },
      pickupSpecs,
      layout,
      0.04,
    );
    stepTruckKinematics(
      tTracked,
      { forward: true, backward: false, left: false, right: false, boost: false, hotWater: false },
      trackedSpecs,
      layout,
      0.04,
    );
  }
  assert.ok(
    tTracked.speed > tPickup.speed,
    `Expected tracked ski plow (${tTracked.speed.toFixed(2)}) to push deeper snow faster than pickup (${tPickup.speed.toFixed(2)})`,
  );
});

test('salt spreader protects road tiles against blizzard accumulation and hot water melts deep drifts', () => {
  const layout = generateDistrictLayout(1, {
    biome: 'city',
    size: 'standard',
    snowIntensity: 'heavy',
  });
  const specs = getDerivedSpecs(INITIAL_UPGRADES, 'pickup');
  const truck = makeTestTruck(layout.spawnX, layout.spawnZ, layout.spawnAngle);

  // Activate salt spreader
  truck.saltActive = true;
  applySaltSpread(layout, truck, specs, 0.2, 1);
  const saltedCell = layout.cells.find((c) => c.isPlayable && c.saltTimer > 0);
  assert.ok(saltedCell, 'Expected nearby playable cell to receive salt protection');

  // Ensure cleared salted cell resists blizzard accumulation
  saltedCell.depth = 0;
  applyWeatherAccumulation(layout, 'blizzard', 1.0, 2.0);
  assert.equal(saltedCell.depth, 0, 'Salted tile should resist blizzard accumulation');

  // Test hot water thermal jet melts deep drift in front of nose
  const frontCell = layout.cells.find(
    (c) =>
      c.isPlayable &&
      c.depth > 0 &&
      Math.abs(c.worldX - truck.x) < 1.0 &&
      c.worldZ < truck.z &&
      truck.z - c.worldZ < 3.5,
  );
  assert.ok(frontCell, 'Expected deep cell in front of truck');
  const beforeDepth = frontCell.depth;
  truck.hotWaterActive = true;
  applyHotWaterJet(layout, truck, specs, 0.25, 2);
  assert.ok(frontCell.depth < beforeDepth, 'Hot water jet should melt snow ahead');
});

test('weather cycle transitions cleanly through calm, flurry, blizzard, and clear', () => {
  assert.equal(getWeatherAtTime(5).weather, 'calm');
  assert.equal(getWeatherAtTime(25).weather, 'flurry');
  assert.equal(getWeatherAtTime(50).weather, 'blizzard');
  assert.equal(getWeatherAtTime(70).weather, 'clear');
});

test('upgrade cost, combo multiplier, plow clearing, and district completion work cleanly', () => {
  const baseCost = getUpgradeCost('bladeWidth', 0);
  assert.equal(canAffordUpgrade(baseCost - 1, INITIAL_UPGRADES, 'bladeWidth'), false);
  assert.equal(canAffordUpgrade(baseCost, INITIAL_UPGRADES, 'bladeWidth'), true);
  assert.equal(getComboMultiplier(49), 8);

  let combo: ComboState = {
    count: 0,
    multiplier: 1,
    timer: 0,
    maxTimer: 2.7,
    maxComboReached: 0,
  };
  combo = stepCombo(combo, 0.016, 4, 2.7);
  assert.equal(combo.multiplier, 2);

  const layout = generateDistrictLayout(1);
  const specs = getDerivedSpecs(INITIAL_UPGRADES, 'pickup');
  const truck = makeTestTruck(layout.spawnX, layout.spawnZ, layout.spawnAngle);
  stepTruckKinematics(
    truck,
    { forward: true, backward: false, left: false, right: false, boost: false, hotWater: false },
    specs,
    layout,
    0.45,
  );
  const counter = { value: countClearedCells(layout) };
  const hit = applyPlowClear(layout, truck, specs, 0.12, 3, counter);
  assert.ok(hit.clearedIndices.length > 0 || hit.damagedIndices.length > 0);
  assert.equal(calculateSnowReward(1, 3, 1).coins, 6);
  assert.equal(checkDistrictClear(Math.ceil(layout.playableCount * layout.clearTargetRatio), layout), true);
});
