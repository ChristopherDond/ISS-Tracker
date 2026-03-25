const openNotifyUrl = "http://api.open-notify.org/iss-now.json";
const openNotifyPassUrl = "http://api.open-notify.org/iss-pass.json";
const sunriseUrl = "https://api.sunrise-sunset.org/json";

const elements = {
  status: document.getElementById("status"),
  lastUpdate: document.getElementById("last-update"),
  signal: document.getElementById("signal"),
  lat: document.getElementById("lat"),
  lon: document.getElementById("lon"),
  alt: document.getElementById("alt"),
  vel: document.getElementById("vel"),
  passes: document.getElementById("passes"),
  follow: document.getElementById("follow"),
  free: document.getElementById("free"),
  refresh: document.getElementById("refresh"),
  trail: document.getElementById("trail"),
  atmosphere: document.getElementById("atmosphere"),
  langButtons: Array.from(document.querySelectorAll(".lang-btn")),
};

const translations = {
  pt: {
    title: "ISS Tracker",
    subtitle: "Telemetria orbital, trilhas visuais e passagens em tempo real.",
    statusConnecting: "Conectando aos satelites...",
    updating: "Atualizando...",
    signalStabilizing: "Sinal: estabilizando",
    telemetry: "Telemetria em tempo real",
    latitude: "Latitude",
    longitude: "Longitude",
    altitude: "Altitude",
    velocity: "Velocidade",
    passes: "Proximas passagens visiveis",
    passesHint: "Permita geolocalizacao para calcular visibilidade. Usamos Open Notify + Sunrise-Sunset.",
    loadingPasses: "Carregando previsoes...",
    controls: "Controles",
    follow: "Seguir ISS",
    explore: "Explorar globo",
    refresh: "Atualizar agora",
    trail: "Mostrar trilha orbital",
    atmosphere: "Brilho atmosferico",
    footerData: "Dados:",
    footerViz: "| Visualizacao:",
    footerInspiration: "| Inspiracao:",
    signalSync: "Sinal: sincronizando",
    signalStable: "Sinal: estavel",
    signalUnstable: "Sinal: instavel",
    statusActive: "Transmissao ativa",
    statusError: "Erro na comunicacao",
    updated: "Atualizado",
    passVisible: "Visivel",
    passLow: "Pouco visivel",
    passUnavailable: "Nenhuma previsao disponivel.",
    passError: "Erro ao calcular passagens.",
    geoDenied: "Permissao de localizacao negada.",
    geoUnsupported: "Navegador sem suporte a geolocalizacao.",
    minutes: "min",
  },
  en: {
    title: "ISS Tracker",
    subtitle: "Orbital telemetry, visual trails, and passes in real time.",
    statusConnecting: "Connecting to satellites...",
    updating: "Updating...",
    signalStabilizing: "Signal: stabilizing",
    telemetry: "Real-time telemetry",
    latitude: "Latitude",
    longitude: "Longitude",
    altitude: "Altitude",
    velocity: "Velocity",
    passes: "Upcoming visible passes",
    passesHint: "Allow geolocation to estimate visibility. We use Open Notify + Sunrise-Sunset.",
    loadingPasses: "Loading passes...",
    controls: "Controls",
    follow: "Follow ISS",
    explore: "Explore globe",
    refresh: "Refresh now",
    trail: "Show orbital trail",
    atmosphere: "Atmospheric glow",
    footerData: "Data:",
    footerViz: "| Visualization:",
    footerInspiration: "| Inspiration:",
    signalSync: "Signal: syncing",
    signalStable: "Signal: stable",
    signalUnstable: "Signal: unstable",
    statusActive: "Live transmission",
    statusError: "Communication error",
    updated: "Updated",
    passVisible: "Visible",
    passLow: "Low visibility",
    passUnavailable: "No forecast available.",
    passError: "Error while calculating passes.",
    geoDenied: "Location permission denied.",
    geoUnsupported: "Browser without geolocation support.",
    minutes: "min",
  },
};

let currentLang = "pt";

