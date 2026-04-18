import { SOUNDS } from './sounds.js';

const STORAGE_KEY = 'miso:settings:v1';
const AUDIO_DIR = 'audio/';
const MIN_INTERVAL_SEC = 0;

const ICON_PLAY = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`;
const ICON_SPIN = `<svg viewBox="0 0 24 24"><path opacity=".25" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3a7 7 0 110 14 7 7 0 010-14z"/><path d="M12 2a10 10 0 0110 10h-3a7 7 0 00-7-7V2z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/></path></svg>`;

const defaultState = () => {
  const enabled = {};
  const weights = {};
  for (const s of SOUNDS) {
    enabled[s.file] = s.defaultEnabled;
    weights[s.file] = 1;
  }
  return {
    enabled,
    weights,
    ignoreWeights: false,
    equalCategories: false,
    averageInterval: 30,
    variability: 40,
    sessionMinutes: 10,
    noLimit: false,
    volume: 0.5,
  };
};

function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    // Drop any saved keys for files that are no longer in the library
    const validFiles = new Set(SOUNDS.map(s => s.file));
    const enabled = { ...base.enabled };
    const weights = { ...base.weights };
    if (saved.enabled) {
      for (const [k, v] of Object.entries(saved.enabled)) {
        if (validFiles.has(k)) enabled[k] = v;
      }
    }
    if (saved.weights) {
      for (const [k, v] of Object.entries(saved.weights)) {
        if (validFiles.has(k)) weights[k] = v;
      }
    }
    return { ...base, ...saved, enabled, weights };
  } catch {
    return base;
  }
}

let saveTimer = null;
function saveState(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, 250);
}

/* ---------------- DOM references ---------------- */
const el = {
  playBtn: document.getElementById('playBtn'),
  skipBtn: document.getElementById('skipBtn'),
  playBtnIcon: document.getElementById('playBtnIcon'),
  playStatus: document.getElementById('play-status'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeValue: document.getElementById('volumeValue'),
  avgInterval: document.getElementById('avgInterval'),
  avgIntervalNum: document.getElementById('avgIntervalNum'),
  variability: document.getElementById('variability'),
  variabilityNum: document.getElementById('variabilityNum'),
  sessionMinutes: document.getElementById('sessionMinutes'),
  sessionMinutesNum: document.getElementById('sessionMinutesNum'),
  noLimit: document.getElementById('noLimit'),
  soundList: document.getElementById('soundList'),
  soundsBadge: document.getElementById('soundsBadge'),
  advanced: document.querySelector('.advanced'),
  ignoreWeights: document.getElementById('ignoreWeights'),
  equalCategories: document.getElementById('equalCategories'),
};

const state = loadState();

/* ---------------- Audio plumbing ---------------- */
let audioCtx = null;
let gainNode = null;
const buffers = new Map();
let loadPromise = null;
let currentPreview = null; // { file, src, btn, endHandler }

function ensureAudioCtx() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = state.volume;
  gainNode.connect(audioCtx.destination);
}

async function loadAllBuffers() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    ensureAudioCtx();
    await Promise.all(SOUNDS.map(async (s) => {
      try {
        const res = await fetch(AUDIO_DIR + s.file);
        if (!res.ok) throw new Error(`fetch ${s.file} -> ${res.status}`);
        const ab = await res.arrayBuffer();
        const buf = await audioCtx.decodeAudioData(ab);
        buffers.set(s.file, buf);
      } catch (err) {
        console.warn('Failed to load', s.file, err);
      }
    }));
  })();
  return loadPromise;
}

/* ---------------- Randomness ---------------- */
function sampleGaussian(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * std + mean;
}

function sampleInterval() {
  const mean = state.averageInterval;
  const sigma = (state.variability / 100) * mean;
  if (sigma <= 0) return Math.max(MIN_INTERVAL_SEC, mean);
  return Math.max(MIN_INTERVAL_SEC, sampleGaussian(mean, sigma));
}

function pickUnweighted(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickWeighted(items) {
  let total = 0;
  for (const s of items) total += Math.max(0, state.weights[s.file] || 0);
  if (total <= 0) return pickUnweighted(items);
  let r = Math.random() * total;
  for (const s of items) {
    const w = Math.max(0, state.weights[s.file] || 0);
    if (r < w) return s;
    r -= w;
  }
  return items[items.length - 1];
}

function weightedPick(items) {
  if (items.length === 0) return null;

  let pool = items;

  if (state.equalCategories) {
    // First pick a category at random (each category equally likely)
    const cats = [...new Set(items.map(s => s.category))];
    const cat = cats[Math.floor(Math.random() * cats.length)];
    pool = items.filter(s => s.category === cat);
  }

  return state.ignoreWeights ? pickUnweighted(pool) : pickWeighted(pool);
}

/* ---------------- Scheduler ---------------- */
let session = null;

function stopSession(statusText) {
  if (!session) return;
  clearTimeout(session.nextTimer);
  clearInterval(session.countdownTimer);
  if (session.currentSource) { try { session.currentSource.stop(); } catch {} }
  clearPlayingRow();
  session = null;
  setSkipVisible(false);
  el.playBtn.classList.remove('is-playing', 'is-firing');
  el.playBtnIcon.innerHTML = ICON_PLAY;
  el.playBtn.setAttribute('aria-label', 'Start session');
  el.playStatus.textContent = statusText || 'Ready. Press play to start.';
}

function markPlayingRow(file) {
  clearPlayingRow();
  if (!file) return;
  const row = el.soundList.querySelector(`.sound-row[data-file="${CSS.escape(file)}"]`);
  if (row) row.classList.add('is-playing');
}
function clearPlayingRow() {
  for (const row of el.soundList.querySelectorAll('.sound-row.is-playing')) {
    row.classList.remove('is-playing');
  }
}

function setSkipVisible(visible) {
  el.skipBtn.hidden = !visible;
}

function setStatusWaiting() {
  if (!session) return;
  const nextInSec = Math.max(0, Math.round((session.nextFireAt - Date.now()) / 1000));
  const remainStr = state.noLimit ? '' : ` · ${fmtTime(Math.max(0, session.endTime - Date.now()))} left`;
  el.playStatus.innerHTML = `Waiting&hellip; next in ${nextInSec}s${remainStr}`;
}

function setStatusPlaying(name) {
  if (!session) return;
  const remainStr = state.noLimit ? '' : ` · ${fmtTime(Math.max(0, session.endTime - Date.now()))} left`;
  el.playStatus.innerHTML = `Playing <strong>${escapeHtml(stemOf(name))}</strong>${remainStr}`;
}

function fmtTime(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function stemOf(file) { return file.replace(/\.mp3$/, ''); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function activeSounds() {
  return SOUNDS.filter(s => state.enabled[s.file] && buffers.has(s.file));
}

function playAndSchedule() {
  if (!session) return;

  const active = activeSounds();
  if (active.length === 0) {
    stopSession('No sounds enabled. Turn on at least one sound to run a session.');
    return;
  }

  const pick = weightedPick(active);
  if (!pick) return;

  const buf = buffers.get(pick.file);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(gainNode);
  src.start();
  session.currentSource = src;
  session.currentFile = pick.file;

  el.playBtn.classList.remove('is-firing');
  void el.playBtn.offsetWidth;
  el.playBtn.classList.add('is-firing');
  markPlayingRow(pick.file);
  setStatusPlaying(pick.file);
  setSkipVisible(true);

  const clipMs = buf.duration * 1000;
  const intervalSec = sampleInterval();
  const delay = clipMs + intervalSec * 1000;
  session.nextFireAt = Date.now() + delay;

  if (!state.noLimit && session.nextFireAt > session.endTime) {
    session.nextTimer = setTimeout(
      () => stopSession('Session complete.'),
      Math.max(clipMs + 50, session.endTime - Date.now())
    );
    return;
  }

  src.onended = () => {
    if (!session || session.currentSource !== src) return;
    clearPlayingRow();
    session.currentFile = null;
    setSkipVisible(false);
    setStatusWaiting();
  };

  session.nextTimer = setTimeout(playAndSchedule, delay);
}

async function startSession() {
  if (session) return;

  el.playBtn.disabled = true;
  el.playStatus.textContent = 'Loading sounds…';
  el.playBtnIcon.innerHTML = ICON_SPIN;

  try { await loadAllBuffers(); } catch (err) { console.error(err); }
  if (audioCtx && audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch {}
  }

  el.playBtn.disabled = false;

  const active = activeSounds();
  if (active.length === 0) {
    el.playBtnIcon.innerHTML = ICON_PLAY;
    el.playStatus.textContent = 'No sounds enabled. Turn on at least one sound first.';
    return;
  }

  const sessMs = state.noLimit ? Infinity : state.sessionMinutes * 60 * 1000;
  session = {
    endTime: state.noLimit ? Infinity : Date.now() + sessMs,
    nextFireAt: Date.now(),
    nextTimer: null,
    currentSource: null,
    currentFile: null,
    countdownTimer: setInterval(() => {
      if (!session) return;
      if (!session.currentFile) setStatusWaiting();
      else setStatusPlaying(session.currentFile);
      if (!state.noLimit && Date.now() >= session.endTime) {
        stopSession('Session complete.');
      }
    }, 1000),
  };

  el.playBtn.classList.add('is-playing');
  el.playBtnIcon.innerHTML = ICON_STOP;
  el.playBtn.setAttribute('aria-label', 'Stop session');
  playAndSchedule();
}

/* ---------------- Preview (toggle) ---------------- */
function stopPreview() {
  if (!currentPreview) return;
  try { currentPreview.src.stop(); } catch {}
  currentPreview.btn.innerHTML = ICON_PLAY;
  currentPreview.btn.classList.remove('is-playing');
  currentPreview.btn.setAttribute('aria-label', `Preview ${stemOf(currentPreview.file)}`);
  currentPreview = null;
}

async function togglePreview(file, btn) {
  if (currentPreview && currentPreview.file === file) {
    stopPreview();
    return;
  }
  if (currentPreview) stopPreview();

  try { await loadAllBuffers(); } catch {}
  const buf = buffers.get(file);
  if (!buf || !audioCtx) return;

  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch {}
  }

  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(gainNode);
  src.start();

  btn.innerHTML = ICON_STOP;
  btn.classList.add('is-playing');
  btn.setAttribute('aria-label', `Stop ${stemOf(file)} preview`);

  currentPreview = { file, src, btn };
  src.onended = () => {
    if (currentPreview && currentPreview.src === src) stopPreview();
  };
}

/* ---------------- UI rendering ---------------- */
function byCategory() {
  const map = new Map();
  for (const s of SOUNDS) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category).push(s);
  }
  return map;
}
function prettyCategory(c) { return c.replace(/_/g, ' '); }

function renderSoundList() {
  el.soundList.innerHTML = '';
  for (const [cat, items] of byCategory()) {
    const enabledCount = items.filter(s => state.enabled[s.file]).length;
    const group = document.createElement('details');
    group.className = 'category-group';

    const summary = document.createElement('summary');
    summary.innerHTML = `
      <span class="category-caret" aria-hidden="true"></span>
      <input type="checkbox" class="category-toggle" aria-label="Toggle all ${escapeHtml(prettyCategory(cat))}">
      <span class="category-title">${escapeHtml(prettyCategory(cat))}</span>
      <span class="category-count" data-role="count"></span>
    `;
    group.appendChild(summary);

    const catToggle = summary.querySelector('.category-toggle');
    catToggle.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    catToggle.addEventListener('change', () => {
      const allOn = items.every(s => state.enabled[s.file]);
      const newVal = !allOn;
      for (const s of items) {
        state.enabled[s.file] = newVal;
        const row = group.querySelector(`.sound-row[data-file="${CSS.escape(s.file)}"] input[type=checkbox]`);
        if (row) row.checked = newVal;
      }
      updateCategoryCount(group, items);
      updateBadge();
      saveState(state);
    });

    for (const s of items) {
      const row = document.createElement('div');
      row.className = 'sound-row';
      row.dataset.file = s.file;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!state.enabled[s.file];
      cb.addEventListener('change', () => {
        state.enabled[s.file] = cb.checked;
        saveState(state);
        updateBadge();
        updateCategoryCount(group, items);
      });

      const name = document.createElement('span');
      name.className = 'sound-row-name';
      name.textContent = stemOf(s.file);

      const weight = document.createElement('input');
      weight.type = 'number';
      weight.min = '0';
      weight.step = '0.1';
      weight.value = state.weights[s.file] ?? 1;
      weight.className = 'sound-row-weight';
      weight.setAttribute('aria-label', `Weight for ${stemOf(s.file)}`);
      weight.addEventListener('input', () => {
        const v = parseFloat(weight.value);
        state.weights[s.file] = Number.isFinite(v) && v >= 0 ? v : 0;
        saveState(state);
      });

      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'preview-btn';
      preview.innerHTML = ICON_PLAY;
      preview.title = `Preview ${stemOf(s.file)}`;
      preview.setAttribute('aria-label', `Preview ${stemOf(s.file)}`);
      preview.addEventListener('click', () => togglePreview(s.file, preview));

      row.append(cb, name, weight, preview);
      group.appendChild(row);
    }

    el.soundList.appendChild(group);
    updateCategoryCount(group, items);
  }
  updateBadge();
}

function updateCategoryCount(group, items) {
  const node = group.querySelector('[data-role=count]');
  if (node) {
    const enabled = items.filter(s => state.enabled[s.file]).length;
    node.textContent = `${enabled} / ${items.length}`;
  }
  const toggle = group.querySelector('.category-toggle');
  if (toggle) {
    const enabled = items.filter(s => state.enabled[s.file]).length;
    toggle.checked = enabled === items.length;
    toggle.indeterminate = enabled > 0 && enabled < items.length;
  }
}

function updateBadge() {
  const total = SOUNDS.length;
  const enabled = SOUNDS.filter(s => state.enabled[s.file]).length;
  el.soundsBadge.textContent = `${enabled} of ${total} enabled`;
}

function refreshAllCategoryCounts() {
  const groups = el.soundList.querySelectorAll('.category-group');
  let i = 0;
  for (const [, items] of byCategory()) {
    updateCategoryCount(groups[i], items);
    i++;
  }
}

/* ---------------- Paired slider + number input ---------------- */
function pairSliderAndNumber(sliderEl, numberEl, { onChange, min, max }) {
  const sync = (val, fromSlider) => {
    const clamped = Math.min(max, Math.max(min, val));
    if (fromSlider) {
      // slider values are already clamped by the slider itself
      numberEl.value = clamped;
    } else {
      // number can exceed slider max/min; clamp slider to its own range
      sliderEl.value = Math.min(parseFloat(sliderEl.max), Math.max(parseFloat(sliderEl.min), clamped));
    }
    onChange(clamped);
  };
  sliderEl.addEventListener('input', () => sync(parseFloat(sliderEl.value), true));
  numberEl.addEventListener('input', () => {
    const v = parseFloat(numberEl.value);
    if (Number.isFinite(v)) sync(v, false);
  });
  numberEl.addEventListener('blur', () => {
    const v = parseFloat(numberEl.value);
    if (!Number.isFinite(v) || v < min) numberEl.value = min;
    else if (v > max) numberEl.value = max;
  });
}

/* ---------------- Wire up ---------------- */
function syncControlsFromState() {
  el.volumeSlider.value = Math.round(state.volume * 100);
  el.volumeValue.textContent = `${Math.round(state.volume * 100)}%`;
  el.avgInterval.value = Math.min(120, state.averageInterval);
  el.avgIntervalNum.value = state.averageInterval;
  el.variability.value = state.variability;
  el.variabilityNum.value = state.variability;
  el.sessionMinutes.value = Math.min(60, state.sessionMinutes);
  el.sessionMinutesNum.value = state.sessionMinutes;
  el.sessionMinutes.disabled = state.noLimit;
  el.sessionMinutesNum.disabled = state.noLimit;
  el.noLimit.checked = state.noLimit;
  el.ignoreWeights.checked = state.ignoreWeights;
  el.equalCategories.checked = state.equalCategories;
}

function wireUp() {
  // Volume (slider is 0-100, internal state is 0-1)
  el.volumeSlider.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value, 10);
    state.volume = pct / 100;
    el.volumeValue.textContent = `${pct}%`;
    if (gainNode) gainNode.gain.value = state.volume;
    saveState(state);
  });

  pairSliderAndNumber(el.avgInterval, el.avgIntervalNum, {
    min: 0, max: 600,
    onChange: (val) => {
      state.averageInterval = val;
      saveState(state);
    },
  });
  pairSliderAndNumber(el.variability, el.variabilityNum, {
    min: 0, max: 100,
    onChange: (val) => {
      state.variability = val;
      saveState(state);
    },
  });
  pairSliderAndNumber(el.sessionMinutes, el.sessionMinutesNum, {
    min: 1, max: 600,
    onChange: (val) => {
      state.sessionMinutes = val;
      saveState(state);
    },
  });

  el.noLimit.addEventListener('change', () => {
    state.noLimit = el.noLimit.checked;
    el.sessionMinutes.disabled = state.noLimit;
    el.sessionMinutesNum.disabled = state.noLimit;
    saveState(state);
  });

  el.ignoreWeights.addEventListener('change', () => {
    state.ignoreWeights = el.ignoreWeights.checked;
    saveState(state);
  });

  el.equalCategories.addEventListener('change', () => {
    state.equalCategories = el.equalCategories.checked;
    saveState(state);
  });

  el.advanced.addEventListener('toggle', () => {
    document.body.classList.toggle('advanced-open', el.advanced.open);
  });
  document.body.classList.toggle('advanced-open', el.advanced.open);

  el.playBtn.addEventListener('click', () => {
    if (session) stopSession('Stopped.');
    else startSession();
  });

  el.skipBtn.addEventListener('click', () => {
    if (!session) return;
    clearTimeout(session.nextTimer);
    if (session.currentSource) {
      session.currentSource.onended = null;
      try { session.currentSource.stop(); } catch {}
      session.currentSource = null;
    }
    clearPlayingRow();
    session.currentFile = null;
    setSkipVisible(false);
    session.nextFireAt = Date.now();
    playAndSchedule();
  });

  document.querySelector('.sounds-actions').addEventListener('click', (e) => {
    const target = e.target.closest('button[data-action]');
    if (!target) return;
    if (target.dataset.action !== 'reset') return;
    if (!confirm('Reset all settings to defaults? This will clear saved preferences.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

/* ---------------- Slider fill ---------------- */
function updateSliderFill(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 100;
  const pct = ((parseFloat(slider.value) - min) / (max - min)) * 100;
  slider.style.setProperty('--fill-pct', `${pct}%`);
}

function watchSliderFill(slider) {
  updateSliderFill(slider);
  slider.addEventListener('input', () => updateSliderFill(slider));
}

/* ---------------- Obfuscated contact email ---------------- */
function renderContact() {
  const node = document.getElementById('contact-email');
  if (!node) return;
  const u = 'janmate';
  const d = 'tutanota' + '.' + 'com';
  const addr = u + '\u0040' + d;
  const a = document.createElement('a');
  a.href = ['ma', 'ilto:', u, '@', d].join('');
  a.textContent = addr;
  node.appendChild(a);
}

/* ---------------- Init ---------------- */
function init() {
  el.playBtnIcon.innerHTML = ICON_PLAY;
  el.playStatus.textContent = 'Ready. Press play to start.';
  syncControlsFromState();
  renderSoundList();
  wireUp();
  // Slider fill for all sliders (volume is 0-100 in DOM)
  for (const s of document.querySelectorAll('.slider')) watchSliderFill(s);
  renderContact();
}

init();
