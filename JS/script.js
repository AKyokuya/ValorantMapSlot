// =====================================================
// VALORANT Map Slot (Single Reel / 3 Rows)
// =====================================================

const MAP_IMAGE_BASE_DIRS = [
  "./image/png/",
  "./image/",
  "./img/maps/",
  "./img/",
  "./images/maps/",
  "./images/",
  "./assets/maps/",
  "./maps/",
  "./Map/",
  "./IMG/maps/",
  "./IMG/",
];
const MAP_IMAGE_EXTS = [".png", ".webp", ".jpg", ".jpeg"];
const VALORANT_MAPS_API = "https://valorant-api.com/v1/maps?language=en-US";
const REEL_COPIES = 14;

const SPEED_PRESETS = {
  slow: { label: "ゆっくり", speedPx: 2800, decelMs: 6400 },
  normal: { label: "普通", speedPx: 4000, decelMs: 5600 },
  fast: { label: "高速", speedPx: 5200, decelMs: 5200 },
};

function buildImageCandidates(key){
  const files = [key, key.toLowerCase()];
  const seen = new Set();
  const candidates = [];

  for (const dir of MAP_IMAGE_BASE_DIRS){
    for (const name of files){
      for (const ext of MAP_IMAGE_EXTS){
        const path = `${dir}${name}${ext}`;
        if (seen.has(path)) continue;
        seen.add(path);
        candidates.push(path);
      }
    }
  }
  return candidates;
}

function normalizeMapKey(name = ""){
  return name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z]/g, "");
}

function parseModeFromUrl(){
  const params = new URLSearchParams(window.location.search);
  return params.get("mode");
}

async function attachMapImagesFromApi(){
  try {
    const res = await fetch(VALORANT_MAPS_API);
    if (!res.ok) return;

    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    const apiByKey = new Map();

    for (const row of rows){
      const displayName = row?.displayName;
      const splash = row?.splash || row?.listViewIcon || row?.displayIcon;
      if (!displayName || !splash) continue;
      apiByKey.set(normalizeMapKey(displayName), splash);
    }

    let patched = false;
    for (const m of ALL_MAPS){
      const remote = apiByKey.get(normalizeMapKey(m.name));
      if (!remote) continue;
      if (!m.imgs.includes(remote)) {
        m.imgs.push(remote);
        patched = true;
      }
    }

    if (patched && engine.state !== "spinning" && engine.state !== "smooth") {
      const selectedKeys = new Set(readEnabledKeys());
      buildMapCheckboxes(selectedKeys);
      rebuildCompMapsFromChecks();
      updateMapChecksNote();
      rebuild();
    }
  } catch (_e) {
    // API取得失敗時はローカル候補 + fallback で動作継続
  }
}

const ALL_MAPS = [
  { key: "abyss",    name: "Abyss",    imgs: buildImageCandidates("abyss") },
  { key: "ascent",   name: "Ascent",   imgs: buildImageCandidates("ascent") },
  { key: "bind",     name: "Bind",     imgs: buildImageCandidates("bind") },
  { key: "breeze",   name: "Breeze",   imgs: buildImageCandidates("breeze") },
  { key: "corrode",  name: "Corrode",  imgs: buildImageCandidates("corrode") },
  { key: "fracture", name: "Fracture", imgs: buildImageCandidates("fracture") },
  { key: "haven",    name: "Haven",    imgs: buildImageCandidates("haven") },
  { key: "icebox",   name: "Icebox",   imgs: buildImageCandidates("icebox") },
  { key: "lotus",    name: "Lotus",    imgs: buildImageCandidates("lotus") },
  { key: "pearl",    name: "Pearl",    imgs: buildImageCandidates("pearl") },
  { key: "split",    name: "Split",    imgs: buildImageCandidates("split") },
  { key: "sunset",   name: "Sunset",   imgs: buildImageCandidates("sunset") },
];

