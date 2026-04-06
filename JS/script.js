// =====================================================
// VALORANT Map / Agent Slot
// =====================================================

const VALORANT_MAPS_API = "https://valorant-api.com/v1/maps?language=en-US";

function buildImageCandidates(folder, key, keepCase = false){
  const files = keepCase ? [key] : [key, key.toLowerCase()];
  const seen = new Set();
  const candidates = [];

  for (const name of files){
    const path = `./image/png/${folder}/${name}.png`;
    if (seen.has(path)) continue;
    seen.add(path);
    candidates.push(path);
  }
  return candidates;
}

function normalizeMapKey(name = ""){
  return name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z]/g, "");
}

function clampNum(v, min, max, fallback){
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function easeOutCubic(t){
  return 1 - Math.pow(1 - t, 3);
}

function shuffle(array){
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeFallback(name){
  const fb = document.createElement("div");
  fb.className = "fallback";
  fb.textContent = name;
  return fb;
}

function createThumb(className, item, fit = "contain"){
  const wrap = document.createElement("span");
  wrap.className = className;

  const candidates = Array.isArray(item.imgs) ? [...item.imgs] : [];
  if (candidates.length === 0) return wrap;

  const img = document.createElement("img");
  img.alt = `${item.name} preview`;
  img.loading = "lazy";
  img.style.objectFit = fit;

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

const ALL_MAPS = [
  { key: "abyss",    name: "Abyss",    imgs: buildImageCandidates("Maps", "abyss") },
  { key: "ascent",   name: "Ascent",   imgs: buildImageCandidates("Maps", "ascent") },
  { key: "bind",     name: "Bind",     imgs: buildImageCandidates("Maps", "bind") },
  { key: "breeze",   name: "Breeze",   imgs: buildImageCandidates("Maps", "breeze") },
  { key: "corrode",  name: "Corrode",  imgs: buildImageCandidates("Maps", "corrode") },
  { key: "fracture", name: "Fracture", imgs: buildImageCandidates("Maps", "fracture") },
  { key: "haven",    name: "Haven",    imgs: buildImageCandidates("Maps", "haven") },
  { key: "icebox",   name: "Icebox",   imgs: buildImageCandidates("Maps", "icebox") },
  { key: "lotus",    name: "Lotus",    imgs: buildImageCandidates("Maps", "lotus") },
  { key: "pearl",    name: "Pearl",    imgs: buildImageCandidates("Maps", "pearl") },
  { key: "split",    name: "Split",    imgs: buildImageCandidates("Maps", "split") },
  { key: "sunset",   name: "Sunset",   imgs: buildImageCandidates("Maps", "sunset") },
];

const DEFAULT_MAP_KEYS = new Set([
  "breeze","bind","haven","split","lotus","pearl","fracture"
]);

const ALL_AGENTS = [
  { key: "brimstone", name: "Brimstone", role: "controller", imgs: buildImageCandidates("Agents", "Brimstone", true) },
  { key: "viper", name: "Viper", role: "controller", imgs: buildImageCandidates("Agents", "Viper", true) },
  { key: "omen", name: "Omen", role: "controller", imgs: buildImageCandidates("Agents", "Omen", true) },
  { key: "astra", name: "Astra", role: "controller", imgs: buildImageCandidates("Agents", "Astra", true) },
  { key: "harbor", name: "Harbor", role: "controller", imgs: buildImageCandidates("Agents", "Harbor", true) },
  { key: "clove", name: "Clove", role: "controller", imgs: buildImageCandidates("Agents", "Clove", true) },
  { key: "miks", name: "Miks", role: "controller", imgs: buildImageCandidates("Agents", "Miks", true) },

  { key: "sova", name: "Sova", role: "initiator", imgs: buildImageCandidates("Agents", "Sova", true) },
  { key: "breach", name: "Breach", role: "initiator", imgs: buildImageCandidates("Agents", "Breach", true) },
  { key: "skye", name: "Skye", role: "initiator", imgs: buildImageCandidates("Agents", "Skye", true) },
  { key: "kayo", name: "Kayo", role: "initiator", imgs: buildImageCandidates("Agents", "Kayo", true) },
  { key: "fade", name: "Fade", role: "initiator", imgs: buildImageCandidates("Agents", "Fade", true) },
  { key: "gekko", name: "Gekko", role: "initiator", imgs: buildImageCandidates("Agents", "Gekko", true) },
  { key: "tejo", name: "Tejo", role: "initiator", imgs: buildImageCandidates("Agents", "Tejo", true) },

  { key: "killjoy", name: "Killjoy", role: "sentinel", imgs: buildImageCandidates("Agents", "Killjoy", true) },
  { key: "cypher", name: "Cypher", role: "sentinel", imgs: buildImageCandidates("Agents", "Cypher", true) },
  { key: "sage", name: "Sage", role: "sentinel", imgs: buildImageCandidates("Agents", "Sage", true) },
  { key: "chamber", name: "Chamber", role: "sentinel", imgs: buildImageCandidates("Agents", "Chamber", true) },
  { key: "deadlock", name: "Deadlock", role: "sentinel", imgs: buildImageCandidates("Agents", "Deadlock", true) },
  { key: "vyse", name: "Vyse", role: "sentinel", imgs: buildImageCandidates("Agents", "Vyse", true) },
  { key: "veto", name: "Veto", role: "sentinel", imgs: buildImageCandidates("Agents", "Veto", true) },

  { key: "jett", name: "Jett", role: "duelist", imgs: buildImageCandidates("Agents", "Jett", true) },
  { key: "phoenix", name: "Phoenix", role: "duelist", imgs: buildImageCandidates("Agents", "Phoenix", true) },
  { key: "reyna", name: "Reyna", role: "duelist", imgs: buildImageCandidates("Agents", "Reyna", true) },
  { key: "raze", name: "Raze", role: "duelist", imgs: buildImageCandidates("Agents", "Raze", true) },
  { key: "yoru", name: "Yoru", role: "duelist", imgs: buildImageCandidates("Agents", "Yoru", true) },
  { key: "neon", name: "Neon", role: "duelist", imgs: buildImageCandidates("Agents", "Neon", true) },
  { key: "iso", name: "Iso", role: "duelist", imgs: buildImageCandidates("Agents", "Iso", true) },
  { key: "waylay", name: "Waylay", role: "duelist", imgs: buildImageCandidates("Agents", "Waylay", true) },
];

const ROLE_META = [
  { key: "duelist",     label: "デュエリスト" },
  { key: "initiator",   label: "イニシエーター" },
  { key: "controller",  label: "スモーク" },
  { key: "sentinel",    label: "センチネル" },
];

const DEFAULT_AGENT_KEYS = new Set(ALL_AGENTS.map(a => a.key));
const DEFAULT_ROLE_KEYS = new Set(ROLE_META.map(r => r.key));

function createSlotApp(options){
  const {
    allItems,
    defaultEnabledKeys,
    spinBtn,
    stopBtn,
    decelMsInput,
    speedPxInput,
    copiesInput,
    windowEl,

    noteEl,
    buildChecks,
    getSourceItems,
    onAfterSelectionChange,
  } = options;

  const reelEl = windowEl.querySelector(".reel");

  const engine = {
    state: "idle",
    rafId: null,
    lastNow: null,
    offsetY: 0,
    speed: 3800,
    smooth: { startT: 0, endT: 0, startY: 0, endY: 0 },
    targetIndex: 0,
  };

  let activeItems = [];

  function getItemHeightPx(){
    const anyItem = windowEl.querySelector(".item");
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

  function readSettings(){
    return {
      decelMs: clampNum(decelMsInput.value, 1000, 12000, 5200),
      speedPx: clampNum(speedPxInput.value, 600, 9000, 5200),
      copies: clampNum(copiesInput.value, 4, 40, 14),
    };
  }

  function toActiveIndex(itemIndex){
    const n = activeItems.length;
    if (n === 0) return 0;
    return ((itemIndex % n) + n) % n;
  }

  function randIndex(){
    return Math.floor(Math.random() * activeItems.length);
  }

  function updateNote(){
    const n = activeItems.length;
    noteEl.textContent = n > 0 ? `${n}件選択中` : "候補がありません";
    const busy = (engine.state === "spinning" || engine.state === "smooth");
    spinBtn.disabled = busy ? true : (n === 0);
  }

  function buildReel(copies = 14){
    reelEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (let c = 0; c < copies; c++){
      for (const itemData of activeItems){
        const item = document.createElement("div");
        item.className = "item";
        item.dataset.name = itemData.name;

        const candidates = Array.isArray(itemData.imgs) ? [...itemData.imgs] : [];
        if (candidates.length > 0){
          const img = document.createElement("img");
          img.alt = itemData.name;
          img.loading = "lazy";

          const tryNextImage = () => {
            const next = candidates.shift();
            if (!next){
              img.remove();
              item.appendChild(makeFallback(itemData.name));
              return;
            }
            img.src = next;
          };

          img.addEventListener("error", tryNextImage);
          tryNextImage();
          item.appendChild(img);
        } else {
          item.appendChild(makeFallback(itemData.name));
        }

        frag.appendChild(item);
      }
    }

    reelEl.appendChild(frag);
  }

  function rebuildItems(){
    activeItems = getSourceItems();
  }

  function rebuild(){
    rebuildItems();
    if (activeItems.length === 0){
      reelEl.innerHTML = "";
      updateNote();
      return;
    }

    const { copies } = readSettings();
    buildReel(copies);

    const h = getItemHeightPx();
    const base = Math.floor((copies / 2) * activeItems.length) * h;
    setOffset(base + h);
    updateNote();
  }

  function makeStopPlan(targetIndex, decelMs){
    const n = activeItems.length;
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
      const loopIdx = toActiveIndex(idx);
      if (loopIdx === targetIndex){
        best = idx;
        break;
      }
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

        stopBtn.disabled = true;
        spinBtn.disabled = (activeItems.length === 0);

        cancelAnimationFrame(engine.rafId);
        engine.rafId = null;
        return;
      }

      engine.rafId = requestAnimationFrame(tick);
    }
  }

  function startSpin(){
    if (activeItems.length === 0) return;

    const { speedPx } = readSettings();
    engine.speed = speedPx;
    engine.state = "spinning";
    engine.lastNow = null;

    spinBtn.disabled = true;
    stopBtn.disabled = false;

    cancelAnimationFrame(engine.rafId);
    engine.rafId = requestAnimationFrame(tick);
  }

  function stopSpin(){
    if (engine.state !== "spinning") return;
    if (activeItems.length === 0) return;

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

  function isBusy(){
    return engine.state === "spinning" || engine.state === "smooth";
  }

  function onSettingChanged(){
    if (isBusy()) return;
    rebuild();
  }

  spinBtn.addEventListener("click", () => {
    if (isBusy()) return;
    rebuild();
    startSpin();
  });

  stopBtn.addEventListener("click", stopSpin);
  [copiesInput, decelMsInput, speedPxInput].forEach(el => {
    el.addEventListener("change", onSettingChanged);
  });

  buildChecks({
    allItems,
    defaultEnabledKeys,
    isBusy,
    onChanged: () => {
      if (onAfterSelectionChange) onAfterSelectionChange();
      rebuild();
    }
  });

  function resetAgentSettings(){
    if (agentApp?.isBusy?.()) return;

    document.querySelectorAll('#agentRoleChecks input[type="checkbox"][data-rolekey]').forEach(cb => {
      cb.checked = DEFAULT_ROLE_KEYS.has(cb.dataset.rolekey);
    });

    document.querySelectorAll('#agentChecks input[type="checkbox"][data-agentkey]').forEach(cb => {
      cb.checked = DEFAULT_AGENT_KEYS.has(cb.dataset.agentkey);
    });

    const agentDecelMs = document.getElementById("agentDecelMs");
    const agentSpeedPx = document.getElementById("agentSpeedPx");
    const agentCopies  = document.getElementById("agentCopies");

    if (agentDecelMs) agentDecelMs.value = 5200;
    if (agentSpeedPx) agentSpeedPx.value = 5200;
    if (agentCopies)  agentCopies.value = 14;

    refreshAgentCheckVisibility();
    agentApp?.rebuild();
  }

  rebuild();

  return {
    rebuild,
    isBusy,
  };
}

let mapApp = null;

function buildMapChecks({ allItems, defaultEnabledKeys, isBusy, onChanged }){
  const mapChecks = document.getElementById("mapChecks");
  mapChecks.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const m of allItems){
    const label = document.createElement("label");
    label.className = "checkItem";

    const thumb = createThumb("mapCheckThumb", m, "cover");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.mapkey = m.key;
    cb.checked = defaultEnabledKeys.has(m.key);

    const span = document.createElement("span");
    span.className = "checkText";
    span.textContent = m.name;

    cb.addEventListener("change", () => {
      if (isBusy()){
        cb.checked = !cb.checked;
        return;
      }
      onChanged();
    });

    label.appendChild(thumb);
    label.appendChild(cb);
    label.appendChild(span);
    frag.appendChild(label);
  }

  mapChecks.appendChild(frag);
}

function getSelectedMapItems(){
  const enabled = [];
  document.querySelectorAll('#mapChecks input[type="checkbox"][data-mapkey]').forEach(cb => {
    if (!cb.checked) return;
    const found = ALL_MAPS.find(m => m.key === cb.dataset.mapkey);
    if (found) enabled.push(found);
  });
  return enabled;
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
      if (!m.imgs.includes(remote)){
        m.imgs.push(remote);
        patched = true;
      }
    }

    if (patched && mapApp && !mapApp.isBusy()){
      mapApp.rebuild();
    }
  } catch (e) {}
}

