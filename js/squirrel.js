import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

const container = document.getElementById('squirrel-container');
let scene, camera, renderer, controls, pivot;
let isInitialized = false;

function init() {
    if (isInitialized || window.innerWidth < 768) return;
    isInitialized = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;

    pivot = new THREE.Group();
    scene.add(pivot);

    const loader = new GLTFLoader();

    loader.load('Squirrel.glb', function (gltf) {
        const model = gltf.scene;
        model.rotation.x = -Math.PI / 2;

        model.traverse((node) => {
            if (node.isMesh) {
                node.geometry = BufferGeometryUtils.mergeVertices(node.geometry);
                const blackMat = new THREE.MeshBasicMaterial({ 
                    color: 0x000000,
                    polygonOffset: true,
                    polygonOffsetFactor: 1,
                    polygonOffsetUnits: 1
                });
                const edgeGeom = new THREE.EdgesGeometry(node.geometry, 40);
                const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
                const wireframe = new THREE.LineSegments(edgeGeom, lineMat);
                
                node.material = blackMat;
                node.add(wireframe);
            }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 6;
        const scale = targetSize / maxDim;
        model.scale.set(scale, scale, scale);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.sub(center);

        pivot.add(model);
    });
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (window.innerWidth < 768) return;
    pivot.rotation.y += 0.02;
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        if (!isInitialized) init();
        else if (container.clientWidth > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
});

init();