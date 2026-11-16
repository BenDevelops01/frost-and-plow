import * as THREE from 'three';
import type { VehicleId } from '../game/types';
import type { ProceduralTexturePack } from './textures';

export interface SnowplowRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  bladeGroup: THREE.Group;
  saltSpinner: THREE.Group;
  heatCoilMat: THREE.MeshStandardMaterial;
  beaconMat: THREE.MeshStandardMaterial;
  steamNozzleMat: THREE.MeshStandardMaterial;
  frontSteerLeft: THREE.Group;
  frontSteerRight: THREE.Group;
  spinWheels: THREE.Group[];
  setBladeScale: (scale: number) => void;
  setHeatLevel: (level: number) => void;
  setHotWaterActive: (active: boolean) => void;
}

function makeCurvedBlade(
  width: number,
  colorHex: number,
  chassisMat: THREE.Material,
  heatCoilMat: THREE.MeshStandardMaterial,
  steamNozzleMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const bladeGroup = new THREE.Group();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.38,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x333c4a,
    roughness: 0.6,
    metalness: 0.65,
  });

  const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.64), chassisMat);
  armLeft.position.set(-0.44, 0.02, -0.2);
  bladeGroup.add(armLeft);

  const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.64), chassisMat);
  armRight.position.set(0.44, 0.02, -0.2);
  bladeGroup.add(armRight);

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, -0.28);
  bladeShape.quadraticCurveTo(0.24, -0.08, 0.08, 0.38);
  bladeShape.lineTo(-0.08, 0.38);
  bladeShape.quadraticCurveTo(0.06, -0.05, -0.1, -0.28);
  bladeShape.closePath();

  const bladeExtrude = new THREE.ExtrudeGeometry(bladeShape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  bladeExtrude.center();
  bladeExtrude.rotateY(Math.PI / 2);

  const bladeMesh = new THREE.Mesh(bladeExtrude, bladeMat);
  bladeMesh.position.set(0, 0.08, 0.22);
  bladeMesh.castShadow = true;
  bladeGroup.add(bladeMesh);

  const scraperEdge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.09, 0.14), edgeMat);
  scraperEdge.position.set(0, -0.21, 0.26);
  bladeGroup.add(scraperEdge);

  // Hot-water / thermal bar & twin brass spray nozzles
  const heatBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, width - 0.12, 10),
    heatCoilMat,
  );
  heatBar.rotation.z = Math.PI / 2;
  heatBar.position.set(0, -0.08, 0.33);
  bladeGroup.add(heatBar);

  [-width * 0.26, width * 0.26].forEach((nx) => {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.08, 0.18, 8),
      steamNozzleMat,
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(nx, 0.22, 0.34);
    bladeGroup.add(nozzle);
  });

  return bladeGroup;
}

function makeRearSaltSpreader(chassisMat: THREE.Material): THREE.Group {
  const spreaderRoot = new THREE.Group();

  const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.1, 0.35, 8), chassisMat);
  chute.position.y = 0.22;
  spreaderRoot.add(chute);

  const spinner = new THREE.Group();
  spreaderRoot.add(spinner);

  const discMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.35,
    metalness: 0.4,
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 12), discMat);
  spinner.add(disc);

  // 4 vane ribs on spinner so rotation is clearly readable
  const vaneGeo = new THREE.BoxGeometry(0.58, 0.08, 0.05);
  const v1 = new THREE.Mesh(vaneGeo, chassisMat);
  v1.position.y = 0.04;
  spinner.add(v1);

  const v2 = new THREE.Mesh(vaneGeo, chassisMat);
  v2.rotation.y = Math.PI / 2;
  v2.position.y = 0.04;
  spinner.add(v2);

  return spreaderRoot;
}

