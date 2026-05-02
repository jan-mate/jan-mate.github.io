const LIGHT_TILES    = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DEFAULT_CENTER = [55.87, 12.50];
const DEFAULT_ZOOM   = 15;

const TYPE_COLOR = { broadleaf: "#4a9b5d", conifer: "#1a5c2e", bush: "#a8d675" };
const ARBORETET_BOUNDS = L.latLngBounds([55.845, 12.480], [55.885, 12.535]);

const map = L.map("map", {
    zoomControl: false,
    preferCanvas: false,
    doubleClickZoom: false,
    maxZoom: 22,
    minZoom: 12,
    maxBounds: ARBORETET_BOUNDS,
    maxBoundsViscosity: 0.85,
    zoomSnap:  0.25,
    zoomDelta: 0.25,
    wheelPxPerZoomLevel: 120,
    zoomAnimation: true,
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer(LIGHT_TILES, {
    maxZoom: 22,
    subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 1,
}).addTo(map);

const canvasEl = L.DomUtil.create("canvas", "leaflet-zoom-hide");
canvasEl.style.cssText += "position:absolute;pointer-events:none;";
map.getPanes().overlayPane.appendChild(canvasEl);
const ctx = canvasEl.getContext("2d");

// --- State ---
let allPlants       = [];
let filteredPlants  = [];
let selectedPlant   = null;
let dataBounds      = null;
let rafPending      = false;

// --- DOM refs ---
const tooltipEl     = document.getElementById("tooltip");
const sidebar       = document.getElementById("sidebar");
const closeBtn      = document.getElementById("close-sidebar");
const plantSpecies  = document.getElementById("plant-species");
const plantCommon   = document.getElementById("plant-common");
const plantSummary  = document.getElementById("plant-summary");
const plantLink     = document.getElementById("plant-link");
const plantImage    = document.getElementById("plant-image");
const plantMeta     = document.getElementById("plant-meta");
const searchInput   = document.getElementById("search");
const resetBtn      = document.getElementById("reset-view");
const locateBtn     = document.getElementById("locate-btn");
const infoBtn       = document.getElementById("info-btn");
const infoModal     = document.getElementById("info-modal");
const closeModal    = document.getElementById("close-modal");
const statusEl      = document.getElementById("status");

const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

infoBtn.addEventListener("click", () => infoModal.classList.remove("hidden"));
closeModal.addEventListener("click", () => infoModal.classList.add("hidden"));
infoModal.addEventListener("click", (e) => { if (e.target === infoModal) infoModal.classList.add("hidden"); });

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (!infoModal.classList.contains("hidden")) infoModal.classList.add("hidden");
        else if (location.hash === "#info") history.back();
        else closeSidebar();
    }
});
window.addEventListener("popstate", () => handleHashChange());

// --- Data load ---
fetch("data.json").then((r) => r.json()).then((plants) => {
    if (!Array.isArray(plants) || plants.length === 0) {
        showStatus("No plant data loaded. Run `python scripts/build.py` first.");
        return;
    }
    
    allPlants = plants.map(p => ({
        ...p,
        _mType: p.icon_type === "Bush" ? "bush" : (p.type === "conifer" ? "conifer" : "broadleaf"),
        _mScale: getPlantScale(p),
        _sHay: [p.species, p.genus, p.family, p.wiki && p.wiki.common_name].filter(Boolean).join(" ").toLowerCase()
    }));

    filteredPlants = allPlants;
    dataBounds     = L.latLngBounds(allPlants.map((p) => [p.lat, p.lng]));
    
    handleHashChange(true);

    map.on("viewreset zoomend moveend resize", scheduleRedraw);
    map.on("click", onMapClick);
    if (!isCoarsePointer) {
        map.getContainer().addEventListener("mousemove", onMapHover);
        map.getContainer().addEventListener("mouseleave", hideTooltip);
    }
});

