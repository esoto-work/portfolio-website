// Contact form handler. A static site (GitHub Pages) has no backend, so this
// composes an email in the visitor's mail app via a mailto: link — it works
// with no server and no third-party signup.
//
// Want submissions to arrive without opening a mail client? Create a free
// Formspree form (https://formspree.io), then set FORMSPREE_ENDPOINT below to
// your "https://formspree.io/f/XXXXanimation" URL and it will POST instead.
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const status = document.getElementById("form-status");
  const TO = "esoto.work@outlook.com";
  const FORMSPREE_ENDPOINT = null; // e.g. "https://formspree.io/f/abcdwxyz"

  // Anti-spam: record when the form became available; real users take a moment.
  const loadedAt = Date.now();
  const MIN_FILL_MS = 2000;   // submissions faster than this are almost always bots
  const MAX = { name: 100, email: 254, phone: 30, subject: 150, message: 3000 };

  function setStatus(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.style.color = ok ? "#00f0ff" : "#ff6b6b";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    // Honeypot — hidden field only a bot would fill. Pretend success, send nothing.
    // Also drop obvious automation (headless browsers report navigator.webdriver).
    if ((data.get("website") || "").toString().trim() !== "" || navigator.webdriver === true) {
      setStatus("Thanks! Your message was sent.", true);
      form.reset();
      return;
    }
    // Timing trap — instant submits are bots.
    if (Date.now() - loadedAt < MIN_FILL_MS) {
      setStatus("Please take a moment to complete the form, then try again.", false);
      return;
    }

    const name = (data.get("name") || "").toString().trim().slice(0, MAX.name);
    const email = (data.get("email") || "").toString().trim().slice(0, MAX.email);
    const phone = (data.get("phone") || "").toString().trim().slice(0, MAX.phone);
    const subject = (data.get("subject") || "").toString().trim().slice(0, MAX.subject);
    const message = (data.get("message") || "").toString().trim().slice(0, MAX.message);

    if (!name || !email || !message) {
      setStatus("Please fill in your name, email, and message.", false);
      return;
    }
    // Block CR/LF in single-line fields (header-injection hygiene for any backend).
    if (/[\r\n]/.test(name + email + subject + phone)) {
      setStatus("Invalid characters in name, email, phone, or subject.", false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("Please enter a valid email address.", false);
      return;
    }

    const subjectLine = subject || ("Portfolio contact from " + name);

    // Option A: POST to Formspree if configured (no mail client needed).
    if (FORMSPREE_ENDPOINT) {
      try {
        setStatus("Sending…", true);
        const res = await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        if (res.ok) {
          setStatus("Thanks! Your message was sent.", true);
          form.reset();
        } else {
          setStatus("Something went wrong — please email " + TO + " directly.", false);
        }
      } catch (err) {
        setStatus("Network error — please email " + TO + " directly.", false);
      }
      return;
    }

    // Option B: mailto fallback — opens the visitor's email app, pre-filled.
    const body =
      "Name: " + name + "\n" +
      "Email: " + email + "\n" +
      (phone ? "Phone: " + phone + "\n" : "") +
      "\n" + message + "\n";
    const mailto =
      "mailto:" + TO +
      "?subject=" + encodeURIComponent(subjectLine) +
      "&body=" + encodeURIComponent(body);

    window.location.href = mailto;
    setStatus("Opening your email app… if nothing happens, email " + TO + " directly.", true);
    form.reset();
  });
})();