export function createSnowplowVehicle(
  vehicleId: VehicleId,
  textures: ProceduralTexturePack,
): SnowplowRig {
  if (vehicleId === 'bigRig') {
    return createBigRigSnowplow(textures);
  }
  if (vehicleId === 'trackedSki') {
    return createTrackedSkiSnowplow(textures);
  }
  return createPickupSnowplow(textures);
}

function createPickupSnowplow(textures: ProceduralTexturePack): SnowplowRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  group.add(shadowPlane);

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.85, metalness: 0.25 });
  const cabPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0xc93b32,
    roughness: 0.24,
    metalness: 0.12,
    clearcoat: 0.85,
  });
  const roofCreamMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x22384d, roughness: 0.08, metalness: 0.35 });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodPlankMap,
    roughness: 0.78,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.18, metalness: 0.88 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1d2128, roughness: 0.92 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc26d38, roughness: 0.3, metalness: 0.75 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd770,
    emissiveIntensity: 1.6,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffaa1d,
    emissive: 0xff8c00,
    emissiveIntensity: 1.5,
  });
  const heatCoilMat = new THREE.MeshStandardMaterial({
    color: 0x5c3624,
    emissive: 0xff5a1f,
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0.5,
  });
  const steamNozzleMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x38bdf8,
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.75,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.28, 3.05), chassisMat);
  chassis.position.set(0, 0.44, -0.05);
  chassis.castShadow = true;
  bodyPivot.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.62, 1.05), cabPaintMat);
  hood.position.set(0, 0.82, 0.82);
  hood.castShadow = true;
  bodyPivot.add(hood);

  const cabLower = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.65, 1.08), cabPaintMat);
  cabLower.position.set(0, 0.86, 0.02);
  cabLower.castShadow = true;
  bodyPivot.add(cabLower);

  const cabUpper = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.56, 0.96), cabPaintMat);
  cabUpper.position.set(0, 1.44, -0.02);
  cabUpper.castShadow = true;
  bodyPivot.add(cabUpper);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.4, 1.01), glassMat);
  windshield.position.set(0, 1.44, 0);
  bodyPivot.add(windshield);

  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, 0.72), glassMat);
  sideWindows.position.set(0, 1.44, -0.02);
  bodyPivot.add(sideWindows);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 1.04), roofCreamMat);
  roofCap.position.set(0, 1.76, -0.02);
  bodyPivot.add(roofCap);

  // Rear hopper + hot-water copper boiler tank + salt spreader
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 1.28), chassisMat);
  bedFloor.position.set(0, 0.68, -1.04);
  bodyPivot.add(bedFloor);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 1.24), woodMat);
  leftWall.position.set(-0.7, 0.96, -1.04);
  bodyPivot.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 1.24), woodMat);
  rightWall.position.set(0.7, 0.96, -1.04);
  bodyPivot.add(rightWall);

  // Copper Hot Water Tank nestled on hopper side
  const boilerTank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.95, 12), copperMat);
  boilerTank.rotation.x = Math.PI / 2;
  boilerTank.position.set(-0.36, 1.04, -1.04);
  bodyPivot.add(boilerTank);

  const saltMound = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 0.34, 8), roofCreamMat);
  saltMound.position.set(0.24, 0.94, -1.04);
  bodyPivot.add(saltMound);

  const spreader = makeRearSaltSpreader(chassisMat);
  spreader.position.set(0, 0.42, -1.78);
  bodyPivot.add(spreader);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.36, 0.08), chromeMat);
  grille.position.set(0, 0.78, 1.36);
  bodyPivot.add(grille);

  [-0.52, 0.52].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 0.84, 1.35);
    bodyPivot.add(hl);
  });

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 1.18, 10), chromeMat);
  exhaust.position.set(0.76, 1.3, -0.44);
  bodyPivot.add(exhaust);

  const beaconDome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 12), beaconMat);
  beaconDome.position.set(0, 1.92, 0.04);
  bodyPivot.add(beaconDome);

  const spinWheels: THREE.Group[] = [];
  const makeWheel = (x: number, z: number) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(x, 0.36, z);
    const spinPivot = new THREE.Group();
    steerPivot.add(spinPivot);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spinPivot.add(tire);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), chromeMat);
    hub.rotation.z = Math.PI / 2;
    spinPivot.add(hub);

    group.add(steerPivot);
    spinWheels.push(spinPivot);
    return steerPivot;
  };

  const frontSteerLeft = makeWheel(-0.78, 0.88);
  const frontSteerRight = makeWheel(0.78, 0.88);
  makeWheel(-0.78, -1.04);
  makeWheel(0.78, -1.04);

  const bladeGroup = makeCurvedBlade(2.38, 0xf4b41a, chassisMat, heatCoilMat, steamNozzleMat);
  bladeGroup.position.set(0, 0.34, 1.54);
  bodyPivot.add(bladeGroup);

  return {
    group,
    bodyPivot,
    bladeGroup,
    saltSpinner: spreader.children[1] as THREE.Group,
    heatCoilMat,
    beaconMat,
    steamNozzleMat,
    frontSteerLeft,
    frontSteerRight,
    spinWheels,
    setBladeScale: (scale) => bladeGroup.scale.set(scale, 1, 1),
    setHeatLevel: (lvl) => {
      heatCoilMat.emissiveIntensity = lvl * 0.55;
    },
    setHotWaterActive: (active) => {
      steamNozzleMat.emissiveIntensity = active ? 2.2 : 0;
    },
  };
}