function t(key) {
  return translations[currentLang][key] || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  if (lastPassItems.length) {
    renderPasses(lastPassItems);
  }

  if (lastSample) {
    const updated = new Date(lastSample.timestamp);
    elements.lastUpdate.textContent = `${t("updated")} ${updated.toLocaleTimeString(
      currentLang === "pt" ? "pt-BR" : "en-US"
    )}`;
  }
}

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  applyTranslations();
  elements.langButtons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.lang === lang);
  });
}

const globeContainer = document.getElementById("globe");
const globe = Globe()(globeContainer)
  .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
  .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
  .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
  .atmosphereColor("#55d4ff")
  .atmosphereAltitude(0.25)
  .showAtmosphere(true)
  .pointOfView({ lat: 0, lng: 0, altitude: 2.2 });

globe.controls().enableDamping = true;

globe.renderer().setClearColor("#05060b", 1);

const issMarker = {
  lat: 0,
  lng: 0,
  size: 0.6,
  color: "#4de2b3",
};

globe
  .htmlElementsData([issMarker])
  .htmlLat((d) => d.lat)
  .htmlLng((d) => d.lng)
  .htmlElement(() => {
    const el = document.createElement("div");
    el.className = "iss-icon";
    return el;
  });

let history = [];
let followIss = true;
let lastSample = null;
let velocity = 0;
let lastPassItems = [];

function setStatus(message, danger = false) {
  elements.status.textContent = t(message) || message;
  elements.status.style.color = danger ? "#ff6b6b" : "#4de2b3";
}

function updateTelemetry({ latitude, longitude, altitude }) {
  elements.lat.textContent = `${latitude.toFixed(2)}°`;
  elements.lon.textContent = `${longitude.toFixed(2)}°`;
  elements.alt.textContent = `${altitude.toFixed(1)} km`;
  elements.vel.textContent = `${velocity.toFixed(2)} km/s`;
}

function updateOrbitTrail(lat, lng) {
  history.push({ lat, lng });
  if (history.length > 90) history.shift();

  globe
    .pathColor(() => ["rgba(94, 241, 255, 0.85)"])
    .pathStroke(1.8)
    .pathDashLength(0.2)
    .pathDashGap(0.08)
    .pathDashAnimateTime(3000)
    .pathsData([
      {
        coords: history,
      },
    ]);
}

function setMarker(lat, lng) {
  issMarker.lat = lat;
  issMarker.lng = lng;

  globe.htmlElementsData([issMarker]);

  if (followIss) {
    globe.pointOfView({ lat, lng, altitude: 1.8 }, 900);
  }
}

function computeVelocity(sample) {
  if (!lastSample) {
    lastSample = sample;
    return;
  }

  const timeDelta = (sample.timestamp - lastSample.timestamp) / 1000;
  if (timeDelta <= 0) return;

  const rad = Math.PI / 180;
  const earthRadius = 6371;
  const lat1 = lastSample.latitude * rad;
  const lat2 = sample.latitude * rad;
  const dLat = (sample.latitude - lastSample.latitude) * rad;
  const dLng = (sample.longitude - lastSample.longitude) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  velocity = distance / timeDelta;
  lastSample = sample;
}

async function fetchIssPosition() {
  const response = await fetch(openNotifyUrl);
  if (!response.ok) throw new Error("Falha ao consultar ISS");

  const payload = await response.json();
  const { latitude, longitude } = payload.iss_position;
  const timestamp = payload.timestamp * 1000;

  const altitude = 408;
  const sample = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    altitude,
    timestamp,
  };

  computeVelocity(sample);
  updateTelemetry(sample);
  setMarker(sample.latitude, sample.longitude);

  if (elements.trail.checked) {
    updateOrbitTrail(sample.latitude, sample.longitude);
  } else {
    globe.pathsData([]);
  }

  const updated = new Date(timestamp);
  elements.lastUpdate.textContent = `${t("updated")} ${updated.toLocaleTimeString(
    currentLang === "pt" ? "pt-BR" : "en-US"
  )}`;
  elements.signal.textContent = t("signalStable");
  setStatus("statusActive");
}

