window.TerrainApp = (function() {
    let scene, camera, renderer, data, mesh, lines;

    async function init() {
        const container = document.getElementById('three-container');
        if (!container) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 50, 500000);
        
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const res = await fetch('tatras_data.json');
        data = await res.json();

        const nx = data.nx, ny = data.ny, worldW = data.width_m, worldD = data.depth_m;
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(nx * ny * 3);

        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const idx = (j * nx + i) * 3;
                vertices[idx] = (i / (nx - 1)) * worldW - worldW / 2;
                vertices[idx + 1] = data.heights[j * nx + i] * 2.0; 
                vertices[idx + 2] = (j / (ny - 1)) * worldD - worldD / 2;
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const triIndices = [];
        for (let j = 0; j < ny - 1; j++) {
            for (let i = 0; i < nx - 1; i++) {
                const a = j * nx + i, b = (j + 1) * nx + i, c = j * nx + (i + 1), d = (j + 1) * nx + (i + 1);
                triIndices.push(a, b, c, b, d, c);
            }
        }
        geometry.setIndex(triIndices);
        mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
        scene.add(mesh);

        const lineIndices = [];
        for (let j = 0; j < ny; j += 1) {
            for (let i = 0; i < nx - 1; i++) lineIndices.push(j * nx + i, j * nx + (i + 1));
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        lineGeo.setIndex(lineIndices);
        lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        scene.add(lines);
    }

    function render(progress) {
        if (!data || !camera) return;
        const yPos = 8000 - (progress * 12000);
        camera.position.set(data.cam_x, yPos, data.cam_z);
        const yaw = -30 * (Math.PI / 180);
        camera.lookAt(data.cam_x + 10000 * Math.sin(yaw), yPos, data.cam_z - 10000 * Math.cos(yaw));
        renderer.render(scene, camera);
    }

    return { init, render };
})();