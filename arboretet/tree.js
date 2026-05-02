// site/tree.js
let treeData = null;
let svg, g, zoom;
let searchMatches = [];
let currentMatchIndex = -1;

const tooltipEl = document.getElementById("tooltip");
const sidebar = document.getElementById("sidebar");
const closeBtn = document.getElementById("close-sidebar");
const plantSpecies = document.getElementById("plant-species");
const plantCommon = document.getElementById("plant-common");
const plantSummary = document.getElementById("plant-summary");
const plantLink = document.getElementById("plant-link");
const explorerLink = document.getElementById("explorer-link");
const plantImage = document.getElementById("plant-image");
const plantMeta = document.getElementById("plant-meta");
const searchInput = document.getElementById("search-tree");
const searchStatus = document.getElementById("search-status");
const searchPrevBtn = document.getElementById("search-prev");
const searchNextBtn = document.getElementById("search-next");
const resetBtn = document.getElementById("reset-tree-view");
const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const closeModal = document.getElementById("close-modal");
const statusEl = document.getElementById("status");

const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

infoBtn.addEventListener("click", () => infoModal.classList.remove("hidden"));
closeModal.addEventListener("click", () => infoModal.classList.add("hidden"));
infoModal.addEventListener("click", (e) => { if (e.target === infoModal) infoModal.classList.add("hidden"); });

closeBtn.addEventListener("click", () => {
    if (location.hash === "#info") {
        history.back();
    } else {
        closeSidebar();
    }
});

window.addEventListener("popstate", () => {
    if (location.hash !== "#info") {
        closeSidebar();
    }
});

document.addEventListener("keydown", (e) => { if (e.key === "Escape") {
    if (!infoModal.classList.contains("hidden")) infoModal.classList.add("hidden");
    else if (location.hash === "#info") history.back();
    else closeSidebar();
}});

function showStatus(msg) { statusEl.textContent = msg; statusEl.classList.add("visible"); }
function hideStatus() { statusEl.classList.remove("visible"); }
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

fetch("../taxo.json")
    .then(r => r.json())
    .then(data => {
        treeData = data;
        initTree();
    })
    .catch(err => {
        console.error(err);
        showStatus("Error loading taxo.json. Did you run build_taxo.py?");
    });

