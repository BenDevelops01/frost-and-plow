import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  DEFAULT_CUSTOM_CONFIG,
  INITIAL_UPGRADES,
  VEHICLE_DEFS,
  applyHotWaterJet,
  applyPlowClear,
  applySaltSpread,
  applyWeatherAccumulation,
  canAffordUpgrade,
  checkDistrictClear,
  countClearedCells,
  generateDistrictLayout,
  getDerivedSpecs,
  getUpgradeCost,
  getVehicleDef,
  getWeatherAtTime,
  stepCombo,
  stepTruckKinematics,
} from '../game/rules';
import type {
  ComboState,
  CustomDistrictConfig,
  DistrictLayout,
  GamePhase,
  GarageTab,
  HudSnapshot,
  RunSummary,
  TruckState,
  UpgradeKey,
  UpgradeLevels,
  VehicleId,
  WeatherType,
} from '../game/types';
import { SoundEngine } from '../audio/soundEngine';
import {
  createAlpineCabin,
  createCityBuilding,
  createClockTowerLandmark,
  createFarmBarn,
  createPineTree,
  createSnowBoulder,
  createSnowmanProp,
  createSnowplowVehicle,
  createStreetLamp,
  type SnowplowRig,
} from './models';
import { createProceduralTextures, type ProceduralTexturePack } from './textures';

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();
const _camTarget = new THREE.Vector3();
const _skyCalm = new THREE.Color(0xb8cde4);
const _skyBlizzard = new THREE.Color(0x7c93ad);
const _skyClear = new THREE.Color(0xcce0f5);
const _skyTarget = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  kind: 0 | 1 | 2 | 3 | 4; // 0=snow spray, 1=falling snow, 2=exhaust, 3=salt crystal, 4=hot water steam
}

export interface SnowplowWorldCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onPhaseChange: (phase: GamePhase) => void;
}

export class SnowplowWorld {
  private container: HTMLElement;
  private callbacks: SnowplowWorldCallbacks;
  private sound: SoundEngine;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTexturePack;
  private isSoftwareGl: boolean;

  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private sceneFog!: THREE.FogExp2;

  private districtGroup: THREE.Group;
  private truckRig: SnowplowRig;
  private snowInstancedMesh: THREE.InstancedMesh | null = null;
  private saltOverlayMesh: THREE.InstancedMesh | null = null;
  private snowCellIndices: number[] = [];
  private snowVisualDepth: Float32Array = new Float32Array(0);

  // Pooled particles (360 slots)
  private particleMesh: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private sprayCursor = 0;
  private saltCursor = 0;
  private steamCursor = 0;
  private exhaustTimer = 0;
  private saltBurstTimer = 0;
  private steamBurstTimer = 0;

  // Game state
  private phase: GamePhase = 'title';
  private districtIndex = 1;
  private layoutNonce = 0;
  private customConfig: CustomDistrictConfig = { ...DEFAULT_CUSTOM_CONFIG };
  private layout: DistrictLayout;
  private vehicleId: VehicleId = 'pickup';
  private unlockedVehicles: VehicleId[] = ['pickup'];
  private truck: TruckState;
  private upgrades: UpgradeLevels = { ...INITIAL_UPGRADES };
  private coins = 0;
  private score = 0;
  private clearedCounter = { value: 0 };
  private combo: ComboState = {
    count: 0,
    multiplier: 1,
    timer: 0,
    maxTimer: 2.7,
    maxComboReached: 0,
  };
  private elapsedSeconds = 0;
  private weatherTime = 0;
  private currentWeather: WeatherType = 'calm';
  private weatherLabel = 'Crisp Dawn';
  private garageOpen = false;
  private garageTab: GarageTab = 'upgrades';
  private runSummary: RunSummary | null = null;

  // Camera & Juice
  private trauma = 0;
  private truckSquash = 0;
  private wasBoosting = false;
  private camFocus = new THREE.Vector3(0, 1, 6);
  private titleOrbitAngle = 0;