function createBigRigSnowplow(textures: ProceduralTexturePack): SnowplowRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 5.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  group.add(shadowPlane);

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.85, metalness: 0.3 });
  const rigYellowMat = new THREE.MeshPhysicalMaterial({
    color: 0xe89b1c,
    roughness: 0.25,
    metalness: 0.2,
    clearcoat: 0.85,
  });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2f42, roughness: 0.08, metalness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.9 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x181b20, roughness: 0.92 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc86432, roughness: 0.3, metalness: 0.78 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd770,
    emissiveIntensity: 1.8,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffaa1d,
    emissive: 0xff8c00,
    emissiveIntensity: 1.6,
  });
  const heatCoilMat = new THREE.MeshStandardMaterial({
    color: 0x5c3624,
    emissive: 0xff5a1f,
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0.5,
  });
  const steamNozzleMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x38bdf8,
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.75,
  });

  // Heavy long chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 4.1), chassisMat);
  chassis.position.set(0, 0.52, -0.15);
  chassis.castShadow = true;
  bodyPivot.add(chassis);

  // Massive flat-nose / long-hood municipal cab
  const engineHood = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.88, 1.2), rigYellowMat);
  engineHood.position.set(0, 1.05, 1.15);
  engineHood.castShadow = true;
  bodyPivot.add(engineHood);

  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.48, 1.3), rigYellowMat);
  cabBody.position.set(0, 1.42, 0.15);
  cabBody.castShadow = true;
  bodyPivot.add(cabBody);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.56, 1.34), glassMat);
  windshield.position.set(0, 1.72, 0.15);
  bodyPivot.add(windshield);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.14, 1.42), stripeMat);
  visor.position.set(0, 2.2, 0.18);
  bodyPivot.add(visor);

  // Twin vertical chrome exhaust stacks
  [-0.96, 0.96].forEach((ex) => {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 1.75, 10), chromeMat);
    stack.position.set(ex, 1.55, -0.52);
    stack.castShadow = true;
    bodyPivot.add(stack);
  });

  // Rear Salt Hopper + Dual Copper Hot-Water Boiler Tank
  const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.76, 1.75), chassisMat);
  hopper.position.set(0, 1.04, -1.25);
  hopper.castShadow = true;
  bodyPivot.add(hopper);

  const saltPile = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 0.42, 8), stripeMat);
  saltPile.position.set(0.28, 1.48, -1.25);
  bodyPivot.add(saltPile);

  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.45, 12), copperMat);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(-0.48, 1.52, -1.25);
  bodyPivot.add(boiler);

  const spreader = makeRearSaltSpreader(chassisMat);
  spreader.position.set(0, 0.48, -2.28);
  bodyPivot.add(spreader);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.58, 0.1), chromeMat);
  grille.position.set(0, 1.02, 1.76);
  bodyPivot.add(grille);

  [-0.68, 0.68].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 1.04, 1.76);
    bodyPivot.add(hl);
  });

  // Dual roof beacons
  [-0.5, 0.5].forEach((bx) => {
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.18, 10), beaconMat);
    dome.position.set(bx, 2.34, 0.2);
    bodyPivot.add(dome);
  });

  // 6 Heavy Wheels (1 front steer axle + 2 rear tandem axles)
  const spinWheels: THREE.Group[] = [];
  const makeWheel = (x: number, z: number) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(x, 0.44, z);
    const spinPivot = new THREE.Group();
    steerPivot.add(spinPivot);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 14), rubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spinPivot.add(tire);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10), chromeMat);
    hub.rotation.z = Math.PI / 2;
    spinPivot.add(hub);

    group.add(steerPivot);
    spinWheels.push(spinPivot);
    return steerPivot;
  };

  const frontSteerLeft = makeWheel(-0.94, 1.2);
  const frontSteerRight = makeWheel(0.94, 1.2);
  makeWheel(-0.94, -0.78);
  makeWheel(0.94, -0.78);
  makeWheel(-0.94, -1.72);
  makeWheel(0.94, -1.72);

  const bladeGroup = makeCurvedBlade(2.85, 0xd94436, chassisMat, heatCoilMat, steamNozzleMat);
  bladeGroup.position.set(0, 0.38, 1.98);
  bladeGroup.scale.set(1, 1.15, 1.1);
  bodyPivot.add(bladeGroup);

  return {
    group,
    bodyPivot,
    bladeGroup,
    saltSpinner: spreader.children[1] as THREE.Group,
    heatCoilMat,
    beaconMat,
    steamNozzleMat,
    frontSteerLeft,
    frontSteerRight,
    spinWheels,
    setBladeScale: (scale) => bladeGroup.scale.set(scale, 1.15, 1.1),
    setHeatLevel: (lvl) => {
      heatCoilMat.emissiveIntensity = lvl * 0.55;
    },
    setHotWaterActive: (active) => {
      steamNozzleMat.emissiveIntensity = active ? 2.2 : 0;
    },
  };
}

