// =====================================================
// VALORANT Map Slot (Single Reel / 3 Rows)
// - 候補は設定のチェックボックスで選択
// - 画像が無くても fallback で動作
// - 減速は smooth のみ（刻み無し）
// - 停止後に二度動かない（endYスナップ + RAF停止 + smooth移行前にRAF停止）
// =====================================================

// 画像探索候補（フォルダ構成が変わってもつながるように複数候補を試す）
const MAP_IMAGE_BASE_DIRS = [
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

// マップ一覧（全マップを選択可能にする）
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

// 指定プール（重複 sunset は Set で1つになります）
const DEFAULT_ENABLED_KEYS = new Set([
  "sunset","bind","haven","split","abyss","sunset","pearl","corrode"
]);

// =====================================================
// DOM
// =====================================================
const pickedName   = document.getElementById("pickedName");
const spinBtn   = document.getElementById("spinBtn");
const stopBtn   = document.getElementById("stopBtn");
const rerollBtn = document.getElementById("rerollBtn");

const decelMsInput = document.getElementById("decelMs");
const speedPxInput = document.getElementById("speedPx");
const copiesInput  = document.getElementById("copies");

const windowEl = document.querySelector(".window");
const reelEl   = windowEl.querySelector(".reel");

const mapChecks = document.getElementById("mapChecks");
const mapChecksNote = document.getElementById("mapChecksNote");

// =====================================================
// 候補マップ（チェック状態から生成）
// =====================================================
let COMP_MAPS = [];

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
  if (n === 0) {
    mapChecksNote.textContent = "最低1つはチェックしてください（候補が0だと回せません）";
  } else if (n === 1) {
    mapChecksNote.textContent = "候補が1つなので常にそれが中央に来ます（上/下も同じになります）";
  } else {
    mapChecksNote.textContent = `候補: ${n} 個`;
  }

  const busy = (engine.state === "spinning" || engine.state === "smooth");
  spinBtn.disabled = busy ? true : (n === 0);
  rerollBtn.disabled = (n === 0);
}

// =====================================================
// リール構築
// =====================================================
function makeFallback(name){
  const fb = document.createElement("div");
  fb.className = "fallback";
  fb.textContent = name;
  return fb;
}