function buildRoleChecks({ isBusy, onChanged }){
  const wrap = document.getElementById("agentRoleChecks");
  wrap.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const role of ROLE_META){
    const label = document.createElement("label");
    label.className = "roleChip";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.rolekey = role.key;
    cb.checked = DEFAULT_ROLE_KEYS.has(role.key);

    const span = document.createElement("span");
    span.textContent = role.label;

    cb.addEventListener("change", () => {
      if (isBusy()){
        cb.checked = !cb.checked;
        return;
      }
      onChanged();
    });

    label.appendChild(cb);
    label.appendChild(span);
    frag.appendChild(label);
  }

  wrap.appendChild(frag);
}

function buildAgentChecks({ allItems, defaultEnabledKeys, isBusy, onChanged }){
  const agentChecks = document.getElementById("agentChecks");
  agentChecks.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const agent of shuffle(allItems)){
    const label = document.createElement("label");
    label.className = "checkItem";

    const thumb = createThumb("agentCheckThumb", agent, "contain");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.agentkey = agent.key;
    cb.checked = defaultEnabledKeys.has(agent.key);

    const textWrap = document.createElement("div");

    const name = document.createElement("div");
    name.className = "checkText";
    name.textContent = agent.name;

    const role = document.createElement("div");
    role.className = "checksNote";
    role.style.marginTop = "2px";
    role.textContent = ROLE_META.find(r => r.key === agent.role)?.label ?? agent.role;

    textWrap.appendChild(name);
    textWrap.appendChild(role);

    cb.addEventListener("change", () => {
      if (isBusy()){
        cb.checked = !cb.checked;
        return;
      }
      onChanged();
    });

    label.appendChild(thumb);
    label.appendChild(cb);
    label.appendChild(textWrap);
    frag.appendChild(label);
  }

  agentChecks.appendChild(frag);
}