  // Input
  private heldKeys = new Set<string>();
  private lastTime = performance.now();
  private hudSyncAccum = 0;
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    callbacks: SnowplowWorldCallbacks,
    startImmediately: boolean,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.sound = new SoundEngine();

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = _skyCalm.clone();
    this.sceneFog = new THREE.FogExp2(0xb8cde4, 0.0078);
    this.scene.fog = this.sceneFog;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(33, width / height, 0.5, 240);
    this.camera.position.set(22, 23, 26);
    this.camera.lookAt(this.camFocus);

    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());
    this.setupLightingAndTerrain();

    this.districtGroup = new THREE.Group();
    this.scene.add(this.districtGroup);

    this.truckRig = createSnowplowVehicle(this.vehicleId, this.textures);
    this.scene.add(this.truckRig.group);

    // Zero-GC Pooled Particle System (360 instances)
    const particleGeo = new THREE.IcosahedronGeometry(0.24, 1);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.02,
    });
    this.particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, 360);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    this.initParticlePool();

    this.layout = generateDistrictLayout(1, this.customConfig, this.layoutNonce);
    this.truck = this.makeInitialTruck();
    this.buildDistrictScene();
    this.syncTruckTransform(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerdown', this.handleFirstPointerGesture);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    if (startImmediately) {
      this.startShift(false);
    } else {
      this.setPhase('title');
      this.emitHud();
    }

    this.lastTime = performance.now();
    this.tick();
  }

  private makeInitialTruck(): TruckState {
    return {
      x: this.layout.spawnX,
      z: this.layout.spawnZ,
      angle: this.layout.spawnAngle,
      speed: 0,
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

  private setupLightingAndTerrain(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdcedff, 0x5c728f, 0.92);
    this.hemiLight.position.set(0, 40, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe1b5, 2.05);
    this.keyLight.position.set(24, 34, 18);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 5;
    this.keyLight.shadow.camera.far = 110;
    const d = 34;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x9ac4f8, 0.55);
    rimLight.position.set(-20, 14, -22);
    this.scene.add(rimLight);

    const plazaGlow = new THREE.PointLight(0xffb84d, 5, 22, 1.8);
    plazaGlow.position.set(0, 4.5, 0);
    this.scene.add(plazaGlow);

    // Wide surrounding alpine terrain
    const valleyFloorMat = new THREE.MeshStandardMaterial({
      color: 0xe6eff9,
      bumpMap: this.textures.snowBumpMap,
      bumpScale: 0.035,
      roughness: 0.86,
      metalness: 0.02,
    });
    const valleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(210, 210), valleyFloorMat);
    valleyFloor.rotation.x = -Math.PI / 2;
    valleyFloor.position.y = -0.03;
    valleyFloor.receiveShadow = true;
    this.scene.add(valleyFloor);

    // Natural perimeter snow hills & pine ring
    const hillMat = new THREE.MeshStandardMaterial({ color: 0xdfecf9, roughness: 0.88 });
    const hillPositions: Array<[number, number, number, number]> = [
      [-42, -38, 14, 5.2],
      [42, -40, 16, 6.0],
      [-44, 38, 15, 5.4],
      [43, 40, 16, 5.8],
      [0, -48, 20, 6.8],
      [-50, 0, 17, 5.4],
      [50, 0, 18, 5.8],
      [0, 50, 18, 5.2],
    ];
    hillPositions.forEach(([hx, hz, rad, height]) => {
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(rad, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        hillMat,
      );
      mound.scale.set(1.2, height / rad, 1.1);
      mound.position.set(hx, -0.2, hz);
      mound.receiveShadow = true;
      this.scene.add(mound);
    });

    const outerConeGeo = new THREE.ConeGeometry(1.2, 3.4, 7);
    outerConeGeo.translate(0, 1.7, 0);
    const outerPineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
    const outerForest = new THREE.InstancedMesh(outerConeGeo, outerPineMat, 48);
    for (let i = 0; i < 48; i++) {
      const ang = (i / 48) * Math.PI * 2;
      const dist = 36 + (i % 4) * 4.2;
      const px = Math.cos(ang) * dist;
      const pz = Math.sin(ang) * dist;
      const sc = 0.85 + ((i * 7) % 10) * 0.045;
      _pos.set(px, -0.02, pz);
      _euler.set(0, ang, 0);
      _quat.setFromEuler(_euler);
      _scale.set(sc, sc * 1.15, sc);
      _mat4.compose(_pos, _quat, _scale);
      outerForest.setMatrixAt(i, _mat4);
      _color.setHex(i % 2 === 0 ? 0x2b5742 : 0x32624c);
      outerForest.setColorAt(i, _color);
    }
    outerForest.instanceMatrix.needsUpdate = true;
    if (outerForest.instanceColor) outerForest.instanceColor.needsUpdate = true;
    outerForest.computeBoundingSphere();
    this.scene.add(outerForest);
  }

  private buildDistrictScene(): void {
    while (this.districtGroup.children.length > 0) {
      const child = this.districtGroup.children[0];
      this.districtGroup.remove(child);
    }

    const deckSpan = this.layout.gridSize * this.layout.tileSize - 2.2;

    // Ground road/field deck tailored to biome
    const roadMat = new THREE.MeshStandardMaterial({
      color: this.layout.biome === 'fields' ? 0x6b5c4d : 0xffffff,
      map: this.layout.biome === 'fields' ? this.textures.woodPlankMap : this.textures.roadCobbleMap,
      roughness: this.layout.biome === 'fields' ? 0.92 : 0.68,
      metalness: 0.06,
    });
    const roadBase = new THREE.Mesh(new THREE.PlaneGeometry(deckSpan, deckSpan), roadMat);
    roadBase.rotation.x = -Math.PI / 2;
    roadBase.position.y = 0.0;
    roadBase.receiveShadow = true;
    this.districtGroup.add(roadBase);

    if (this.layout.biome !== 'fields') {
      const plazaMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.textures.plazaStoneMap,
        roughness: 0.65,
        metalness: 0.06,
      });
      const plazaSize = this.layout.biome === 'city' ? 12.2 : 15.2;
      const plazaDeck = new THREE.Mesh(new THREE.PlaneGeometry(plazaSize, plazaSize), plazaMat);
      plazaDeck.rotation.x = -Math.PI / 2;
      plazaDeck.position.y = 0.015;
      plazaDeck.receiveShadow = true;
      this.districtGroup.add(plazaDeck);
    }

    // Build obstacle props
    for (const obs of this.layout.obstacles) {
      let mesh: THREE.Object3D;
      if (obs.kind === 'clocktower') {
        mesh = createClockTowerLandmark(this.textures);
      } else if (obs.kind === 'building') {
        mesh = createCityBuilding(obs.variant, this.textures);
      } else if (obs.kind === 'barn') {
        mesh = createFarmBarn(this.textures);
      } else if (obs.kind === 'boulder') {
        mesh = createSnowBoulder(this.textures);
      } else if (obs.kind === 'cabin') {
        mesh = createAlpineCabin(obs.variant, this.textures);
      } else if (obs.kind === 'pine') {
        mesh = createPineTree(obs.variant, this.textures);
      } else if (obs.kind === 'lamp') {
        mesh = createStreetLamp();
      } else {
        mesh = createSnowmanProp(this.textures);
      }
      mesh.position.set(obs.x, 0, obs.z);
      mesh.rotation.y = obs.rotation;
      mesh.scale.setScalar(obs.scale);
      this.districtGroup.add(mesh);
    }

    // Snow pillow geometry
    const lawnShape = new THREE.Shape();
    const r = 0.65;
    lawnShape.moveTo(-r, -r);
    lawnShape.lineTo(r, -r);
    lawnShape.lineTo(r, r);
    lawnShape.lineTo(-r, r);
    lawnShape.closePath();

    const pillowGeo = new THREE.ExtrudeGeometry(lawnShape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 2,
    });
    pillowGeo.rotateX(-Math.PI / 2);
    pillowGeo.computeBoundingBox();
    if (pillowGeo.boundingBox) {
      pillowGeo.translate(0, -pillowGeo.boundingBox.min.y, 0);
    }

    this.snowCellIndices = [];
    const curbIndices: number[] = [];
    this.layout.cells.forEach((cell, idx) => {
      if (cell.isPlayable) {
        this.snowCellIndices.push(idx);
      } else {
        curbIndices.push(idx);
      }
    });

    // Cool frost curb blanket on non-road blocks
    const curbMat = new THREE.MeshStandardMaterial({
      color: this.layout.biome === 'city' ? 0xbdcee0 : 0xc8daee,
      bumpMap: this.textures.snowBumpMap,
      bumpScale: 0.025,
      roughness: 0.9,
    });
    if (curbIndices.length > 0) {
      const curbInst = new THREE.InstancedMesh(pillowGeo, curbMat, curbIndices.length);
      curbInst.receiveShadow = true;
      curbIndices.forEach((cellIdx, i) => {
        const c = this.layout.cells[cellIdx];
        _pos.set(c.worldX, -0.02, c.worldZ);
        _quat.identity();
        _scale.set(1.04, 0.07, 1.04);
        _mat4.compose(_pos, _quat, _scale);
        curbInst.setMatrixAt(i, _mat4);
      });
      curbInst.instanceMatrix.needsUpdate = true;
      curbInst.computeBoundingSphere();
      this.districtGroup.add(curbInst);
    }

    // Playable snow InstancedMesh
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: this.textures.snowBumpMap,
      bumpScale: 0.03,
      roughness: 0.78,
      metalness: 0.02,
    });
    const inst = new THREE.InstancedMesh(pillowGeo, snowMat, this.snowCellIndices.length);
    inst.receiveShadow = true;
    inst.castShadow = !this.isSoftwareGl;

    // Salted brine shimmer overlay InstancedMesh (shows salted protected road tiles!)
    const saltGeo = new THREE.PlaneGeometry(1.4, 1.4);
    saltGeo.rotateX(-Math.PI / 2);
    const saltMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const saltInst = new THREE.InstancedMesh(saltGeo, saltMat, this.snowCellIndices.length);

    this.snowVisualDepth = new Float32Array(this.snowCellIndices.length);
    this.snowCellIndices.forEach((cellIdx, i) => {
      const cell = this.layout.cells[cellIdx];
      this.snowVisualDepth[i] = cell.depth;
      this.updateSnowInstance(inst, i, cell.worldX, cell.worldZ, cell.depth);
      this.updateSaltOverlayInstance(saltInst, i, cell.worldX, cell.worldZ, cell.saltTimer);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();

    saltInst.instanceMatrix.needsUpdate = true;
    saltInst.computeBoundingSphere();

    this.districtGroup.add(inst);
    this.districtGroup.add(saltInst);
    this.snowInstancedMesh = inst;
    this.saltOverlayMesh = saltInst;

    this.clearedCounter.value = countClearedCells(this.layout);
  }

  private updateSnowInstance(
    inst: THREE.InstancedMesh,
    instanceIdx: number,
    wx: number,
    wz: number,
    visualDepth: number,
  ): void {
    if (visualDepth <= 0.01) {
      _pos.set(wx, -10, wz);
      _quat.identity();
      _scale.set(0.001, 0.001, 0.001);
      _mat4.compose(_pos, _quat, _scale);
      inst.setMatrixAt(instanceIdx, _mat4);
      return;
    }

    const heightScale = 0.2 + visualDepth * 0.23;
    const xzScale = 0.96 + Math.min(0.12, visualDepth * 0.025);
    _pos.set(wx, 0.02, wz);
    _quat.identity();
    _scale.set(xzScale, heightScale, xzScale);
    _mat4.compose(_pos, _quat, _scale);
    inst.setMatrixAt(instanceIdx, _mat4);

    if (visualDepth > 2.8) {
      _color.setHex(0xc8dcf5); // Heavy deep blizzard drift
    } else if (visualDepth > 1.8) {
      _color.setHex(0xdcebff); // Deep packed snow
    } else if (visualDepth > 1.1) {
      _color.setHex(0xf0f6ff); // Packed
    } else {
      _color.setHex(0xffffff); // Fresh powder
    }
    inst.setColorAt(instanceIdx, _color);
  }

  private updateSaltOverlayInstance(
    inst: THREE.InstancedMesh,
    instanceIdx: number,
    wx: number,
    wz: number,
    saltTimer: number,
  ): void {
    if (saltTimer <= 0.05) {
      _pos.set(wx, -12, wz);
      _quat.identity();
      _scale.set(0.001, 0.001, 0.001);
      _mat4.compose(_pos, _quat, _scale);
      inst.setMatrixAt(instanceIdx, _mat4);
      return;
    }
    const s = Math.min(1, saltTimer / 3) * 0.92;
    _pos.set(wx, 0.032, wz);
    _quat.identity();
    _scale.set(s, 1, s);
    _mat4.compose(_pos, _quat, _scale);
    inst.setMatrixAt(instanceIdx, _mat4);
  }

  private initParticlePool(): void {
    this.particles = [];
    // 0..119: snow spray, 120..259: falling snow, 260..284: exhaust, 285..324: salt crystals, 325..359: hot water steam
    for (let i = 0; i < 360; i++) {
      if (i < 120) {
        this.particles.push({ active: false, x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.6, size: 0.6, kind: 0 });
      } else if (i < 260) {
        this.particles.push({
          active: true,
          x: (Math.random() - 0.5) * 56,
          y: Math.random() * 19,
          z: (Math.random() - 0.5) * 56,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(1.4 + Math.random() * 1.2),
          vz: (Math.random() - 0.5) * 0.8,
          life: Math.random() * 10,
          maxLife: 10,
          size: 0.22 + Math.random() * 0.18,
          kind: 1,
        });
      } else if (i < 285) {
        this.particles.push({ active: false, x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.7, size: 0.45, kind: 2 });
      } else if (i < 325) {
        this.particles.push({ active: false, x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.55, size: 0.36, kind: 3 });
      } else {
        this.particles.push({ active: false, x: 0, y: -20, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.55, size: 0.9, kind: 4 });
      }
    }
  }

  private spawnSnowSpray(wx: number, wz: number, truckAngle: number, count: number): void {
    const sinA = Math.sin(truckAngle);
    const cosA = Math.cos(truckAngle);
    const rightX = cosA;
    const rightZ = -sinA;

    for (let n = 0; n < count; n++) {
      const slot = this.particles[this.sprayCursor];
      this.sprayCursor = (this.sprayCursor + 1) % 120;

      const side = n % 2 === 0 ? 1 : -1;
      const spread = 2.4 + Math.random() * 2.8;
      slot.active = true;
      slot.x = wx + rightX * side * (0.5 + Math.random() * 0.65);
      slot.y = 0.25 + Math.random() * 0.2;
      slot.z = wz + rightZ * side * (0.5 + Math.random() * 0.65);
      slot.vx = sinA * (2.5 + Math.random() * 2.8) + rightX * side * spread;
      slot.vy = 3.2 + Math.random() * 2.8;
      slot.vz = cosA * (2.5 + Math.random() * 2.8) + rightZ * side * spread;
      slot.life = 0;
      slot.maxLife = 0.48 + Math.random() * 0.28;
      slot.size = 0.78 + Math.random() * 0.55;
    }
  }

  private spawnSaltSpray(): void {
    const sinA = Math.sin(this.truck.angle);
    const cosA = Math.cos(this.truck.angle);
    const originX = this.truck.x - sinA * 1.85;
    const originZ = this.truck.z - cosA * 1.85;

    for (let n = 0; n < 3; n++) {
      const idx = 285 + (this.saltCursor % 40);
      this.saltCursor = (this.saltCursor + 1) % 40;
      const slot = this.particles[idx];
      const ang = this.truck.angle + Math.PI + (Math.random() - 0.5) * 2.4;
      const spd = 2.5 + Math.random() * 2.6;
      slot.active = true;
      slot.x = originX;
      slot.y = 0.45;
      slot.z = originZ;
      slot.vx = Math.sin(ang) * spd;
      slot.vy = 1.6 + Math.random() * 1.2;
      slot.vz = Math.cos(ang) * spd;
      slot.life = 0;
      slot.maxLife = 0.48 + Math.random() * 0.2;
      slot.size = 0.34 + Math.random() * 0.16;
    }
  }

  private spawnHotWaterSteam(): void {
    const sinA = Math.sin(this.truck.angle);
    const cosA = Math.cos(this.truck.angle);
    const originX = this.truck.x + sinA * 2.05;
    const originZ = this.truck.z + cosA * 2.05;

    for (let n = 0; n < 3; n++) {
      const idx = 325 + (this.steamCursor % 35);
      this.steamCursor = (this.steamCursor + 1) % 35;
      const slot = this.particles[idx];
      const spread = (Math.random() - 0.5) * 1.1;
      const spd = 6.0 + Math.random() * 3.5;
      slot.active = true;
      slot.x = originX + cosA * spread * 0.6;
      slot.y = 0.38 + Math.random() * 0.2;
      slot.z = originZ - sinA * spread * 0.6;
      slot.vx = (sinA + cosA * spread * 0.35) * spd;
      slot.vy = 1.4 + Math.random() * 1.8;
      slot.vz = (cosA - sinA * spread * 0.35) * spd;
      slot.life = 0;
      slot.maxLife = 0.48 + Math.random() * 0.24;
      slot.size = 1.15 + Math.random() * 0.6;
    }
  }

  private spawnExhaustPuff(): void {
    for (let i = 260; i < 285; i++) {
      const slot = this.particles[i];
      if (!slot.active) {
        const sinA = Math.sin(this.truck.angle);
        const cosA = Math.cos(this.truck.angle);
        slot.active = true;
        slot.x = this.truck.x + cosA * 0.76 - sinA * 0.44;
        slot.y = this.vehicleId === 'bigRig' ? 2.45 : 1.95;
        slot.z = this.truck.z - sinA * 0.76 - cosA * 0.44;
        slot.vx = (Math.random() - 0.5) * 0.4;
        slot.vy = 1.2 + (this.truck.isBoosting ? 0.9 : 0);
        slot.vz = (Math.random() - 0.5) * 0.4;
        slot.life = 0;
        slot.maxLife = 0.65;
        slot.size = this.truck.isBoosting ? 0.65 : 0.42;
        break;
      }
    }
  }

  private updateParticles(dt: number, windStrength: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.kind === 1) {
        // Falling snow modulated by weather wind
        const windX = windStrength * 2.2;
        const windZ = windStrength * 0.85;
        p.x += (p.vx + windX + Math.sin(p.life * 1.4 + i) * 0.35) * dt;
        p.y += p.vy * (1 + windStrength * 0.25) * dt;
        p.z += (p.vz + windZ + Math.cos(p.life * 1.1 + i) * 0.35) * dt;
        p.life += dt;
        if (p.y < 0.05) {
          p.y = 17 + Math.random() * 4;
          p.x = this.truck.x + (Math.random() - 0.5) * 52 - windX * 2.5;
          p.z = this.truck.z + (Math.random() - 0.5) * 52 - windZ * 2.5;
        }
        _pos.set(p.x, p.y, p.z);
        _quat.identity();
        _scale.setScalar(p.size * (1 + windStrength * 0.15));
        _mat4.compose(_pos, _quat, _scale);
        this.particleMesh.setMatrixAt(i, _mat4);
        _color.setHex(0xffffff);
        this.particleMesh.setColorAt(i, _color);
        continue;
      }

      if (!p.active) {
        _pos.set(0, -30, 0);
        _quat.identity();
        _scale.setScalar(0.001);
        _mat4.compose(_pos, _quat, _scale);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      if (p.kind === 0 || p.kind === 3) {
        p.vy -= 11.5 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.08) {
          p.y = 0.08;
          p.vy *= -0.22;
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }

      const progress = p.life / p.maxLife;
      const sc =
        p.kind === 4
          ? p.size * (0.7 + progress * 1.25) * (1 - progress * 0.5)
          : p.size * (p.kind === 0 || p.kind === 3 ? 1 - progress * 0.85 : 0.6 + progress * 0.8);

      _pos.set(p.x, p.y, p.z);
      _quat.identity();
      _scale.setScalar(Math.max(0.01, sc));
      _mat4.compose(_pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);

      if (p.kind === 3) {
        _color.setHex(0xfbbf24); // Bright amber-gold salt granules
      } else if (p.kind === 4) {
        _color.setHex(0x38bdf8); // Crisp sky-aqua hot steam vapor
      } else if (p.kind === 0) {
        _color.setHex(0xf8fcff);
      } else {
        _color.setHex(0xdbe3ec);
      }
      this.particleMesh.setColorAt(i, _color);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  // --- Public Controls ---

  public startShift(fromUserGesture = true): void {
    if (fromUserGesture) {
      this.sound.unlock();
    }
    this.heldKeys.clear();
    this.garageOpen = false;
    this.runSummary = null;
    this.setPhase('playing');
    this.sound.setActive(true);
    this.emitHud();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.heldKeys.clear();
      this.setPhase('paused');
      this.sound.setActive(false);
      this.emitHud();
    } else if (this.phase === 'paused') {
      this.sound.unlock();
      this.heldKeys.clear();
      this.setPhase('playing');
      this.sound.setActive(true);
      this.emitHud();
    }
  }

  public restartDistrict(): void {
    this.sound.unlock();
    this.layoutNonce += 1;
    this.loadDistrict(this.districtIndex);
    this.setPhase('playing');
    this.sound.setActive(true);
    this.emitHud();
  }

  public nextDistrict(): void {
    this.sound.unlock();
    this.loadDistrict(this.districtIndex + 1);
    this.setPhase('playing');
    this.sound.setActive(true);
    this.emitHud();
  }

  public generateNewDistrictFromConfig(config: CustomDistrictConfig): void {
    this.sound.unlock();
    this.customConfig = { ...config };
    this.layoutNonce += 1;
    this.loadDistrict(this.districtIndex);
    this.emitHud();
  }

  public returnToTitle(): void {
    this.heldKeys.clear();
    this.garageOpen = false;
    this.layoutNonce = 0;
    this.vehicleId = 'pickup';
    this.unlockedVehicles = ['pickup'];
    this.upgrades = { ...INITIAL_UPGRADES };
    this.coins = 0;
    this.score = 0;
    this.rebuildVehicleMesh();
    this.loadDistrict(1);
    this.setPhase('title');
    this.sound.setActive(false);
    this.emitHud();
  }

  public toggleMute(): void {
    this.sound.unlock();
    this.sound.setMuted(!this.sound.isMuted());
    this.emitHud();
  }

  public toggleSaltSpreader(): void {
    if (this.phase !== 'playing') return;
    this.sound.unlock();
    if (!this.truck.saltActive && this.truck.saltTank > 0.05) {
      this.truck.saltActive = true;
    } else {
      this.truck.saltActive = false;
    }
    this.emitHud();
  }

  public toggleGarage(force?: boolean): void {
    if (this.phase !== 'playing') return;
    this.garageOpen = force !== undefined ? force : !this.garageOpen;
    this.emitHud();
  }

  public setGarageTab(tab: GarageTab): void {
    this.garageTab = tab;
    this.emitHud();
  }

  public buyUpgrade(key: UpgradeKey): boolean {
    if (this.phase !== 'playing') return false;
    if (!canAffordUpgrade(this.coins, this.upgrades, key)) return false;

    const cost = getUpgradeCost(key, this.upgrades[key]);
    this.coins -= cost;
    this.upgrades = {
      ...this.upgrades,
      [key]: this.upgrades[key] + 1,
    };

    const specs = getDerivedSpecs(this.upgrades, this.vehicleId);
    this.truckRig.setBladeScale(specs.bladeVisualScale);
    this.truckRig.setHeatLevel(this.upgrades.hotWaterSystem);
    this.truckSquash = 0.22;
    this.sound.unlock();
    this.sound.playUpgrade();
    this.emitHud();
    return true;
  }

  public selectOrBuyVehicle(id: VehicleId): boolean {
    const def = getVehicleDef(id);
    if (!this.unlockedVehicles.includes(id)) {
      if (this.coins < def.cost) return false;
      this.coins -= def.cost;
      this.unlockedVehicles = [...this.unlockedVehicles, id];
    }
    this.vehicleId = id;
    this.rebuildVehicleMesh();
    this.truckSquash = 0.25;
    this.sound.unlock();
    this.sound.playUpgrade();
    this.emitHud();
    return true;
  }

  private rebuildVehicleMesh(): void {
    this.scene.remove(this.truckRig.group);
    this.truckRig = createSnowplowVehicle(this.vehicleId, this.textures);
    const specs = getDerivedSpecs(this.upgrades, this.vehicleId);
    this.truckRig.setBladeScale(specs.bladeVisualScale);
    this.truckRig.setHeatLevel(this.upgrades.hotWaterSystem);
    this.scene.add(this.truckRig.group);
    this.syncTruckTransform(0);
  }

  private loadDistrict(index: number): void {
    this.districtIndex = index;
    this.layout = generateDistrictLayout(index, this.customConfig, this.layoutNonce);
    this.truck = this.makeInitialTruck();
    this.combo = {
      count: 0,
      multiplier: 1,
      timer: 0,
      maxTimer: getDerivedSpecs(this.upgrades, this.vehicleId).comboHoldDuration,
      maxComboReached: 0,
    };
    this.elapsedSeconds = 0;
    this.runSummary = null;
    this.garageOpen = false;
    this.heldKeys.clear();
    this.buildDistrictScene();
    this.syncTruckTransform(0);
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    document.body.dataset.state = phase;
    this.callbacks.onPhaseChange(phase);
  }

  private syncTruckTransform(dt: number): void {
    this.truckRig.group.position.set(this.truck.x, 0, this.truck.z);
    this.truckRig.group.rotation.y = this.truck.angle;

    this.truckSquash = THREE.MathUtils.damp(this.truckSquash, 0, 10, Math.max(dt, 0.016));
    const bounce = Math.sin(this.truck.wheelRoll * 1.8) * Math.min(0.03, Math.abs(this.truck.speed) * 0.003);
    const sx = 1 + this.truckSquash * 0.14;
    const sy = 1 - this.truckSquash * 0.12 + bounce;
    this.truckRig.bodyPivot.scale.set(sx, sy, sx);

    const targetPitch = -this.truck.speed * 0.006;
    this.truckRig.bodyPivot.rotation.x = THREE.MathUtils.damp(
      this.truckRig.bodyPivot.rotation.x,
      targetPitch,
      8,
      Math.max(dt, 0.016),
    );

    this.truckRig.frontSteerLeft.rotation.y = this.truck.steerAngle;
    this.truckRig.frontSteerRight.rotation.y = this.truck.steerAngle;
    for (const w of this.truckRig.spinWheels) {
      w.rotation.x = this.truck.wheelRoll;
    }

    if (this.truck.saltActive) {
      this.truckRig.saltSpinner.rotation.y += dt * 16;
    }
    this.truckRig.setHotWaterActive(this.truck.hotWaterActive);
  }

  // --- Main Loop ---

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.truckRig.beaconMat.emissiveIntensity = 1.1 + Math.sin(now * 0.01) * 0.65;

    // Weather atmosphere progression
    this.weatherTime += dt;
    const wInfo = getWeatherAtTime(this.weatherTime);
    this.currentWeather = wInfo.weather;
    this.weatherLabel = wInfo.label;

    if (wInfo.weather === 'blizzard') {
      _skyTarget.copy(_skyBlizzard);
    } else if (wInfo.weather === 'clear') {
      _skyTarget.copy(_skyClear);
    } else {
      _skyTarget.copy(_skyCalm);
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(_skyTarget, Math.min(1, dt * 0.8));
      this.sceneFog.color.copy(this.scene.background);
    }
    const targetDensity = wInfo.weather === 'blizzard' ? 0.0145 : wInfo.weather === 'flurry' ? 0.0102 : 0.0072;
    this.sceneFog.density = THREE.MathUtils.damp(this.sceneFog.density, targetDensity, 1.5, dt);
    this.keyLight.intensity = THREE.MathUtils.damp(
      this.keyLight.intensity,
      wInfo.weather === 'blizzard' ? 1.35 : wInfo.weather === 'clear' ? 2.25 : 2.0,
      1.5,
      dt,
    );

    if (this.phase === 'title') {
      this.titleOrbitAngle += dt * 0.16;
      const panX = Math.sin(this.titleOrbitAngle) * 6.5;
      const panZ = 6 + Math.cos(this.titleOrbitAngle * 0.7) * 4.0;
      this.camFocus.set(panX, 1.5, panZ);
      this.camera.position.set(panX + 22, 21, panZ + 23);
      this.camera.lookAt(this.camFocus);
      this.updateParticles(dt, wInfo.windStrength);
    } else if (this.phase === 'playing') {
      this.stepSimulation(dt, wInfo.weather, wInfo.blizzardIntensity, wInfo.windStrength);
      this.updateParticles(dt, wInfo.windStrength);
      this.updateGameplayCamera(dt);
    } else {
      this.sound.updateEngine(0, false);
      this.sound.updateWeatherAndSystems(0, false, false);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(
    dt: number,
    weather: WeatherType,
    blizzardIntensity: number,
    windStrength: number,
  ): void {
    this.elapsedSeconds += dt;
    const specs = getDerivedSpecs(this.upgrades, this.vehicleId);

    const inputs = {
      forward: this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp'),
      backward: this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown'),
      left: this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft'),
      right: this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight'),
      boost: this.heldKeys.has('Space') || this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight'),
      hotWater: this.heldKeys.has('KeyF'),
    };

    const prevSpeed = this.truck.speed;
    stepTruckKinematics(this.truck, inputs, specs, this.layout, dt);

    if (Math.abs(prevSpeed) > 4.5 && Math.abs(this.truck.speed) < Math.abs(prevSpeed) * 0.87) {
      this.sound.playBump();
      this.trauma = Math.min(1, this.trauma + 0.25);
      this.truckSquash = 0.16;
    }

    if (this.truck.isBoosting && !this.wasBoosting) {
      this.sound.playBoostStart();
    }
    this.wasBoosting = this.truck.isBoosting;

    const pitchMult = this.vehicleId === 'bigRig' ? 0.78 : this.vehicleId === 'trackedSki' ? 1.12 : 1.0;
    this.sound.updateEngine(Math.abs(this.truck.speed) / specs.maxSpeed, this.truck.isBoosting, pitchMult);
    this.sound.updateWeatherAndSystems(windStrength, this.truck.hotWaterActive, this.truck.saltActive);

    this.exhaustTimer += dt * (this.truck.isBoosting ? 2.4 : 1);
    if (this.exhaustTimer > (Math.abs(this.truck.speed) > 1 ? 0.12 : 0.35)) {
      this.exhaustTimer = 0;
      this.spawnExhaustPuff();
    }

    if (this.truck.saltActive) {
      this.saltBurstTimer += dt;
      if (this.saltBurstTimer > 0.08) {
        this.saltBurstTimer = 0;
        this.spawnSaltSpray();
      }
    }

    if (this.truck.hotWaterActive) {
      this.steamBurstTimer += dt;
      if (this.steamBurstTimer > 0.055) {
        this.steamBurstTimer = 0;
        this.spawnHotWaterSteam();
      }
    }

    // Apply Plow Blade, Salt Spreader, Hot Water Jet, and Blizzard Weather Accumulation
    const plowHit = applyPlowClear(
      this.layout,
      this.truck,
      specs,
      dt,
      this.combo.multiplier,
      this.clearedCounter,
    );
    const saltHit = applySaltSpread(this.layout, this.truck, specs, dt, this.combo.multiplier);
    const steamHit = applyHotWaterJet(this.layout, this.truck, specs, dt, this.combo.multiplier);

    const netWeatherDelta = applyWeatherAccumulation(this.layout, weather, blizzardIntensity, dt);

    const totalNewCleared =
      plowHit.clearedIndices.length + saltHit.clearedIndices.length + steamHit.clearedIndices.length;

    // Keep cleared count exact if salt/steam/weather changed counts
    if (saltHit.clearedIndices.length > 0 || steamHit.clearedIndices.length > 0 || netWeatherDelta !== 0) {
      this.clearedCounter.value = countClearedCells(this.layout);
    }

    const prevMult = this.combo.multiplier;
    this.combo = stepCombo(this.combo, dt, totalNewCleared, specs.comboHoldDuration);

    if (totalNewCleared > 0) {
      this.coins += plowHit.totalCoins + saltHit.totalCoins + steamHit.totalCoins;
      this.score += plowHit.totalScore + saltHit.totalScore + steamHit.totalScore;
      this.trauma = Math.min(0.65, this.trauma + Math.min(0.22, totalNewCleared * 0.04));

      if (plowHit.clearedIndices.length > 0) {
        const firstCell = this.layout.cells[plowHit.clearedIndices[0]];
        this.sound.playSnowClear(this.combo.multiplier, this.combo.count, (firstCell?.maxDepth ?? 1) >= 2.2);

        const sinA = Math.sin(this.truck.angle);
        const cosA = Math.cos(this.truck.angle);
        this.spawnSnowSpray(
          this.truck.x + sinA * specs.bladeForwardReach,
          this.truck.z + cosA * specs.bladeForwardReach,
          this.truck.angle,
          Math.min(18, plowHit.clearedIndices.length * 4),
        );
      } else if (steamHit.clearedIndices.length > 0 || saltHit.clearedIndices.length > 0) {
        this.sound.playSnowClear(this.combo.multiplier, this.combo.count, false);
      }
    }

    // Update instanced snow & salt visuals smoothly
    if (this.snowInstancedMesh) {
      let snowDirty = false;
      let saltDirty = false;
      for (let i = 0; i < this.snowCellIndices.length; i++) {
        const cell = this.layout.cells[this.snowCellIndices[i]];
        const cur = this.snowVisualDepth[i];
        if (Math.abs(cur - cell.depth) > 0.006) {
          const next = THREE.MathUtils.damp(cur, cell.depth, 16, dt);
          this.snowVisualDepth[i] = next < 0.02 && cell.depth === 0 ? 0 : next;
          this.updateSnowInstance(
            this.snowInstancedMesh,
            i,
            cell.worldX,
            cell.worldZ,
            this.snowVisualDepth[i],
          );
          snowDirty = true;
        }
        if (this.saltOverlayMesh && (cell.saltTimer > 0 || (this.truck.saltActive && Math.hypot(cell.worldX - this.truck.x, cell.worldZ - this.truck.z) < 6))) {
          this.updateSaltOverlayInstance(
            this.saltOverlayMesh,
            i,
            cell.worldX,
            cell.worldZ,
            cell.saltTimer,
          );
          saltDirty = true;
        }
      }
      if (snowDirty) {
        this.snowInstancedMesh.instanceMatrix.needsUpdate = true;
        if (this.snowInstancedMesh.instanceColor) {
          this.snowInstancedMesh.instanceColor.needsUpdate = true;
        }
      }
      if (saltDirty && this.saltOverlayMesh) {
        this.saltOverlayMesh.instanceMatrix.needsUpdate = true;
      }
    }

    this.syncTruckTransform(dt);

    if (checkDistrictClear(this.clearedCounter.value, this.layout)) {
      this.sound.playVictory();
      this.sound.setActive(false);
      this.heldKeys.clear();
      const clearedPct = Math.min(
        100,
        Math.round((this.clearedCounter.value / this.layout.playableCount) * 100),
      );
      this.runSummary = {
        districtIndex: this.districtIndex,
        districtName: this.layout.name,
        biome: this.layout.biome,
        clearedPercent: clearedPct,
        clearedCells: this.clearedCounter.value,
        totalCells: this.layout.playableCount,
        coinsEarned: this.coins,
        maxCombo: this.combo.maxComboReached,
        elapsedSeconds: Math.round(this.elapsedSeconds),
        score: this.score,
      };
      this.setPhase('gameover');
      this.emitHud();
      return;
    }

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.1 || this.combo.multiplier !== prevMult) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private updateGameplayCamera(dt: number): void {
    const sinA = Math.sin(this.truck.angle);
    const cosA = Math.cos(this.truck.angle);
    const lookAhead = Math.min(3.0, Math.abs(this.truck.speed) * 0.24);
    const desiredX = this.truck.x + sinA * lookAhead;
    const desiredZ = this.truck.z + cosA * lookAhead;

    this.camFocus.x = THREE.MathUtils.damp(this.camFocus.x, desiredX, 6.5, dt);
    this.camFocus.y = THREE.MathUtils.damp(this.camFocus.y, 0.85, 6.5, dt);
    this.camFocus.z = THREE.MathUtils.damp(this.camFocus.z, desiredZ, 6.5, dt);

    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    const shake = this.trauma * this.trauma * 0.45;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    _camTarget.set(this.camFocus.x + 18.5 + sx, 20.5 + sy, this.camFocus.z + 19.5);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTarget.x, 7.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTarget.y, 7.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTarget.z, 7.5, dt);
    this.camera.lookAt(this.camFocus);
  }

  private emitHud(): void {
    const total = Math.max(1, this.layout.playableCount);
    const clearedPct = Math.min(100, Math.round((this.clearedCounter.value / total) * 100));
    const targetPct = Math.round(this.layout.clearTargetRatio * 100);
    const comboRatio =
      this.combo.maxTimer > 0 ? Math.max(0, Math.min(1, this.combo.timer / this.combo.maxTimer)) : 0;

    this.callbacks.onHudUpdate({
      phase: this.phase,
      districtIndex: this.districtIndex,
      biome: this.layout.biome,
      districtName: this.layout.name,
      districtSubtitle: this.layout.subtitle,
      weather: this.currentWeather,
      weatherLabel: this.weatherLabel,
      vehicleId: this.vehicleId,
      unlockedVehicles: [...this.unlockedVehicles],
      coins: this.coins,
      score: this.score,
      clearedCells: this.clearedCounter.value,
      totalCells: this.layout.playableCount,
      clearedPercent: clearedPct,
      targetPercent: targetPct,
      comboCount: this.combo.count,
      comboMultiplier: this.combo.multiplier,
      comboTimerRatio: comboRatio,
      maxCombo: this.combo.maxComboReached,
      boostRatio: this.truck.boostEnergy,
      saltActive: this.truck.saltActive,
      saltTankRatio: this.truck.saltTank,
      hotWaterActive: this.truck.hotWaterActive,
      hotWaterRatio: this.truck.hotWaterEnergy,
      speedKmh: Math.round(Math.abs(this.truck.speed) * 4.2),
      elapsedSeconds: Math.round(this.elapsedSeconds),
      upgrades: { ...this.upgrades },
      muted: this.sound.isMuted(),
      garageOpen: this.garageOpen,
      garageTab: this.garageTab,
      customConfig: { ...this.customConfig },
      runSummary: this.runSummary,
    });
  }

  // --- Event Listeners ---

  private handleFirstPointerGesture = (): void => {
    this.sound.unlock();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.sound.unlock();
    const code = e.code;
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }

    if (e.repeat) {
      this.heldKeys.add(code);
      return;
    }

    this.heldKeys.add(code);

    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        this.startShift();
      } else if (code === 'KeyM') {
        this.toggleMute();
      }
      return;
    }

    if (this.phase === 'playing') {
      if (code === 'Escape' || code === 'KeyP') {
        this.togglePause();
      } else if (code === 'KeyE') {
        this.toggleGarage();
      } else if (code === 'KeyQ') {
        this.toggleSaltSpreader();
      } else if (code === 'KeyM') {
        this.toggleMute();
      } else if (code === 'KeyR') {
        this.restartDistrict();
      } else if (code === 'Digit1') {
        this.buyUpgrade('bladeWidth');
      } else if (code === 'Digit2') {
        this.buyUpgrade('enginePower');
      } else if (code === 'Digit3') {
        this.buyUpgrade('saltSystem');
      } else if (code === 'Digit4') {
        this.buyUpgrade('hotWaterSystem');
      } else if (code === 'Digit5') {
        this.buyUpgrade('comboWarmth');
      }
      return;
    }

    if (this.phase === 'paused') {
      if (code === 'Escape' || code === 'KeyP') {
        this.togglePause();
      } else if (code === 'KeyM') {
        this.toggleMute();
      }
      return;
    }

    if (this.phase === 'gameover') {
      if (code === 'Enter' || code === 'Space') {
        this.nextDistrict();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.heldKeys.clear();
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerdown', this.handleFirstPointerGesture);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.resizeObserver.disconnect();

    this.sound.dispose();
    this.textures.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