// --- Hash Handling (Deep Linking) ---
function handleHashChange(isInitial = false) {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    
    if (hash !== "info") {
        closeSidebar();
    }

    if (!hash || hash === "info") {
        if (!isInitial && !hash) {
            performSearch("", false, false);
        } else if (isInitial) {
            map.fitBounds(dataBounds, { padding: [40, 40] });
        }
        return;
    }

    if (hash.startsWith("q=")) {
        const query = hash.slice(2);
        searchInput.value = query;
        performSearch(query, false, isInitial);
    }
}

// --- Search Logic ---
searchInput.addEventListener("input", () => {
    performSearch(searchInput.value.trim(), true, false);
});

function performSearch(q, updateHash = true, fitToFound = true) {
    const term = q.toLowerCase();
    if (updateHash) {
        const newHash = term ? "#q=" + encodeURIComponent(q) : window.location.pathname + window.location.search;
        history.replaceState(null, "", newHash);
    }

    filteredPlants = term 
        ? allPlants.filter(p => p._sHay.includes(term))
        : allPlants;

    scheduleRedraw();
    
    if (term && filteredPlants.length > 0 && fitToFound) {
        const bounds = L.latLngBounds(filteredPlants.map(p => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }

    if (term && filteredPlants.length === 0) showStatus("No plants match your search.");
    else hideStatus();
}

// --- Canvas drawing ---
function getPlantScale(p) {
    let s;
    if (p.dbh_mm && p.height_dm) {
        s = (Math.sqrt(p.dbh_mm / 250) + (p.height_dm / 120)) / 2;
    } else if (p.dbh_mm) {
        s = Math.sqrt(p.dbh_mm / 250);
    } else if (p.height_dm) {
        s = p.height_dm / 120;
    } else {
        s = 0.85;
    }
    return 1.0 + (s - 1.0) * 0.8;
}

function markerRadius() {
    const z = map.getZoom();
    let r = Math.pow(z - 11, 2.4) * 0.045;
    return Math.max(0.4, r);
}

const TRI_X = 0.8660254;

function drawMarker(x, y, r, type, isSelected) {
    if (isSelected) {
        ctx.shadowColor   = "#000";
        ctx.shadowBlur    = Math.max(4, r * 1.2);
    }
    ctx.fillStyle = TYPE_COLOR[type];

    ctx.beginPath();
    if (type === "conifer" && r >= 3) {
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + TRI_X * r, y + r / 2);
        ctx.lineTo(x - TRI_X * r, y + r / 2);
        ctx.closePath();
    } else if (type === "bush" && r >= 3) {
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = x + r * Math.cos(angle);
            const py = y + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else {
        ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    if (isSelected) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = Math.max(1, r * 0.2);
        ctx.stroke();
    }
}

function redraw() {
    rafPending = false;
    if (!map._loaded) return;

    const size    = map.getSize();
    const dpr     = window.devicePixelRatio || 1;
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    const z       = map.getZoom();

    if (canvasEl.width !== size.x * dpr || canvasEl.height !== size.y * dpr) {
        canvasEl.width  = size.x * dpr;
        canvasEl.height = size.y * dpr;
        canvasEl.style.width = size.x + "px";
        canvasEl.style.height = size.y + "px";
    }
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.DomUtil.setPosition(canvasEl, topLeft);
    ctx.clearRect(0, 0, size.x, size.y);
    
    const baseR = markerRadius();
    let labelsToDraw = [];
    let selectedPt = null;

    const minS = z >= 18 ? 0.77 : 0.7;

    for (const plant of filteredPlants) {
        const pt = map.latLngToLayerPoint([plant.lat, plant.lng]);
        const px = pt.x - topLeft.x, py = pt.y - topLeft.y;
        
        if (px < -150 || py < -150 || px > size.x + 150 || py > size.y + 150) continue;
        
        const scale = Math.max(minS, Math.min(2.5, plant._mScale));
        const r = baseR * scale;
        const type = plant._mType;

        if (plant === selectedPlant) { 
            selectedPt = [px, py, r, type]; 
        } else {
            drawMarker(px, py, r, type, false);
        }

        if (z >= 20.25 && plant.species) {
            labelsToDraw.push({ x: px, y: py, r: r, type: type, text: plant.species });
        }
    }

    if (selectedPt && selectedPlant) {
        drawMarker(selectedPt[0], selectedPt[1], selectedPt[2], selectedPt[3], true);
    }

    if (labelsToDraw.length > 0) {
        ctx.font = "500 11px -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const occupied = [];

        for (const l of labelsToDraw) {
            const metrics = ctx.measureText(l.text);
            const w = metrics.width;
            const h = 12;
            const buffer = 4;
            const bottomEdge = (l.type === "conifer") ? l.r / 2 : l.r;
            const ly = l.y + bottomEdge + 2; 
            const lx = l.x - w / 2 - buffer;

            let overlap = false;
            if (z < 21.5) {
                for (const o of occupied) {
                    if (lx < o.x + o.w && lx + w + buffer * 2 > o.x && ly < o.y + o.h && ly + h > o.y) {
                        overlap = true;
                        break;
                    }
                }
            }

            if (!overlap || l.text === (selectedPlant && selectedPlant.species)) {
                ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
                ctx.lineWidth = 3;
                ctx.strokeText(l.text, l.x, ly);
                ctx.fillStyle = "#1a1916";
                ctx.fillText(l.text, l.x, ly);
                occupied.push({ x: lx, y: ly, w: w + buffer * 2, h: h });
            }
        }
    }
}

function scheduleRedraw() {
    if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(redraw);
    }
}

function hitTest(layerPt) {
    const baseR = markerRadius();
    let best = null, bestDist = 14; // Start with max hit radius

    for (const plant of filteredPlants) {
        const pt = map.latLngToLayerPoint([plant.lat, plant.lng]);
        const dx = pt.x - layerPt.x;
        const dy = pt.y - layerPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const scale = Math.max(0.7, Math.min(2.5, plant._mScale));
        const hitR = Math.max(baseR * scale, 14);
        
        if (dist < hitR && dist < bestDist) { 
            bestDist = dist; 
            best = plant; 
        }
    }
    return best;
}

function onMapClick(e) {
    const plant = hitTest(e.layerPoint);
    if (plant) openSidebar(plant);
    else closeSidebar();
}

function onMapHover(e) {
    const layerPt = map.containerPointToLayerPoint(map.mouseEventToContainerPoint(e));
    const plant = hitTest(layerPt);
    if (plant) {
        showTooltip(plant, e.clientX, e.clientY);
        map.getContainer().style.cursor = "pointer";
    } else {
        hideTooltip();
        map.getContainer().style.cursor = "";
    }
}

function showTooltip(plant, clientX, clientY) {
    const wiki = plant.wiki || {};
    const common = wiki.common_name;
    const img = wiki.image;
    let summary = wiki.summary || "";
    if (summary.length > 240) summary = summary.substring(0, 237) + "...";
    tooltipEl.innerHTML = (img ? `<img class="tt-image" src="${img}" alt="" />` : "") +
        `<div class="tt-body">` +
            `<div class="tt-species">${escapeHtml(plant.species)}</div>` +
            (common ? `<div class="tt-common">${escapeHtml(common)}</div>` : "") +
            (summary ? `<div class="tt-summary">${escapeHtml(summary)}</div>` : "") +
        `</div>`;
    tooltipEl.classList.remove("hidden");
    const pad = 14;
    const r = tooltipEl.getBoundingClientRect();
    let x = clientX + pad, y = clientY + pad;
    if (x + r.width > window.innerWidth) x = clientX - r.width - pad;
    if (y + r.height > window.innerHeight) y = clientY - r.height - pad;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}
function hideTooltip() { tooltipEl.classList.add("hidden"); }

function openSidebar(d) {
    if (location.hash !== "#info") {
        window.location.hash = "info";
    }
    selectedPlant = d;
    scheduleRedraw();

    plantSpecies.textContent = d.species || "";
    plantCommon.textContent  = (d.wiki && d.wiki.common_name) || "";
    plantSummary.textContent = (d.wiki && d.wiki.summary) || "";
    plantSummary.style.display = plantSummary.textContent ? "" : "none";

    if (d.wiki && d.wiki.image) {
        plantImage.src = d.wiki.image;
        plantImage.alt = d.species || "";
        plantImage.style.display = "";
    } else {
        plantImage.removeAttribute("src");
        plantImage.style.display = "none";
    }
    plantLink.href = (d.wiki && d.wiki.url) || "#";
    plantLink.style.display = (d.wiki && d.wiki.url) ? "" : "none";

    const metaFields = [
        ["Genus", d.genus], ["Species", d.species_epithet], ["Family", d.family],
        ["Order", d.order], ["Class", d.class], ["Division", d.division],
        ["Type", d._mType === "bush" ? "Bush / Shrub" : (d.type === "conifer" ? "Conifer" : "Broadleaf")],
        ["Accession year", d.accession_year],
        ["Trunk diameter", d.dbh_mm ? `${(d.dbh_mm / 10).toFixed(0)} cm` : null],
        ["Height", d.height_dm ? `${(d.height_dm / 10).toFixed(1)} m` : null],
        ["Plant no.", d.plant_number],
    ];
    plantMeta.innerHTML = metaFields
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
        .join("");

    sidebar.classList.remove("hidden");
}

function closeSidebar() {
    if (sidebar.classList.contains("hidden")) return;
    sidebar.classList.add("hidden");
    selectedPlant = null;
    scheduleRedraw();
}

closeBtn.addEventListener("click", () => {
    if (location.hash === "#info") {
        history.back();
    } else {
        closeSidebar();
    }
});

resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    performSearch("", true);
    if (dataBounds) map.fitBounds(dataBounds, { padding: [40, 40] });
});

