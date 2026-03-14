window.TerrainApp = (function() {
    let scene, camera, renderer, data, mesh, lines;
    let textDiv, galleryDiv;
    const textPos = new THREE.Vector3();
    const galleryPos = new THREE.Vector3();
    let isMobile = false;
    let cameraTravel = 12000;

    async function init() {
        const container = document.getElementById('three-container');
        if (!container) return;

        textDiv = document.getElementById('nature-text-3d');
        galleryDiv = document.getElementById('gallery-preview-3d');

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 50, 500000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '1';
        renderer.domElement.style.pointerEvents = 'none';
        container.appendChild(renderer.domElement);

        const res = await fetch('tatras_data.json');
        data = await res.json();

        const yaw = -30 * (Math.PI / 180);
        const dirX = Math.sin(yaw);
        const dirZ = -Math.cos(yaw);

        isMobile = window.innerWidth < 768;

        const terrainHeightMultiplier = 1.0;
        const terrainWidthMultiplier = 1.0;

        const textDistance = 10000;
        const textY = 8000;

        const galleryDistance = 6000;
        const galleryY = isMobile ? -5500 : -3500;
        
        cameraTravel = isMobile ? 14500 : 11500; 

        textPos.set(data.cam_x + dirX * textDistance, textY, data.cam_z + dirZ * textDistance);
        galleryPos.set(data.cam_x + dirX * galleryDistance, galleryY, data.cam_z + dirZ * galleryDistance);

        const nx = data.nx, ny = data.ny;
        const worldW = data.width_m * terrainWidthMultiplier;
        const worldD = data.depth_m * terrainWidthMultiplier;
        
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(nx * ny * 3);

        for (let j = 0; j < ny; j += 1) {
            for (let i = 0; i < nx; i += 1) {
                const idx = (j * nx + i) * 3;
                vertices[idx] = (i / (nx - 1)) * worldW - worldW / 2;
                vertices[idx + 1] = data.heights[j * nx + i] * terrainHeightMultiplier; 
                vertices[idx + 2] = (j / (ny - 1)) * worldD - worldD / 2;
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const triIndices = new Array();
        for (let j = 0; j < ny - 1; j += 1) {
            for (let i = 0; i < nx - 1; i += 1) {
                const a = j * nx + i, b = (j + 1) * nx + i, c = j * nx + (i + 1), d = (j + 1) * nx + (i + 1);
                triIndices.push(a, b, c, b, d, c);
            }
        }
        geometry.setIndex(triIndices);
        mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
        scene.add(mesh);

        const lineIndices = new Array();
        for (let j = 0; j < ny; j += 1) {
            for (let i = 0; i < nx - 1; i += 1) lineIndices.push(j * nx + i, j * nx + (i + 1));
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        lineGeo.setIndex(lineIndices);
        lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        scene.add(lines);
    }

    function updateHTML(pos, div) {
        if (!div || !camera) return;
        const vector = pos.clone().project(camera);
        
        if (vector.z < 1) {
            const tx = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const ty = (vector.y * -0.5 + 0.5) * window.innerHeight;
            
            div.style.transform = `translate(-50%, -50%) translate(${tx}px, ${ty}px)`;
            div.style.opacity = '1';
            div.style.pointerEvents = 'auto';
        } else {
            div.style.opacity = '0';
            div.style.pointerEvents = 'none';
        }
    }

    function render(progress) {
        if (!data || !camera) return;
        const yPos = 8000 - (progress * cameraTravel);
        camera.position.set(data.cam_x, yPos, data.cam_z);
        const yaw = -30 * (Math.PI / 180);
        camera.lookAt(data.cam_x + 10000 * Math.sin(yaw), yPos, data.cam_z - 10000 * Math.cos(yaw));
        
        renderer.render(scene, camera);

        updateHTML(textPos, textDiv);
        updateHTML(galleryPos, galleryDiv);
    }

    return { init, render };
})();