function getEnabledRoleKeys(){
  const keys = [];
  document.querySelectorAll('#agentRoleChecks input[type="checkbox"][data-rolekey]').forEach(cb => {
    if (cb.checked) keys.push(cb.dataset.rolekey);
  });
  return new Set(keys);
}

function refreshAgentCheckVisibility(){
  const enabledRoles = getEnabledRoleKeys();

  document.querySelectorAll('#agentChecks input[type="checkbox"][data-agentkey]').forEach(cb => {
    const key = cb.dataset.agentkey;
    const agent = ALL_AGENTS.find(a => a.key === key);
    const label = cb.closest(".checkItem");
    if (!agent || !label) return;

    const visible = enabledRoles.has(agent.role);
    label.style.display = visible ? "flex" : "none";
  });
}

function getSelectedAgentItems(){
  const enabledRoles = getEnabledRoleKeys();
  const selected = [];

  document.querySelectorAll('#agentChecks input[type="checkbox"][data-agentkey]').forEach(cb => {
    if (!cb.checked) return;
    const agent = ALL_AGENTS.find(a => a.key === cb.dataset.agentkey);
    if (!agent) return;
    if (!enabledRoles.has(agent.role)) return;
    selected.push(agent);
  });

  return shuffle(selected);
}

const menuBtn = document.getElementById("menuBtn");
const drawer = document.getElementById("drawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const drawerCloseBtn = document.getElementById("drawerCloseBtn");
const drawerLinks = [...document.querySelectorAll(".drawerLink")];
const pages = [...document.querySelectorAll(".page")];

function openDrawer(){
  drawer.classList.add("open");
  drawerBackdrop.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer(){
  drawer.classList.remove("open");
  drawerBackdrop.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function activatePage(pageId){
  pages.forEach(page => {
    page.classList.toggle("is-active", page.id === pageId);
  });

  drawerLinks.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pageTarget === pageId);
  });

  closeDrawer();
}