function createTrackedSkiSnowplow(textures: ProceduralTexturePack): SnowplowRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 4.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.025;
  group.add(shadowPlane);

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85, metalness: 0.35 });
  const catBlueMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.24,
    metalness: 0.18,
    clearcoat: 0.85,
  });
  const skiOrangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.32,
    metalness: 0.25,
  });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x172b3e, roughness: 0.08, metalness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.18, metalness: 0.85 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.92 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0xc26d38, roughness: 0.3, metalness: 0.78 });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd770,
    emissiveIntensity: 1.7,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xffaa1d,
    emissive: 0xff8c00,
    emissiveIntensity: 1.6,
  });
  const heatCoilMat = new THREE.MeshStandardMaterial({
    color: 0x5c3624,
    emissive: 0xff5a1f,
    emissiveIntensity: 0,
    roughness: 0.35,
    metalness: 0.5,
  });
  const steamNozzleMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x38bdf8,
    emissiveIntensity: 0,
    roughness: 0.25,
    metalness: 0.75,
  });

  // Snowcat deck chassis
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 3.1), chassisMat);
  deck.position.set(0, 0.62, -0.15);
  deck.castShadow = true;
  bodyPivot.add(deck);

  // Panoramic glacier snowcat cab
  const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.05, 1.45), catBlueMat);
  cabBody.position.set(0, 1.25, 0.35);
  cabBody.castShadow = true;
  bodyPivot.add(cabBody);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.62, 1.48), glassMat);
  windshield.position.set(0, 1.38, 0.36);
  bodyPivot.add(windshield);

  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.12, 1.52), skiOrangeMat);
  roofRack.position.set(0, 1.82, 0.35);
  bodyPivot.add(roofRack);

  // Rear Thermal Boiler & Salt Spreader Hopper
  const saltBin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.64, 1.1), skiOrangeMat);
  saltBin.position.set(0, 1.08, -1.05);
  saltBin.castShadow = true;
  bodyPivot.add(saltBin);

  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.05, 12), copperMat);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0, 1.52, -1.05);
  bodyPivot.add(boiler);

  const spreader = makeRearSaltSpreader(chassisMat);
  spreader.position.set(0, 0.44, -1.86);
  bodyPivot.add(spreader);

  [-0.52, 0.52].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 1.86, 1.12);
    bodyPivot.add(hl);
  });

  const beaconDome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 12), beaconMat);
  beaconDome.position.set(0, 1.96, 0.35);
  bodyPivot.add(beaconDome);

  // Caterpillar Track Pods (Left & Right) with spinning bogie wheels
  const spinWheels: THREE.Group[] = [];
  [-0.95, 0.95].forEach((tx) => {
    const trackPod = new THREE.Group();
    trackPod.position.set(tx, 0.34, -0.45);
    group.add(trackPod);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 2.25), trackMat);
    belt.castShadow = true;
    trackPod.add(belt);

    [-0.85, 0, 0.85].forEach((wz) => {
      const bogie = new THREE.Group();
      bogie.position.set(tx > 0 ? 0.06 : -0.06, 0, wz);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.44, 12), chromeMat);
      wheel.rotation.z = Math.PI / 2;
      bogie.add(wheel);
      trackPod.add(bogie);
      spinWheels.push(bogie);
    });
  });

  // Articulated Front Steering Skis!
  const makeSki = (x: number, z: number) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(x, 0.16, z);

    const skiBlade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 1.22), skiOrangeMat);
    skiBlade.castShadow = true;
    steerPivot.add(skiBlade);

    // Upturned curved ski tip
    const skiTip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.32), skiOrangeMat);
    skiTip.rotation.x = -0.48;
    skiTip.position.set(0, 0.07, 0.72);
    steerPivot.add(skiTip);

    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.46, 8), chromeMat);
    strut.position.set(0, 0.24, -0.08);
    steerPivot.add(strut);

    group.add(steerPivot);
    return steerPivot;
  };

  const frontSteerLeft = makeSki(-0.88, 1.15);
  const frontSteerRight = makeSki(0.88, 1.15);

  const bladeGroup = makeCurvedBlade(2.65, 0x38bdf8, chassisMat, heatCoilMat, steamNozzleMat);
  bladeGroup.position.set(0, 0.34, 1.82);
  bodyPivot.add(bladeGroup);

  return {
    group,
    bodyPivot,
    bladeGroup,
    saltSpinner: spreader.children[1] as THREE.Group,
    heatCoilMat,
    beaconMat,
    steamNozzleMat,
    frontSteerLeft,
    frontSteerRight,
    spinWheels,
    setBladeScale: (scale) => bladeGroup.scale.set(scale, 1, 1),
    setHeatLevel: (lvl) => {
      heatCoilMat.emissiveIntensity = lvl * 0.55;
    },
    setHotWaterActive: (active) => {
      steamNozzleMat.emissiveIntensity = active ? 2.2 : 0;
    },
  };
}