function buildReel(copies = 14) {
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

        // 画像が無い/読み込み失敗 → 次候補を試し、尽きたら fallback
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

function getItemHeightPx() {
  const anyItem = document.querySelector(".item");
  return anyItem ? anyItem.getBoundingClientRect().height : 220;
}

// =====================================================
// エンジン（刻みなし / 停止後に二度動かない）
// =====================================================
const engine = {
  state: "idle", // idle | spinning | smooth | stopped
  rafId: null,
  lastNow: null,
  offsetY: 0,
  speed: 3800,

  smooth: { startT: 0, endT: 0, startY: 0, endY: 0 },
  targetIndex: 0,
};

function setOffset(y){
  engine.offsetY = y;
  reelEl.style.transform = `translateY(${-y}px)`;
}

/**
 * 無限回転用の巻き戻し（spinning中のみ）
 */
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

function clampNum(v, min, max, fallback){
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function readSettings(){
  // ★指定：fallbackを5200に
  const decelMs = clampNum(decelMsInput.value, 1000, 12000, 5200);
  const speedPx = clampNum(speedPxInput.value, 600, 9000, 5200);
  const copies  = clampNum(copiesInput.value, 4, 40, 14);
  return { decelMs, speedPx, copies };
}

function randIndex(){
  return Math.floor(Math.random() * COMP_MAPS.length);
}

// =====================================================
// 3段表示（上・中央・下）
// =====================================================
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
function getTopMidBottomNames(){
  const n = COMP_MAPS.length;
  if (n === 0) return { top:"—", mid:"—", bot:"—" };

  const midItem = centeredItemIndex();
  const topItem = midItem - 1;
  const botItem = midItem + 1;

  const top = COMP_MAPS[toMapIndex(topItem)]?.name ?? "—";
  const mid = COMP_MAPS[toMapIndex(midItem)]?.name ?? "—";
  const bot = COMP_MAPS[toMapIndex(botItem)]?.name ?? "—";
  return { top, mid, bot };
}
function renderTopMidBottom(){
  const { mid } = getTopMidBottomNames();
  pickedName.textContent = mid; // 最終決定は中央
}

function clearResults(){
  pickedName.textContent = "—";
}

// =====================================================
// 停止プラン（滑らか減速のみ）
// =====================================================
function makeStopPlan(targetIndex, decelMs){
  const n = COMP_MAPS.length;
  if (n === 0) return;

  const h = getItemHeightPx();
  const winH = windowEl.getBoundingClientRect().height;
  const centerInWindow = winH / 2;

  const totalItems = reelEl.querySelectorAll(".item").length;
  const nowY = engine.offsetY;
  const currentItem = Math.floor((nowY + centerInWindow) / h);

  // いまより先で targetIndex が中央に来る最初の itemIndex
  let best = null;
  for (let k = 1; k <= totalItems; k++){
    const idx = currentItem + k;
    const mapsIdx = toMapIndex(idx);
    if (mapsIdx === targetIndex) { best = idx; break; }
  }
  if (best == null) best = currentItem + n + targetIndex;

  // 停止まで長く（好みで調整）
  const EXTRA_LOOPS = 3; // 2〜4推奨
  best += EXTRA_LOOPS * n;

  // item中心をwindow中心に合わせる
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

// =====================================================
// tick
// =====================================================
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
      // ★重要：必ず endY にスナップ → “停止後に2回目動く” を防ぐ
      setOffset(s.endY);

      engine.state = "stopped";
      renderTopMidBottom();

      stopBtn.disabled = true;
      spinBtn.disabled = (COMP_MAPS.length === 0);

      cancelAnimationFrame(engine.rafId);
      engine.rafId = null;
      return;
    }

    engine.rafId = requestAnimationFrame(tick);
    return;
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

// =====================================================
// UI：チェックボックス生成
// =====================================================
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
    if (selectedKeys instanceof Set) {
      cb.checked = selectedKeys.has(m.key);
    } else {
      cb.checked = DEFAULT_ENABLED_KEYS.has(m.key);
    }

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

// =====================================================
// 組み立て
// =====================================================
function rebuild(){
  if (COMP_MAPS.length === 0) return;

  const { copies } = readSettings();
  buildReel(copies);

  // 初期位置を真ん中付近に
  const h = getItemHeightPx();
  const base = Math.floor((copies / 2) * COMP_MAPS.length) * h;
  setOffset(base + h);

  renderTopMidBottom();
}

function startSpin(){
  if (COMP_MAPS.length === 0) return;

  const { speedPx } = readSettings();
  engine.speed = speedPx;

  clearResults();

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

  // ★回転中のrafを止めてから減速へ
  cancelAnimationFrame(engine.rafId);
  engine.rafId = null;

  const { decelMs } = readSettings();
  const target = randIndex();

  engine.state = "smooth";
  spinBtn.disabled = true;
  stopBtn.disabled = true;

  makeStopPlan(target, decelMs);

  engine.rafId = requestAnimationFrame(tick);
}

function instantPick(){
  if (COMP_MAPS.length === 0) return;

  clearResults();

  const midIdx = randIndex();
  pickedName.textContent = COMP_MAPS[midIdx]?.name ?? "—";

  engine.state = "stopped";
  stopBtn.disabled = true;
  spinBtn.disabled = (COMP_MAPS.length === 0);

  cancelAnimationFrame(engine.rafId);
  engine.rafId = null;
}

// =====================================================
// Events
// =====================================================
spinBtn.addEventListener("click", () => {
  const busy = (engine.state === "spinning" || engine.state === "smooth");
  if (busy) return;

  rebuildCompMapsFromChecks();
  updateMapChecksNote();
  rebuild();
  startSpin();
});

stopBtn.addEventListener("click", () => stopSpin());
rerollBtn.addEventListener("click", () => instantPick());

[copiesInput, decelMsInput, speedPxInput].forEach(el => {
  el.addEventListener("change", () => {
    const busy = (engine.state === "spinning" || engine.state === "smooth");
    if (busy) return;

    rebuildCompMapsFromChecks();
    updateMapChecksNote();
    rebuild();
  });
});

// =====================================================
// init
// =====================================================
buildMapCheckboxes();
rebuildCompMapsFromChecks();
updateMapChecksNote();

if (COMP_MAPS.length > 0) {
  rebuild();
} else {
  clearResults();
}

attachMapImagesFromApi();