async function fetchPasses(lat, lng) {
  const passResponse = await fetch(
    `${openNotifyPassUrl}?lat=${lat}&lon=${lng}&n=5`
  );
  if (!passResponse.ok) throw new Error("Falha ao consultar passagens");
  const passData = await passResponse.json();

  const sunResponse = await fetch(`${sunriseUrl}?lat=${lat}&lng=${lng}&formatted=0`);
  const sunData = await sunResponse.json();
  const sunset = new Date(sunData.results.sunset);
  const sunrise = new Date(sunData.results.sunrise);

  const items = passData.response.map((pass) => {
    const risetime = new Date(pass.risetime * 1000);
    const duration = Math.round(pass.duration / 60);
    const isNight = risetime < sunrise || risetime > sunset;
    return {
      risetime,
      duration,
      isNight,
    };
  });

  renderPasses(items);
  lastPassItems = items;
}

function renderPasses(items) {
  elements.passes.innerHTML = "";

  if (!items.length) {
    elements.passes.innerHTML = `<li>${t("passUnavailable")}</li>`;
    return;
  }

  items.forEach((pass) => {
    const li = document.createElement("li");
    const label = pass.isNight ? t("passVisible") : t("passLow");
    const locale = currentLang === "pt" ? "pt-BR" : "en-US";
    li.innerHTML = `
      <span class="pass-time">${pass.risetime.toLocaleString(locale)}</span>
      <span class="pass-meta">${pass.duration} ${t("minutes")}</span>
      <span class="pass-tag ${pass.isNight ? "good" : "warn"}">${label}</span>
    `;
    elements.passes.appendChild(li);
  });
}

async function updateAll() {
  try {
    elements.signal.textContent = t("signalSync");
    await fetchIssPosition();
  } catch (error) {
    console.error(error);
    setStatus("statusError", true);
    elements.signal.textContent = t("signalUnstable");
  }
}

function setupControls() {
  elements.follow.addEventListener("click", () => {
    followIss = true;
    elements.follow.classList.add("btn-primary");
    elements.free.classList.remove("btn-primary");
  });

  elements.free.addEventListener("click", () => {
    followIss = false;
    elements.free.classList.add("btn-primary");
    elements.follow.classList.remove("btn-primary");
  });

  elements.refresh.addEventListener("click", () => updateAll());

  elements.trail.addEventListener("change", () => {
    if (!elements.trail.checked) {
      history = [];
      globe.pathsData([]);
    } else if (lastSample) {
      updateOrbitTrail(lastSample.latitude, lastSample.longitude);
    }
  });

  elements.atmosphere.addEventListener("change", () => {
    globe.showAtmosphere(elements.atmosphere.checked);
  });
}

function initStarfield() {
  const starCount = 2500;
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  for (let i = 0; i < starCount; i += 1) {
    const radius = 300 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    vertices.push(x, y, z);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ color: 0x7ea6ff, size: 1.2 });
  const stars = new THREE.Points(geometry, material);
  globe.scene().add(stars);
}

function setupReveal() {
  const targets = document.querySelectorAll(".scroll-reveal");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("is-visible");
          }, index * 80);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  targets.forEach((target) => observer.observe(target));
}

function init() {
  initStarfield();
  setupControls();
  setupReveal();
  const savedLang = localStorage.getItem("iss-lang");
  setLanguage(savedLang || "pt");
  elements.langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      localStorage.setItem("iss-lang", lang);
    });
  });
  updateAll();
  setInterval(updateAll, 5000);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchPasses(pos.coords.latitude, pos.coords.longitude).catch(() => {
          elements.passes.innerHTML = `<li>${t("passError")}</li>`;
        });
      },
      () => {
        elements.passes.innerHTML = `<li>${t("geoDenied")}</li>`;
      }
    );
  } else {
    elements.passes.innerHTML = `<li>${t("geoUnsupported")}</li>`;
  }
}

init();
