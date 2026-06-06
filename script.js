var noise = new SimplexNoise();

// WebGL may be disabled (iOS Lockdown Mode, locked-down devices). Detect it so
// we can show a graceful static fallback instead of a blank canvas.
function isWebGLAvailable() {
  try {
    var c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

var vizInit = function () {
  var outEl = document.getElementById("out");
  if (!isWebGLAvailable()) {
    if (outEl) outEl.innerHTML = '<div class="webgl-fallback"><div class="wf-orb" aria-hidden="true"></div></div>';
    return; // skip all the WebGL/audio setup on devices without WebGL
  }

  var audio = document.getElementById("audio");
  audio.crossOrigin = "anonymous";

  var context = new AudioContext();
  var gainNode = context.createGain();
  var src = context.createMediaElementSource(audio);
  var analyser = context.createAnalyser();

  // Order matters: src -> gain -> analyser -> destination.
  // With the analyser AFTER the gain node, muting the music (gain = 0) also makes
  // the analyser read silence, so the orb stops reacting to muted music.
  src.connect(gainNode);
  gainNode.connect(analyser);
  analyser.connect(context.destination);

  // Start muted so the audio state matches the header button's default (🔇).
  gainNode.gain.value = 0;

  analyser.fftSize = 512;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  // 🎧 Mute/Unmute Button with Unlock Capability
  const muteBtn = document.createElement("button");
muteBtn.id = "mute-btn";
muteBtn.innerHTML = "🔇"; // 🔇 because it's muted by default
Object.assign(muteBtn.style, {
  display: "none", // hidden: the visible control is the header button in index.html
  position: "fixed",
  top: "1.5rem",
  right: "1.5rem",
  zIndex: "10000",
  backgroundColor: "#f15a29", // Orange
  color: "#fff",
  fontSize: "1.2rem",
  padding: "0.65rem 1.4rem",
  border: "none",
  fontFamily: "Orbitron, sans-serif",
  fontWeight: "bold",
  textTransform: "uppercase",
  clipPath: "polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)",
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
  cursor: "pointer",
  transition: "background-color 0.3s, transform 0.2s"
});


  muteBtn.onmouseover = () => (muteBtn.style.backgroundColor = "#e04f20");
muteBtn.onmouseout = () => (muteBtn.style.backgroundColor = "#f15a29");
muteBtn.onmousedown = () => (muteBtn.style.transform = "scale(0.95)");
muteBtn.onmouseup = () => (muteBtn.style.transform = "scale(1)");


  document.body.appendChild(muteBtn);

  let isMuted = true;
  let visualizerStarted = false;

  const startAudio = async () => {
    if (context.state === "suspended") {
      await context.resume();
    }
    if (audio.paused) {
      await audio.play().catch(() => {}); // catch prevents console errors
    }
  };

  muteBtn.addEventListener("click", async () => {
    await startAudio();
    isMuted = !isMuted;
    gainNode.gain.setValueAtTime(isMuted ? 0 : 1, context.currentTime);
    muteBtn.textContent = isMuted ? "🔇" : "🔊";

    if (!visualizerStarted) {
      render(); // ✅ Start visualizer loop
      visualizerStarted = true;
    }
  });

  // 🎥 Scene Setup (truncated for clarity)
  var scene = new THREE.Scene();
  var group = new THREE.Group();

  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  function positionCamera() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const portraitOrMobile = h >= w || w <= 1024;
    if (portraitOrMobile) {
      // Portrait / mobile / tablet: center the orb horizontally and lift it into
      // the upper area so the A.N.G.E.L title + chat panel sit below it.
      camera.position.set(0, 0, 120);
      camera.lookAt(new THREE.Vector3(0, -22, 0));
    } else {
      // Wide desktop: orb on the left, A.N.G.E.L panel on the right.
      camera.position.set(-60, 0, 100);
      camera.lookAt(new THREE.Vector3(70, 0, 0));
    }
  }
  positionCamera();
  scene.add(camera);

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);


  var icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
  var lambertMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEFA, wireframe: true });
  var ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
  group.add(ball);

  var glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      "c": { type: "f", value: 0.6 },
      "p": { type: "f", value: 2.5 },
      glowColor: { type: "c", value: new THREE.Color(0xADD8E6) },
      viewVector: { type: "v3", value: camera.position }
    },
    vertexShader: `
      uniform vec3 viewVector;
      uniform float c;
      uniform float p;
      varying float intensity;
      void main() {
        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vNormel = normalize(normalMatrix * viewVector);
        intensity = pow(c - dot(vNormal, vNormel), p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying float intensity;
      void main() {
        vec3 glow = glowColor * intensity;
        gl_FragColor = vec4(glow, 1.0);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  var glow = new THREE.Mesh(icosahedronGeometry.clone(), glowMaterial);
  glow.scale.set(1.5, 1.5, 1.5);
  group.add(glow);

  // Particle system
  var particles = new THREE.Geometry();
  var particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  for (var i = 0; i < 800; i++) {
    var vertex = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
    particles.vertices.push(vertex);
  }

  var particleSystem = new THREE.Points(particles, particleMaterial);
  group.add(particleSystem);

  scene.add(new THREE.AmbientLight(0xaaaaaa));

  var spotLight = new THREE.SpotLight(0xffffff);
  spotLight.intensity = 0.9;
  spotLight.position.set(-10, 40, 20);
  spotLight.lookAt(ball);
  spotLight.castShadow = true;
  scene.add(spotLight);

  scene.add(group);
  document.getElementById("out").appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);

  let warpMode = false;
  let warpStrength = 0;
  let ttsActive = false;       // true while the chatbot (A.N.G.E.L) is speaking
  let ttsTimeout = null;

  // The chat iframe posts these when A.N.G.E.L speaks. While it's talking, the
  // orb reacts to the assistant's voice and takes priority over the music.
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const type = event.data && event.data.type;
    if (type === "activateVisualizer" || type === "start-visualizer" || type === "triggerAnimation") {
      ttsActive = true;
      clearTimeout(ttsTimeout);
      // Safety net in case a "stop" message is ever missed.
      ttsTimeout = setTimeout(() => { ttsActive = false; }, 15000);
    } else if (type === "stop-visualizer") {
      ttsActive = false;
      clearTimeout(ttsTimeout);
    } else if (type === "toggle-mute") {
      // The header button (in the parent page) mutes/unmutes the music.
      isMuted = !!event.data.muted;
      if (!isMuted) { startAudio(); }   // resume context + play on unmute
      gainNode.gain.setValueAtTime(isMuted ? 0 : 1, context.currentTime);
      muteBtn.textContent = isMuted ? "🔇" : "🔊";
    }
  });

  function render() {
    requestAnimationFrame(render);
    analyser.getByteFrequencyData(dataArray);

    const t = performance.now() * 0.001;
    // Analyser is post-gain, so this is true when music is muted or absent.
    const musicSilent = dataArray.every((v) => v === 0);

    let lowerMaxFr, lowerAvgFr, upperAvgFr;

    if (ttsActive) {
      // 🎙️ Prioritize the chatbot voice: a gentle, smooth "talking" pulse.
      // (The Web Speech API can't be analysed directly, so we synthesize a
      // calm speech-like signal while A.N.G.E.L is speaking. Keep amplitudes
      // small — high values make the orb explode into spikes.)
      const pulse = (Math.sin(t * 7.0) + Math.sin(t * 11.0)) * 0.5; // -1..1, layered
      lowerMaxFr = 0.18 + Math.abs(pulse) * 0.22;   // ~0.18–0.40, more jump
      lowerAvgFr = 0.14 + Math.abs(Math.sin(t * 4.5)) * 0.12;
      upperAvgFr = 0.12 + Math.abs(Math.cos(t * 6.0)) * 0.10;
    } else if (musicSilent) {
      // Gentle idle breathing (music off/muted and assistant quiet).
      lowerMaxFr = 0.10 + Math.abs(Math.sin(t * 0.5)) * 0.03;
      lowerAvgFr = 0.08 + Math.abs(Math.cos(t * 0.4)) * 0.03;
      upperAvgFr = 0.06 + Math.abs(Math.sin(t * 0.3)) * 0.02;
    } else {
      // React to the background music.
      const lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
      const upperHalfArray = dataArray.slice(dataArray.length / 2 - 1, dataArray.length - 1);
      lowerMaxFr = max(lowerHalfArray) / lowerHalfArray.length;
      lowerAvgFr = avg(lowerHalfArray) / lowerHalfArray.length;
      upperAvgFr = avg(upperHalfArray) / upperHalfArray.length;
    }

    makeRoughBall(
      ball,
      modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
      modulate(upperAvgFr, 0, 1, 0, 4)
    );

    const scale = modulate(lowerAvgFr, 0, 1, 1, 1.4);
    ball.scale.set(scale, scale, scale);
    glow.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);

    const energetic = ttsActive || (!musicSilent && lowerMaxFr > 0.3);
    if (energetic) {
      warpMode = true;
      warpStrength = modulate(lowerMaxFr, 0.5, 1, 0.0005, 0.004);
    } else {
      warpMode = false;
      warpStrength *= 0.98;
    }

    particles.vertices.forEach((v) => {
      const dir = v.clone().normalize();
      const movement = warpMode ? warpStrength : (musicSilent && !ttsActive ? 0.001 : 0);
      v.add(dir.multiplyScalar(movement));
      if (v.length() > 150) {
        v.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
      }
    });

    particles.verticesNeedUpdate = true;
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function makeRoughBall(mesh, bassFr, treFr) {
    mesh.geometry.vertices.forEach(function (vertex) {
      var offset = mesh.geometry.parameters.radius;
      var amp = 12;
      var time = window.performance.now();
      vertex.normalize();
      var rf = 0.00001;
      var distance =
        offset +
        bassFr +
        noise.noise3D(
          vertex.x + time * rf * 7,
          vertex.y + time * rf * 8,
          vertex.z + time * rf * 9
        ) * amp * treFr;
      vertex.multiplyScalar(distance);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
  }

  // Start the render loop immediately (independent of audio playback).
  if (!visualizerStarted) {
    render();
    visualizerStarted = true;
  }

  // Set typewriter text if that element exists (guarded — not present on every page).
  const typewriterEl = document.getElementById("typewriter-text");
  if (typewriterEl) typewriterEl.textContent = "A.N.G.E.L";
};

window.onload = vizInit;

document.body.addEventListener("touchend", function () {
  if (typeof context !== "undefined") context.resume();
});

// Utility functions
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}
function modulate(val, minVal, maxVal, outMin, outMax) {
  var fr = fractionate(val, minVal, maxVal);
  var delta = outMax - outMin;
  return outMin + fr * delta;
}
function avg(arr) {
  var total = arr.reduce((sum, b) => sum + b, 0);
  return total / arr.length;
}
function max(arr) {
  return arr.reduce((a, b) => Math.max(a, b), -Infinity);
}
// Optional inline chat fallback — only wires up if these elements exist on the
// page (they live in chat-module.html, not the visualizer page that loads this).
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-button');

if (sendBtn && chatInput && chatBox) {
  sendBtn.onclick = () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user-message';
    userDiv.textContent = "You: " + msg;
    chatBox.appendChild(userDiv);

    const botDiv = document.createElement('div');
    botDiv.className = 'chat-message bot-message';
    botDiv.textContent = "A.N.G.E.L: Affirmative. '" + msg + "' received.";
    chatBox.appendChild(botDiv);

    chatInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
  };
}
// Note: postMessage handling (toggle-mute, activate/stop-visualizer) lives inside
// vizInit so it can access the audio graph and the ttsActive flag directly.