const DEFAULT_ENABLED_KEYS = new Set([
  "breeze", "bind", "haven", "split", "abyss", "pearl", "corrode"
]);

const spinBtn = document.getElementById("spinBtn");
const stopBtn = document.getElementById("stopBtn");
const settingsDetails = document.querySelector(".settings");
const controlsEl = document.querySelector(".controls");
const presetButtons = Array.from(document.querySelectorAll("#speedPresets [data-preset]"));

const windowEl = document.querySelector(".window");
const reelEl = windowEl.querySelector(".reel");

const mapChecks = document.getElementById("mapChecks");
const mapChecksNote = document.getElementById("mapChecksNote");
const resultFinal = document.querySelector(".results .final");

let currentPresetKey = "normal";
let COMP_MAPS = [];

const engine = {
  state: "idle",
  rafId: null,
  lastNow: null,
  offsetY: 0,
  speed: SPEED_PRESETS.normal.speedPx,
  smooth: { startT: 0, endT: 0, startY: 0, endY: 0 },
  targetIndex: 0,
};

function getActivePreset(){
  return SPEED_PRESETS[currentPresetKey] ?? SPEED_PRESETS.normal;
}

function setPreset(nextKey){
  if (!SPEED_PRESETS[nextKey]) return;
  const busy = (engine.state === "spinning" || engine.state === "smooth");
  if (busy) return;

  currentPresetKey = nextKey;
  for (const btn of presetButtons){
    const active = btn.dataset.preset === nextKey;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

function readEnabledKeys(){
  const keys = [];
  mapChecks.querySelectorAll('input[type="checkbox"][data-mapkey]').forEach(cb => {
    if (cb.checked) keys.push(cb.dataset.mapkey);
  });
  return keys;
}

function rebuildCompMapsFromChecks(){
  const enabled = new Set(readEnabledKeys());
  COMP_MAPS = ALL_MAPS.filter(m => enabled.has(m.key));
}

function updateMapChecksNote(){
  const n = COMP_MAPS.length;
  mapChecksNote.textContent = n > 0 ? `${n} マップ選択中` : "最低1つ以上のマップを選んでください";

  const busy = (engine.state === "spinning" || engine.state === "smooth");
  spinBtn.disabled = busy ? true : (n === 0);
}

function makeFallback(name){
  const fb = document.createElement("div");
  fb.className = "fallback";
  fb.textContent = name;
  return fb;
}

function buildReel(copies = REEL_COPIES) {
  reelEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (let c = 0; c < copies; c++) {
    for (const m of COMP_MAPS) {
      const item = document.createElement("div");
      item.className = "item";
      item.dataset.name = m.name;

      const candidates = Array.isArray(m.imgs) ? [...m.imgs] : [];
      if (candidates.length > 0) {
        const img = document.createElement("img");
        img.alt = m.name;
        img.loading = "lazy";

        const tryNextImage = () => {
          const next = candidates.shift();
          if (!next) {
            img.remove();
            item.appendChild(makeFallback(m.name));
            return;
          }
          img.src = next;
        };

        img.addEventListener("error", tryNextImage);
        tryNextImage();
        item.appendChild(img);
      } else {
        item.appendChild(makeFallback(m.name));
      }

      frag.appendChild(item);
    }
  }

  reelEl.appendChild(frag);
}

function clearResultEffects(){
  reelEl.classList.remove("has-winner");
  reelEl.querySelectorAll(".item.winner").forEach(item => item.classList.remove("winner"));
}

function applyResultEffects(){
  clearResultEffects();

  const idx = centeredItemIndex();
  const item = reelEl.querySelector(`.item:nth-child(${idx + 1})`);
  if (!item) return;

  reelEl.classList.add("has-winner");
  item.classList.add("winner");
}

function showFinalResult(){
  const name = getCenteredMapName();
  resultFinal.innerHTML = `<span class="label">当選マップ</span><span class="picked">${name}</span>`;
}

function getItemHeightPx() {
  const anyItem = reelEl.querySelector(".item");
  return anyItem ? anyItem.getBoundingClientRect().height : 220;
}

function setOffset(y){
  engine.offsetY = y;
  reelEl.style.transform = `translateY(${-y}px)`;
}

function wrapOffset(){
  const h = getItemHeightPx();
  const totalItems = reelEl.querySelectorAll(".item").length;
  const totalH = totalItems * h;
  const center = Math.floor(totalItems / 2) * h;

  let y = engine.offsetY;
  if (y > totalH - center) y -= center;
  if (y < center * 0.2) y += center;
  setOffset(y);
}

function easeOutCubic(t){
  return 1 - Math.pow(1 - t, 3);
}

function randIndex(){
  return Math.floor(Math.random() * COMP_MAPS.length);
}

function centeredItemIndex(){
  const h = getItemHeightPx();
  const winH = windowEl.getBoundingClientRect().height;
  const center = engine.offsetY + winH / 2;
  return Math.floor(center / h);
}

function toMapIndex(itemIndex){
  const n = COMP_MAPS.length;
  if (n === 0) return 0;
  return ((itemIndex % n) + n) % n;
}

function getCenteredMapName(){
  const n = COMP_MAPS.length;
  if (n === 0) return "—";

  const midItem = centeredItemIndex();
  return COMP_MAPS[toMapIndex(midItem)]?.name ?? "—";
}

function makeStopPlan(targetIndex, decelMs){
  const n = COMP_MAPS.length;
  if (n === 0) return;

  const h = getItemHeightPx();
  const winH = windowEl.getBoundingClientRect().height;
  const centerInWindow = winH / 2;

  const totalItems = reelEl.querySelectorAll(".item").length;
  const nowY = engine.offsetY;
  const currentItem = Math.floor((nowY + centerInWindow) / h);

  let best = null;
  for (let k = 1; k <= totalItems; k++){
    const idx = currentItem + k;
    const mapsIdx = toMapIndex(idx);
    if (mapsIdx === targetIndex) { best = idx; break; }
  }
  if (best == null) best = currentItem + n + targetIndex;

  const EXTRA_LOOPS = 3;
  best += EXTRA_LOOPS * n;

  const targetOffset = (best + 0.5) * h - centerInWindow;

  const nowT = performance.now();
  engine.smooth = {
    startT: nowT,
    endT: nowT + decelMs,
    startY: nowY,
    endY: targetOffset,
  };
  engine.targetIndex = targetIndex;
}

function tick(now){
  if (engine.state === "spinning"){
    const dt = engine.lastNow == null ? 0 : (now - engine.lastNow) / 1000;
    engine.lastNow = now;

    setOffset(engine.offsetY + engine.speed * dt);
    wrapOffset();

    engine.rafId = requestAnimationFrame(tick);
    return;
  }

  if (engine.state === "smooth"){
    const s = engine.smooth;
    const t = (now - s.startT) / (s.endT - s.startT);
    const clamped = Math.min(1, Math.max(0, t));
    const e = easeOutCubic(clamped);

    setOffset(s.startY + (s.endY - s.startY) * e);

    if (clamped >= 1){
      setOffset(s.endY);
      engine.state = "stopped";

      applyResultEffects();
      showFinalResult();

      stopBtn.disabled = true;
      spinBtn.disabled = (COMP_MAPS.length === 0);

      cancelAnimationFrame(engine.rafId);
      engine.rafId = null;
      return;
    }

    engine.rafId = requestAnimationFrame(tick);
  }
}

function makeMapPreview(m){
  const wrap = document.createElement("span");
  wrap.className = "mapCheckThumb";

  const candidates = Array.isArray(m.imgs) ? [...m.imgs] : [];
  if (candidates.length === 0) return wrap;

  const img = document.createElement("img");
  img.alt = `${m.name} preview`;
  img.loading = "lazy";

  const tryNextImage = () => {
    const next = candidates.shift();
    if (!next) {
      img.remove();
      return;
    }
    img.src = next;
  };

  img.addEventListener("error", tryNextImage);
  tryNextImage();
  wrap.appendChild(img);
  return wrap;
}

function buildMapCheckboxes(selectedKeys = null){
  mapChecks.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const m of ALL_MAPS){
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";
    label.style.padding = "8px 10px";
    label.style.border = "1px solid rgba(255,255,255,.12)";
    label.style.borderRadius = "12px";
    label.style.background = "rgba(0,0,0,.18)";
    label.style.cursor = "pointer";
    label.style.userSelect = "none";

    const thumb = makeMapPreview(m);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.mapkey = m.key;
    cb.checked = selectedKeys instanceof Set
      ? selectedKeys.has(m.key)
      : DEFAULT_ENABLED_KEYS.has(m.key);

    const span = document.createElement("span");
    span.textContent = m.name;
    span.style.color = "rgba(255,255,255,.88)";
    span.style.fontWeight = "700";
    span.style.letterSpacing = ".02em";

    cb.addEventListener("change", () => {
      const busy = (engine.state === "spinning" || engine.state === "smooth");
      if (busy){
        cb.checked = !cb.checked;
        return;
      }
      rebuildCompMapsFromChecks();
      updateMapChecksNote();
      rebuild();
    });

    label.appendChild(thumb);
    label.appendChild(cb);
    label.appendChild(span);
    frag.appendChild(label);
  }

  mapChecks.appendChild(frag);
}

function rebuild(){
  if (COMP_MAPS.length === 0) return;

  clearResultEffects();
  buildReel(REEL_COPIES);

  const h = getItemHeightPx();
  const base = Math.floor((REEL_COPIES / 2) * COMP_MAPS.length) * h;
  setOffset(base + h);
}

function startSpin(){
  if (COMP_MAPS.length === 0) return;

  clearResultEffects();
  const preset = getActivePreset();
  engine.speed = preset.speedPx;

  engine.state = "spinning";
  engine.lastNow = null;

  spinBtn.disabled = true;
  stopBtn.disabled = false;

  cancelAnimationFrame(engine.rafId);
  engine.rafId = requestAnimationFrame(tick);
}

function stopSpin(){
  if (engine.state !== "spinning") return;
  if (COMP_MAPS.length === 0) return;

  cancelAnimationFrame(engine.rafId);
  engine.rafId = null;

  const preset = getActivePreset();
  const target = randIndex();

  engine.state = "smooth";
  spinBtn.disabled = true;
  stopBtn.disabled = true;

  makeStopPlan(target, preset.decelMs);

  engine.rafId = requestAnimationFrame(tick);
}

function applyCleanModeIfNeeded(){
  if (parseModeFromUrl() !== "clean") return;
  document.body.classList.add("clean-mode");
  if (settingsDetails) settingsDetails.open = false;
  if (controlsEl) controlsEl.setAttribute("aria-hidden", "true");
}

const hasRequiredDom = Boolean(
  spinBtn && stopBtn && windowEl && reelEl && mapChecks && mapChecksNote && resultFinal
);

if (hasRequiredDom) {
  spinBtn.addEventListener("click", () => {
    const busy = (engine.state === "spinning" || engine.state === "smooth");
    if (busy) return;

    rebuildCompMapsFromChecks();
    updateMapChecksNote();
    rebuild();
    startSpin();
  });

  stopBtn.addEventListener("click", () => stopSpin());

  for (const btn of presetButtons){
    btn.addEventListener("click", () => {
      setPreset(btn.dataset.preset);
    });
  }

  buildMapCheckboxes();
  rebuildCompMapsFromChecks();
  updateMapChecksNote();
  setPreset("normal");
  applyCleanModeIfNeeded();

  if (COMP_MAPS.length > 0) {
    rebuild();
  }

  attachMapImagesFromApi();
} else {
  console.error("初期化に必要なDOMが見つからないため、アプリを開始できませんでした。");
}