menuBtn.addEventListener("click", openDrawer);
drawerCloseBtn.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

drawerLinks.forEach(btn => {
  btn.addEventListener("click", () => activatePage(btn.dataset.pageTarget));
});

buildRoleChecks({
  isBusy: () => agentApp?.isBusy?.() ?? false,
  onChanged: () => {
    refreshAgentCheckVisibility();
    agentApp?.rebuild();
  }
});

let agentApp = createSlotApp({
  allItems: ALL_AGENTS,
  defaultEnabledKeys: DEFAULT_AGENT_KEYS,
  spinBtn: document.getElementById("agentSpinBtn"),
  stopBtn: document.getElementById("agentStopBtn"),
  decelMsInput: document.getElementById("agentDecelMs"),
  speedPxInput: document.getElementById("agentSpeedPx"),
  copiesInput: document.getElementById("agentCopies"),
  windowEl: document.querySelector('#agentPage .window'),
  noteEl: document.getElementById("agentChecksNote"),
  buildChecks: buildAgentChecks,
  getSourceItems: getSelectedAgentItems,
  onAfterSelectionChange: refreshAgentCheckVisibility,
});

mapApp = createSlotApp({
  allItems: ALL_MAPS,
  defaultEnabledKeys: DEFAULT_MAP_KEYS,
  spinBtn: document.getElementById("mapSpinBtn"),
  stopBtn: document.getElementById("mapStopBtn"),
  decelMsInput: document.getElementById("mapDecelMs"),
  speedPxInput: document.getElementById("mapSpeedPx"),
  copiesInput: document.getElementById("mapCopies"),
  windowEl: document.querySelector('#mapPage .window'),
  noteEl: document.getElementById("mapChecksNote"),
  buildChecks: buildMapChecks,
  getSourceItems: getSelectedMapItems,
});

refreshAgentCheckVisibility();
agentApp.rebuild();
mapApp.rebuild();
attachMapImagesFromApi();