let locationMarker = null, locationAccuracyCircle = null, watching = false;

locateBtn.addEventListener("click", () => {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
        showStatus("Location requires HTTPS (or localhost) to work.");
        return;
    }

    if (!watching) {
        watching = true; locateBtn.classList.add("active");
        map.locate({ watch: true, enableHighAccuracy: true, timeout: 10000 });
    } else {
        watching = false; locateBtn.classList.remove("active");
        map.stopLocate();
        if (locationMarker) { locationMarker.remove(); locationMarker = null; }
        if (locationAccuracyCircle) { locationAccuracyCircle.remove(); locationAccuracyCircle = null; }
        hideStatus();
    }
});

map.on("locationfound", (e) => {
    const isInside = ARBORETET_BOUNDS.contains(e.latlng);
    
    if (locationMarker) {
        locationMarker.setLatLng(e.latlng);
        locationAccuracyCircle.setLatLng(e.latlng).setRadius(e.accuracy / 2);
    } else {
        locationAccuracyCircle = L.circle(e.latlng, {
            radius: e.accuracy / 2, color: "#3880ff", fillColor: "#3880ff", fillOpacity: 0.12, weight: 1,
        }).addTo(map);
        locationMarker = L.circleMarker(e.latlng, {
            radius: 8, color: "#fff", weight: 2.5, fillColor: "#3880ff", fillOpacity: 1,
        }).addTo(map);
        
        if (isInside) {
            map.flyTo(e.latlng, 18);
            hideStatus();
        }
    }

    if (!isInside) {
        const dist = e.latlng.distanceTo(DEFAULT_CENTER) / 1000;
        showStatus(`You are ${dist.toFixed(1)}km away from the Arboretum.`);
    }
});

map.on("locationerror", (e) => {
    watching = false; locateBtn.classList.remove("active");
    let msg = "Location unavailable.";
    if ((e.message || "").toLowerCase().includes("denied")) msg = "Location blocked.";
    else if ((e.message || "").toLowerCase().includes("timeout")) msg = "Location timed out.";
    showStatus(msg);
});

function showStatus(msg) { statusEl.textContent = msg; statusEl.classList.add("visible"); }
function hideStatus() { statusEl.classList.remove("visible"); }
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
