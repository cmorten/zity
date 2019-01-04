function init() {
    const action = {};
    const width = window.innerWidth;
    const height = window.innerHeight;
    const loader = new THREE.JSONLoader();
    const renderer = new THREE.WebGLRenderer();
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xFFFFFF);
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 100);

    renderer.setSize(width, height);
    renderer.setClearColor(0xF0F0F0, 1);
    scene.add(ambientLight);
    camera.position.set(0, 0.5, 4);
    document.body.appendChild(renderer.domElement);

    loader.load('./models/bob_walk_tex.json', (geometry, materials) => {
        materials.forEach(m => m.skinning = true);

        const meshface = new THREE.MeshFaceMaterial(materials);
        const mesh = new THREE.SkinnedMesh(geometry, meshface);
        const mixer = new THREE.AnimationMixer(mesh);

        action.idle = mixer.clipAction(geometry.animations[0]);
        action.idle.setEffectiveWeight(1).play();
        mesh.scale.set(0.1, 0.1, 0.1);
        scene.add(mesh);

        (function update() {
            const delta = clock.getDelta();
            mixer.update(delta);
            renderer.render(scene, camera);
            requestAnimationFrame(update);
        })();
    });
}

document.onreadystatechange = () => {
    if (document.readyState === 'complete') {
        init();
    }
};