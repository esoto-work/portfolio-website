// Clickjacking defense-in-depth: if this top page is ever loaded inside another
// site's frame, break out of it. (Full protection needs the frame-ancestors /
// X-Frame-Options HTTP header, which requires Cloudflare in front of Pages.)
try {
  if (window.top !== window.self) {
    window.top.location = window.self.location;
  }
} catch (e) {
  // A cross-origin framer blocks access — hide the page so it can't be clickjacked.
  document.documentElement.style.display = "none";
}

// Mobile nav toggle for the #menu-icon hamburger in the header.
// (Salvaged from the old planscript.js, with a null-guard so it never throws
// if the elements aren't present.)
const menuIcon = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');

if (menuIcon && navbar) {
  menuIcon.onclick = () => {
    menuIcon.classList.toggle('bx-x');
    navbar.classList.toggle('active');
  };
}

// Header music toggle — controls the background music that lives inside the
// visualizer iframe (Projects section) via postMessage. Starts muted.
const musicToggle = document.getElementById('music-toggle');
const vizFrame = document.getElementById('visualizer-frame');
let musicMuted = true;

if (musicToggle) {
  musicToggle.addEventListener('click', () => {
    musicMuted = !musicMuted;
    const icon = musicToggle.querySelector('i');
    if (icon) icon.className = musicMuted ? 'bx bx-volume-mute' : 'bx bx-volume-full';
    musicToggle.classList.toggle('active', !musicMuted);
    if (vizFrame && vizFrame.contentWindow) {
      vizFrame.contentWindow.postMessage(
        { type: 'toggle-mute', muted: musicMuted },
        window.location.origin
      );
    }
  });
}
