import * as THREE from 'three';

export interface ProceduralTexturePack {
  roadCobbleMap: THREE.CanvasTexture;
  plazaStoneMap: THREE.CanvasTexture;
  snowBumpMap: THREE.CanvasTexture;
  woodPlankMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Cozy winter wet-slate cobblestone road texture
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = '#404c5e';
  rCtx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;
  for (let y = 0; y < rows; y++) {
    const offset = (y % 2) * (cellW * 0.5);
    for (let x = -1; x <= cols; x++) {
      const shade = 68 + ((x * 17 + y * 31) % 18);
      const blue = shade + 18;
      rCtx.fillStyle = `rgb(${shade}, ${shade + 8}, ${blue})`;
      const px = x * cellW + offset + 3;
      const py = y * cellH + 3;
      rCtx.beginPath();
      rCtx.roundRect(px, py, cellW - 6, cellH - 6, 8);
      rCtx.fill();

      // Subtle top rim highlight on each stone
      rCtx.fillStyle = 'rgba(210, 226, 245, 0.14)';
      rCtx.fillRect(px + 4, py + 2, cellW - 14, 4);
    }
  }

  const roadCobbleMap = new THREE.CanvasTexture(roadCanvas);
  roadCobbleMap.colorSpace = THREE.SRGBColorSpace;
  roadCobbleMap.wrapS = THREE.RepeatWrapping;
  roadCobbleMap.wrapT = THREE.RepeatWrapping;
  roadCobbleMap.repeat.set(14, 14);
  roadCobbleMap.anisotropy = anisotropy;

  // 2. Warm herringbone / stone plaza tile map
  const plazaCanvas = document.createElement('canvas');
  plazaCanvas.width = 512;
  plazaCanvas.height = 512;
  const pCtx = plazaCanvas.getContext('2d')!;
  pCtx.fillStyle = '#5a5554';
  pCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const warm = 104 + ((x * 23 + y * 13) % 22);
      pCtx.fillStyle = `rgb(${warm + 10}, ${warm + 4}, ${warm - 2})`;
      pCtx.beginPath();
      pCtx.roundRect(x * 64 + 3, y * 64 + 3, 58, 58, 6);
      pCtx.fill();
      pCtx.strokeStyle = 'rgba(255, 242, 220, 0.12)';
      pCtx.lineWidth = 2;
      pCtx.stroke();
    }
  }

  const plazaStoneMap = new THREE.CanvasTexture(plazaCanvas);
  plazaStoneMap.colorSpace = THREE.SRGBColorSpace;
  plazaStoneMap.wrapS = THREE.RepeatWrapping;
  plazaStoneMap.wrapT = THREE.RepeatWrapping;
  plazaStoneMap.repeat.set(6, 6);
  plazaStoneMap.anisotropy = anisotropy;

  // 3. Linear grayscale snow crystal micro-relief bump map (NoColorSpace)
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = 256;
  snowCanvas.height = 256;
  const sCtx = snowCanvas.getContext('2d')!;
  sCtx.fillStyle = '#888888';
  sCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const x = (Math.sin(i * 19.13) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 47.71) * 0.5 + 0.5) * 256;
    const r = 1 + (i % 4);
    const val = i % 2 === 0 ? 185 : 100;
    sCtx.fillStyle = `rgba(${val},${val},${val},0.25)`;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }
  const snowBumpMap = new THREE.CanvasTexture(snowCanvas);
  snowBumpMap.wrapS = THREE.RepeatWrapping;
  snowBumpMap.wrapT = THREE.RepeatWrapping;
  snowBumpMap.repeat.set(4, 4);
  snowBumpMap.anisotropy = anisotropy;

  // 4. Warm cedar wood plank map
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#8c5a38';
  wCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 6; row++) {
    const y = row * (256 / 6);
    const tint = (row % 3) * 8;
    wCtx.fillStyle = `rgb(${142 + tint}, ${92 + tint}, ${58 + tint})`;
    wCtx.fillRect(0, y + 2, 256, 256 / 6 - 4);
    wCtx.fillStyle = 'rgba(60, 32, 16, 0.25)';
    wCtx.fillRect(0, y, 256, 2);
  }
  const woodPlankMap = new THREE.CanvasTexture(woodCanvas);
  woodPlankMap.colorSpace = THREE.SRGBColorSpace;
  woodPlankMap.wrapS = THREE.RepeatWrapping;
  woodPlankMap.wrapT = THREE.RepeatWrapping;
  woodPlankMap.anisotropy = anisotropy;

  // 5. Soft radial contact shadow disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(18, 28, 46, 0.65)');
  grad.addColorStop(0.55, 'rgba(24, 38, 60, 0.28)');
  grad.addColorStop(1, 'rgba(24, 38, 60, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;

  return {
    roadCobbleMap,
    plazaStoneMap,
    snowBumpMap,
    woodPlankMap,
    contactShadowMap,
    dispose: () => {
      roadCobbleMap.dispose();
      plazaStoneMap.dispose();
      snowBumpMap.dispose();
      woodPlankMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
