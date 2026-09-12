import * as THREE from 'three';

// --- Scene ---
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

// --- Renderer ---
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const CAMERA_OFFSET = new THREE.Vector3(0, 8, -10);
camera.position.set(0, 8.5, -10);
camera.lookAt(0, 0.5, 0);

// --- Lighting ---
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const skyFill = new THREE.HemisphereLight(0xd9f3ff, 0x5f7842, 0.45);
scene.add(skyFill);

const sun = new THREE.DirectionalLight(0xfff3dc, 1.15);
sun.position.set(-7, 14, -6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -6;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0005;
scene.add(sun);

// --- Resize Handler ---
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- Camera Follow ---
/**
 * Smoothly lerps the camera toward the player from behind and above.
 * Called each frame from the game loop.
 * @param {THREE.Vector3} playerPos
 */
export function updateCamera(playerPos) {
  const target = playerPos.clone().add(CAMERA_OFFSET);
  camera.position.lerp(target, 0.1);
  camera.lookAt(playerPos);
}

/** Restores the camera immediately when a new run begins. */
export function resetCamera(playerPos) {
  camera.position.copy(playerPos).add(CAMERA_OFFSET);
  camera.lookAt(playerPos);
}