export function createAlpineCabin(
  variant: number,
  textures: ProceduralTexturePack,
): THREE.Group {
  const cabin = new THREE.Group();

  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  cabin.add(sh);

  const wallColors = [0xd4a373, 0xb87654, 0xcab99c];
  const roofColors = [0x4c5f7a, 0x733b3b, 0x3b5c4d];

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: wallColors[variant % wallColors.length],
    map: textures.woodPlankMap,
    roughness: 0.82,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofColors[variant % roofColors.length],
    roughness: 0.72,
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf6faff,
    bumpMap: textures.snowBumpMap,
    bumpScale: 0.03,
    roughness: 0.76,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffdf9a,
    emissive: 0xffa733,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.48, 2.8), stoneMat);
  base.position.y = 0.24;
  base.castShadow = true;
  base.receiveShadow = true;
  cabin.add(base);

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.96, 1.55, 2.56), timberMat);
  walls.position.y = 1.25;
  walls.castShadow = true;
  walls.receiveShadow = true;
  cabin.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.72, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.14, 1, 1.0);
  roof.position.y = 2.78;
  roof.castShadow = true;
  cabin.add(roof);

  const snowRoof = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.38, 4), snowMat);
  snowRoof.rotation.y = Math.PI / 4;
  snowRoof.scale.set(1.12, 1, 0.98);
  snowRoof.position.y = 3.04;
  snowRoof.receiveShadow = true;
  cabin.add(snowRoof);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.5, 0.48), stoneMat);
  chimney.position.set(0.85, 3.05, -0.45);
  chimney.castShadow = true;
  cabin.add(chimney);

  const winFrontL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.08), warmWindowMat);
  winFrontL.position.set(-0.78, 1.35, 1.29);
  cabin.add(winFrontL);

  const winFrontR = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.08), warmWindowMat);
  winFrontR.position.set(0.78, 1.35, 1.29);
  cabin.add(winFrontR);

  const winBack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.08), warmWindowMat);
  winBack.position.set(0, 1.35, -1.29);
  cabin.add(winBack);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.02, 0.1), trimMat);
  door.position.set(0, 0.98, 1.29);
  cabin.add(door);

  const winSideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.72), warmWindowMat);
  winSideR.position.set(1.49, 1.35, 0);
  cabin.add(winSideR);

  const winSideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.72), warmWindowMat);
  winSideL.position.set(-1.49, 1.35, 0);
  cabin.add(winSideL);

  return cabin;
}

