var noise = new SimplexNoise();

var vizInit = function () {
  var audio = document.getElementById("audio");
  audio.crossOrigin = "anonymous";

  var context = new AudioContext();
  var gainNode = context.createGain();
  var src = context.createMediaElementSource(audio);
  var analyser = context.createAnalyser();

  src.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(context.destination);

  analyser.fftSize = 512;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  // 🎧 Mute/Unmute Button with Unlock Capability
  const muteBtn = document.createElement("button");
muteBtn.id = "mute-btn";
muteBtn.innerHTML = "🔇"; // 🔇 because it's muted by default
Object.assign(muteBtn.style, {
  position: "fixed",
  top: "30rem",
  right: "16rem",
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
  camera.position.set(-60, 0, 100);
  camera.lookAt(new THREE.Vector3(70, 0, 0));
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

  function render() {
    analyser.getByteFrequencyData(dataArray);

    var lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
    var upperHalfArray = dataArray.slice(dataArray.length / 2 - 1, dataArray.length - 1);

    var lowerMax = max(lowerHalfArray);
    var lowerAvg = avg(lowerHalfArray);
    var upperAvg = avg(upperHalfArray);

    var lowerMaxFr = lowerMax / lowerHalfArray.length;
    var lowerAvgFr = lowerAvg / lowerHalfArray.length;
    var upperAvgFr = upperAvg / upperHalfArray.length;

    makeRoughBall(
      ball,
      modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8),
      modulate(upperAvgFr, 0, 1, 0, 4)
    );

    var scale = modulate(lowerAvgFr, 0, 1, 1, 1.4);
    ball.scale.set(scale, scale, scale);
    glow.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);

    if (lowerMaxFr > 0.3) {
      warpMode = true;
      warpStrength = modulate(lowerMaxFr, 0.5, 1, 0.0005, 0.004)
    } else {
      warpMode = false;
      warpStrength *= 0.98;
    }

    particles.vertices.forEach(function (v) {
      if (warpMode) {
        let dir = v.clone().normalize();
        v.add(dir.multiplyScalar(warpStrength));
      }

      if (v.length() > 150) {
        v.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
      }
    });

    particles.verticesNeedUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(render);
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

  if (!visualizerStarted) {
  render();  // Starts only when the mute button is first clicked
  visualizerStarted = true;
}
;

  // ✅ Set typewriter text AFTER DOM is loaded
  document.getElementById("typewriter-text").textContent = "A.N.G.E.L";
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
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-button');

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
window.addEventListener("message", (event) => {
  if (event.data.type === "toggle-mute") {
    const gainNode = window.setGainNode?.();
    if (gainNode) {
      const volume = event.data.muted ? 0 : 1;
      gainNode.gain.setValueAtTime(volume, gainNode.context.currentTime);
    }
  }
});
