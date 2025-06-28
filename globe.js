import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170/examples/jsm/controls/OrbitControls.js';

// Fullscreen container
const container = document.getElementById('globe-container');

// Set up renderer and append to DOM
const renderer = new THREE.WebGLRenderer({ antialias: true });
container.style.overflow = 'hidden';
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 🌐 Globe wireframe
const sphereGeometry = new THREE.SphereGeometry(10, 32, 16);
const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x0da0e4, transparent: true, opacity: 0.3 });
const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(sphereGeometry), wireframeMaterial);
wireframe.scale.set(2, 2, 2);
wireframe.position.x = 16;
scene.add(wireframe);

// ✨ Starfield
const starCount = 1000;
const starGeometry = new THREE.BufferGeometry();
const positions = [];
const offsets = [];

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

for (let i = 0; i < starCount; i++) {
  const r = 20 + seededRandom(i + 1) * 480;
  const theta = seededRandom(i + 2) * Math.PI * 2;
  const phi = seededRandom(i + 3) * Math.PI;

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  positions.push(x, y, z);
  offsets.push(seededRandom(i + 4) * Math.PI * 2);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
starGeometry.setAttribute('offset', new THREE.Float32BufferAttribute(offsets, 1));

const canvas = document.createElement('canvas');
canvas.width = 64; canvas.height = 64;
const ctx = canvas.getContext('2d');
ctx.beginPath();
ctx.arc(32, 32, 30, 0, Math.PI * 2);
ctx.fillStyle = 'white';
ctx.fill();
const circleTexture = new THREE.CanvasTexture(canvas);

const starMaterial = new THREE.PointsMaterial({
  size: 1.8,
  map: circleTexture,
  transparent: true,
  alphaTest: 0.5,
  depthWrite: false,
  sizeAttenuation: false
});

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 🌍 Country outlines
const countriesGroup = new THREE.Group();
countriesGroup.scale.set(2, 2, 2);
countriesGroup.position.x = 16;
scene.add(countriesGroup);

fetch('countries.json')
  .then(res => res.json())
  .then(data => {
    const countryMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    data.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const type = feature.geometry.type;

      const createLines = (pointsArray) => {
        pointsArray.forEach((ring) => {
          const points = ring.map(([lng, lat]) => {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const radius = 10.01;
            return new THREE.Vector3(
              -radius * Math.sin(phi) * Math.cos(theta),
              radius * Math.cos(phi),
              radius * Math.sin(phi) * Math.sin(theta)
            );
          });

          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.LineLoop(geometry, countryMat);
          countriesGroup.add(line);
        });
      };

      if (type === "Polygon") {
        createLines(coords);
      } else if (type === "MultiPolygon") {
        coords.forEach(polygon => createLines(polygon));
      }
    });
  });

// 🔁 Animate
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  const positionsAttr = starGeometry.getAttribute('position');
  const offsetAttr = starGeometry.getAttribute('offset');

  for (let i = 0; i < starCount; i++) {
    const phase = offsetAttr.array[i];
    positionsAttr.array[i * 3] += Math.sin(time * 2 + phase) * 0.002;
    positionsAttr.array[i * 3 + 1] += Math.cos(time * 2 + phase) * 0.002;
  }

  positionsAttr.needsUpdate = true;
  wireframe.rotation.y += 0.0003; // 🐢 50% slower
  countriesGroup.rotation.y += 0.0003;
  controls.update();
  renderer.render(scene, camera);
}
animate();

// 🔄 Handle Resize
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