export function createCityBuilding(
  variant: number,
  textures: ProceduralTexturePack,
): THREE.Group {
  const bldg = new THREE.Group();

  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  bldg.add(sh);

  const facadePalette = [0x8c4a42, 0x56687a, 0x7c6a58];
  const heights = [4.4, 5.8, 3.8];
  const h = heights[variant % heights.length];

  const masonryMat = new THREE.MeshStandardMaterial({
    color: facadePalette[variant % facadePalette.length],
    roughness: 0.82,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    bumpMap: textures.snowBumpMap,
    bumpScale: 0.025,
    roughness: 0.78,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xffb347,
    emissiveIntensity: 1.2,
    roughness: 0.25,
  });

  // Ground-floor dark shopfront base
  const lobby = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.2, 3.3), trimMat);
  lobby.position.y = 0.6;
  lobby.castShadow = true;
  bldg.add(lobby);

  // Upper brick/stone tower
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.15, h, 3.15), masonryMat);
  body.position.y = 1.2 + h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  bldg.add(body);

  // Parapet cornice + snowy roof blanket
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.28, 3.4), trimMat);
  parapet.position.y = 1.2 + h + 0.14;
  bldg.add(parapet);

  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.24, 3.18), snowMat);
  roofSnow.position.y = 1.2 + h + 0.34;
  bldg.add(roofSnow);

  // Glowing urban window grid on all 4 facades
  const floors = variant % 3 === 1 ? 3 : 2;
  for (let f = 0; f < floors; f++) {
    const wy = 2.0 + f * 1.25;
    [-0.72, 0.72].forEach((wx) => {
      const wFront = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.08), winMat);
      wFront.position.set(wx, wy, 1.59);
      bldg.add(wFront);

      const wBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.08), winMat);
      wBack.position.set(wx, wy, -1.59);
      bldg.add(wBack);

      const wRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.62), winMat);
      wRight.position.set(1.59, wy, wx);
      bldg.add(wRight);

      const wLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.62), winMat);
      wLeft.position.set(-1.59, wy, wx);
      bldg.add(wLeft);
    });
  }

  // Warm storefront awning & glow
  const shopGlow = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 3.36), winMat);
  shopGlow.position.y = 0.56;
  bldg.add(shopGlow);

  return bldg;
}