function initTree() {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    svg = d3.select("#tree-container").append("svg")
        .attr("width", "100%")
        .attr("height", "100%");

    zoom = d3.zoom()
        .scaleExtent([0.01, 5])
        .on("zoom", (e) => {
            g.attr("transform", e.transform);
        });

    svg.call(zoom);

    g = svg.append("g");

    const root = d3.hierarchy(treeData);
    
    // Compute tree layout
    const dx = 20; // vertical spacing
    const dy = 165; // horizontal spacing per depth level
    const tree = d3.tree().nodeSize([dx, dy]);
    
    tree(root);

    let max_depth = 0;
    root.each(d => {
        if (d.depth > max_depth) max_depth = d.depth;
    });

    const leaf_line_len = 25;

    g.append("g")
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("class", "link")
        .attr("stroke-width", d => 3 * (max_depth - d.source.depth) + 1.5)
        .attr("d", d => {
            const w_s = 3 * (max_depth - d.source.depth) + 1.5;
            const w_t = 3 * (max_depth - d.target.depth) + 1.5;
            const direction = d.target.x > d.source.x ? 1 : (d.target.x < d.source.x ? -1 : 0);

            const vs = d.source.x - (direction * w_s / 2);
            let vt = d.target.x + (direction * w_t / 2);
            
            if (!d.target.children) {
                vt += (direction * w_t / 2);
            }

            let path = `M ${d.source.y} ${d.source.x} H ${d.target.y} M ${d.target.y} ${vs} V ${vt}`;
            if (!d.target.children) {
                path += ` M ${d.target.y} ${d.target.x} H ${d.target.y + leaf_line_len}`;
            }
            return path;
        });

    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("class", d => `node ${d.children ? "node--internal" : "node--leaf"}`)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    const text_multiplier = 2;
    const min_text = 12;

    node.append("text")
        .attr("dy", d => d.children ? "-0.5em" : "0.31em")
        .attr("x", d => d.children ? 10 : leaf_line_len + 10)
        .attr("text-anchor", "start")
        .style("font-size", d => `${(max_depth - d.depth) * text_multiplier + min_text}px`)
        .text(d => d.data.name)
        .on("click", (_event, d) => {
            openSidebar(d.data);
        })
        .on("mouseover", (event, d) => {
            if (isCoarsePointer) return;
            if (d.data.wiki) {
                showTooltip(d.data, event.clientX, event.clientY);
            }
        })
        .on("mouseout", () => {
            hideTooltip();
        });

    // Calculate bounding box for the entire tree
    let x0 = Infinity, x1 = -Infinity;
    let y0 = Infinity, y1 = -Infinity;
    root.each(d => {
        if (d.x < x0) x0 = d.x;
        if (d.x > x1) x1 = d.x;
        if (d.y < y0) y0 = d.y;
        if (d.y > y1) y1 = d.y;
    });

    const padding = 100;
    const treeHeight = x1 - x0;
    const treeWidth = y1 - y0;

    // Calculate the scale required to fit the entire tree
    const scaleX = (width - padding * 2) / treeWidth;
    const scaleY = (height - padding * 2) / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1.2);

    const tx = (width - treeWidth * scale) / 2 - y0 * scale;
    const ty = (height - treeHeight * scale) / 2 - x0 * scale;

    const defaultZoom = d3.zoomIdentity.translate(tx, ty).scale(scale);

    // Initial transform to fit the entire tree
    svg.transition().duration(750).call(zoom.transform, defaultZoom);

    function focusMatch(index) {
        if (searchMatches.length === 0) return;
        currentMatchIndex = index;
        
        searchStatus.textContent = `${currentMatchIndex + 1} of ${searchMatches.length}`;
        
        const match = searchMatches[currentMatchIndex];
        const matchScale = 1.5;
        // Offset horizontally so the text (which extends to the right) is more likely to be visible
        const xOffset = isCoarsePointer ? width * 0.2 : width * 0.35;
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(xOffset - match.y * matchScale, height / 2 - match.x * matchScale).scale(matchScale)
        );
    }

    searchNextBtn.addEventListener("click", () => {
        if (searchMatches.length === 0) return;
        let nextIndex = currentMatchIndex + 1;
        if (nextIndex >= searchMatches.length) nextIndex = 0;
        focusMatch(nextIndex);
    });

    searchPrevBtn.addEventListener("click", () => {
        if (searchMatches.length === 0) return;
        let prevIndex = currentMatchIndex - 1;
        if (prevIndex < 0) prevIndex = searchMatches.length - 1;
        focusMatch(prevIndex);
    });

    // Search functionality
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (searchMatches.length === 0) return;
            if (e.shiftKey) {
                searchPrevBtn.click();
            } else {
                searchNextBtn.click();
            }
        }
    });

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            node.classed("found", false);
            searchMatches = [];
            currentMatchIndex = -1;
            searchStatus.style.display = "none";
            searchStatus.textContent = "";
            searchPrevBtn.style.display = "none";
            searchNextBtn.style.display = "none";
            return;
        }

        node.classed("found", d => d.data.name.toLowerCase().includes(query));
        searchMatches = root.descendants().filter(d => d.data.name.toLowerCase().includes(query));
        
        if (searchMatches.length > 0) {
            searchStatus.style.display = "inline-block";
            searchPrevBtn.style.display = "inline-block";
            searchNextBtn.style.display = "inline-block";
            searchStatus.textContent = `0 of ${searchMatches.length}`;
        } else {
            searchStatus.style.display = "none";
            searchStatus.textContent = "0 matches";
            searchPrevBtn.style.display = "none";
            searchNextBtn.style.display = "none";
        }
    });

    resetBtn.addEventListener("click", () => {
        searchInput.value = "";
        node.classed("found", false);
        searchMatches = [];
        currentMatchIndex = -1;
        searchStatus.style.display = "none";
        searchStatus.textContent = "";
        searchPrevBtn.style.display = "none";
        searchNextBtn.style.display = "none";
        svg.transition().duration(750).call(zoom.transform, defaultZoom);
        closeSidebar();
    });
}

