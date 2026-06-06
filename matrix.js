// Matrix digital-rain animation for the About section background.
// Draws onto #matrix-rain, sized to its parent section.
(function () {
  const canvas = document.getElementById("matrix-rain");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const section = canvas.parentElement;

  const chars =
    "アカサタナハマヤラワ0123456789ABCDEFｱｲｳｴｵｶｷｸ<>/{}[]#$%".split("");
  const fontSize = 16;
  let columns = 0;
  let drops = [];

  function resize() {
    const w = section.clientWidth;
    const h = section.clientHeight;
    // Ignore no-op callbacks (e.g. a card lifting on hover fires the observer
    // but the section size hasn't changed) so the rain doesn't restart.
    if (w === canvas.width && h === canvas.height) return;
    canvas.width = w;
    canvas.height = h;
    const cols = Math.max(1, Math.floor(w / fontSize));
    // Preserve existing column positions across a real resize.
    const next = new Array(cols);
    for (let i = 0; i < cols; i++) {
      next[i] = drops[i] != null ? drops[i] : Math.random() * -50;
    }
    columns = cols;
    drops = next;
  }

  let last = 0;
  const STEP = 110; // ms between rows — higher = slower rain

  function draw(now) {
    requestAnimationFrame(draw);
    if (now - last < STEP) return; // throttle so the letters fall calmly
    last = now;

    // Translucent black fade leaves trailing streaks.
    ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00f0ff"; // site blue/cyan
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(text, x, y);

      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  window.addEventListener("resize", resize);
  // Re-measure once after fonts/images finish loading (the photo can change the
  // section height). We deliberately do NOT use a ResizeObserver: it can fire
  // during a card's hover transition and restart the rain. After load the
  // section size is stable, so window resize is the only case we need.
  window.addEventListener("load", resize);

  resize();
  requestAnimationFrame(draw);
})();