export function createFarmBarn(textures: ProceduralTexturePack): THREE.Group {
  const barn = new THREE.Group();

  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 5.0),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  barn.add(sh);

  const redWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb63a31,
    map: textures.woodPlankMap,
    roughness: 0.8,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.7 });
  const siloMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.4 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.76 });
  const warmMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xffaa33,
    emissiveIntensity: 1.25,
  });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.2, 3.2), redWoodMat);
  hull.position.y = 1.1;
  hull.castShadow = true;
  barn.add(hull);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.85, 4), trimMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.22, 1, 1.05);
  roof.position.y = 3.05;
  roof.castShadow = true;
  barn.add(roof);

  const snowRoof = new THREE.Mesh(new THREE.ConeGeometry(2.55, 1.55, 4), snowMat);
  snowRoof.rotation.y = Math.PI / 4;
  snowRoof.scale.set(1.2, 1, 1.02);
  snowRoof.position.y = 3.25;
  barn.add(snowRoof);

  // Silo beside barn
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 3.6, 12), siloMat);
  silo.position.set(2.35, 1.8, -0.6);
  silo.castShadow = true;
  barn.add(silo);

  const siloDome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), snowMat);
  siloDome.position.set(2.35, 3.6, -0.6);
  barn.add(siloDome);

  const loftWin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), warmMat);
  loftWin.position.set(0, 1.75, 1.62);
  barn.add(loftWin);

  return barn;
}

export function createSnowBoulder(textures: ProceduralTexturePack): THREE.Group {
  const grp = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf6faff,
    bumpMap: textures.snowBumpMap,
    bumpScale: 0.03,
    roughness: 0.78,
  });

  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), rockMat);
  rock.scale.set(1.2, 0.85, 1.05);
  rock.position.y = 0.65;
  rock.castShadow = true;
  grp.add(rock);

  const snowCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), snowMat);
  snowCap.scale.set(1.1, 0.45, 0.95);
  snowCap.position.y = 1.2;
  grp.add(snowCap);

  return grp;
}

export function createClockTowerLandmark(textures: ProceduralTexturePack): THREE.Group {
  const tower = new THREE.Group();

  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 20),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  tower.add(sh);

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x737d8c, roughness: 0.88 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodPlankMap,
    roughness: 0.78,
  });
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x2f685c,
    roughness: 0.45,
    metalness: 0.25,
  });
  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: 0xffcb66,
    emissiveIntensity: 0.85,
    roughness: 0.3,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf7c948,
    roughness: 0.22,
    metalness: 0.88,
  });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.78 });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.0, 0.65, 8), stoneMat);
  plinth.position.y = 0.325;
  plinth.castShadow = true;
  tower.add(plinth);

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.0, 1.85), stoneMat);
  shaft.position.y = 2.15;
  shaft.castShadow = true;
  tower.add(shaft);

  const belfry = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.55, 2.05), timberMat);
  belfry.position.y = 4.35;
  belfry.castShadow = true;
  tower.add(belfry);

  const faceGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.1, 16);
  const bezelGeo = new THREE.TorusGeometry(0.55, 0.06, 8, 20);
  const handMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
  const faceConfigs: Array<{ pos: [number, number, number]; rotY: number }> = [
    { pos: [0, 4.4, 1.04], rotY: 0 },
    { pos: [0, 4.4, -1.04], rotY: Math.PI },
    { pos: [1.04, 4.4, 0], rotY: Math.PI / 2 },
    { pos: [-1.04, 4.4, 0], rotY: -Math.PI / 2 },
  ];
  faceConfigs.forEach(({ pos, rotY }) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.set(pos[0], pos[1], pos[2]);
    faceGroup.rotation.y = rotY;

    const dial = new THREE.Mesh(faceGeo, clockFaceMat);
    dial.rotation.x = Math.PI / 2;
    faceGroup.add(dial);

    const bezel = new THREE.Mesh(bezelGeo, goldMat);
    bezel.position.z = 0.04;
    faceGroup.add(bezel);

    const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.04), handMat);
    minuteHand.position.set(0, 0.12, 0.06);
    faceGroup.add(minuteHand);

    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), handMat);
    hourHand.position.set(0.09, 0, 0.06);
    faceGroup.add(hourHand);

    tower.add(faceGroup);
  });

  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.6, 4), spireMat);
  spire.rotation.y = Math.PI / 4;
  spire.position.y = 6.4;
  spire.castShadow = true;
  tower.add(spire);

  const spireSnow = new THREE.Mesh(new THREE.ConeGeometry(1.42, 1.65, 4), snowMat);
  spireSnow.rotation.y = Math.PI / 4;
  spireSnow.position.y = 6.95;
  tower.add(spireSnow);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), goldMat);
  finial.position.y = 7.95;
  tower.add(finial);

  return tower;
}