function showTooltip(data, clientX, clientY) {
    const wiki = data.wiki || {};
    let img = wiki.image;
    if (img && img.startsWith("images/")) img = "../" + img;
    let summary = wiki.summary || "";
    if (summary.length > 450) summary = summary.substring(0, 447) + "...";

    tooltipEl.innerHTML = (img ? `<img class="tt-image" src="${img}" alt="" />` : "") +
        `<div class="tt-body">` +
            `<div class="tt-species">${escapeHtml(data.name)}</div>` +
            (summary ? `<div class="tt-summary">${escapeHtml(summary)}</div>` : "") +
        `</div>`;
    tooltipEl.classList.remove("hidden");
    const pad = 14;
    const r = tooltipEl.getBoundingClientRect();
    let x = clientX + pad, y = clientY + pad;
    const tooltipWidth = 350; // Match max-width in CSS
    if (x + tooltipWidth > window.innerWidth) x = clientX - tooltipWidth - pad;
    if (y + r.height > window.innerHeight) y = clientY - r.height - pad;
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
}

function hideTooltip() { tooltipEl.classList.add("hidden"); }

function openSidebar(d) {
    if (location.hash !== "#info") {
        window.location.hash = "info";
    }
    hideTooltip();

    const isClade = Array.isArray(d.children);

    plantSpecies.textContent = d.name || "";
    const subtitle = isClade ? (d.rank ? d.rank.charAt(0).toUpperCase() + d.rank.slice(1) : "") : "";
    plantCommon.textContent = subtitle;
    plantCommon.style.display = subtitle ? "" : "none";

    plantSummary.textContent = (d.wiki && d.wiki.summary) || "";
    plantSummary.style.display = plantSummary.textContent ? "" : "none";

    if (d.wiki && d.wiki.image) {
        let img = d.wiki.image;
        if (img.startsWith("images/")) img = "../" + img;
        plantImage.src = img;
        plantImage.alt = d.name || "";
        plantImage.style.display = "";
    } else {
        plantImage.removeAttribute("src");
        plantImage.style.display = "none";
    }

    plantLink.href = (d.wiki && d.wiki.url) || "#";
    plantLink.style.display = (d.wiki && d.wiki.url) ? "" : "none";

    const rank = d.rank;
    if (isClade && rank !== "genus" && rank !== "family") {
        explorerLink.style.display = "none";
    } else {
        explorerLink.style.display = "";
        explorerLink.href = `../index.html#q=${encodeURIComponent(d.name)}`;
    }

    let metaFields;
    if (isClade) {
        metaFields = [
            ["Total plants in arboretum", d.count],
            ["Species in arboretum", d.species_count],
        ];
    } else {
        const typeStr = (d.types && d.types.length > 0) ? d.types.join(", ") : "Unknown";
        metaFields = [
            ["Genus", d.genus],
            ["Family", d.family],
            ["Order", d.order],
            ["Class", d.class],
            ["Division", d.division],
            ["Type(s)", typeStr],
            ["Total plants in arboretum", d.count],
        ];
    }

    plantMeta.innerHTML = metaFields
        .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0 && v !== "Unknown")
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
        .join("");

    sidebar.classList.remove("hidden");
}

function closeSidebar() {
    sidebar.classList.add("hidden");
}