export function createPineTree(variant: number, textures: ProceduralTexturePack): THREE.Group {
  const tree = new THREE.Group();

  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, 14),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.38,
    }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.02;
  tree.add(sh);

  const greens = [0x2d5a43, 0x264e44, 0x34664a];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3e28, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: greens[variant % greens.length],
    roughness: 0.78,
  });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 0.72 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.9, 8), trunkMat);
  trunk.position.y = 0.45;
  trunk.castShadow = true;
  tree.add(trunk);

  const tiers = [
    { r: 1.05, h: 1.25, y: 1.28 },
    { r: 0.82, h: 1.15, y: 2.02 },
    { r: 0.56, h: 1.0, y: 2.7 },
  ];
  tiers.forEach((t, idx) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 8), foliageMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    tree.add(cone);

    if (idx >= 1) {
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(t.r * 0.76, t.h * 0.55, 8), snowMat);
      snowCap.position.y = t.y + t.h * 0.24;
      tree.add(snowCap);
    }
  });

  return tree;
}

export function createStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x2a323d,
    roughness: 0.45,
    metalness: 0.7,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfff1c2,
    emissive: 0xffb732,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.4, 8), ironMat);
  base.position.y = 0.2;
  lamp.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.35, 8), ironMat);
  post.position.y = 1.4;
  post.castShadow = true;
  lamp.add(post);

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.36, 6), glowMat);
  lantern.position.y = 2.72;
  lamp.add(lantern);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 6), ironMat);
  cap.position.y = 2.98;
  lamp.add(cap);

  return lamp;
}

export function createSnowmanProp(textures: ProceduralTexturePack): THREE.Group {
  const sm = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf7fbff,
    bumpMap: textures.snowBumpMap,
    bumpScale: 0.02,
    roughness: 0.75,
  });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xd94336, roughness: 0.85 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x232933, roughness: 0.65 });
  const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });

  const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), snowMat);
  b1.position.y = 0.38;
  b1.castShadow = true;
  sm.add(b1);

  const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), snowMat);
  b2.position.y = 0.92;
  b2.castShadow = true;
  sm.add(b2);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), snowMat);
  head.position.y = 1.32;
  head.castShadow = true;
  sm.add(head);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 14), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.14;
  sm.add(scarf);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), carrotMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.32, 0.26);
  sm.add(nose);

  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12), hatMat);
  hatBrim.position.y = 1.5;
  sm.add(hatBrim);

  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12), hatMat);
  hatTop.position.y = 1.62;
  sm.add(hatTop);

  return sm;
}
