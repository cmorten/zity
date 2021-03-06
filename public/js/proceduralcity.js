// from @mrdoob http://www.mrdoob.com/lab/javascript/webgl/city/01/
// With modifications.

const ProceduralCity = function (renderer, num, xmin, xmax, zmin, zmax) {
    const geometry = new THREE.CubeGeometry(1, 1, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    geometry.faces.splice(4, 4);
    geometry.faceVertexUvs[0].splice(4, 4);

    const buildingMesh = new THREE.Mesh(geometry);
    const light = new THREE.Color(0xffffff)
    const shadow = new THREE.Color(0x111111)
    const cityGeometry = new THREE.Geometry();

    for (let i = 0; i < num; i++) {
        buildingMesh.position.x = randomIntFromInterval(xmin, xmax);
        buildingMesh.position.z = randomIntFromInterval(zmin, zmax);

        buildingMesh.rotation.y = Math.random() * Math.PI * 2;

        buildingMesh.scale.x = Math.random() * Math.random() * Math.random() * Math.random() * Math.max(xmax - xmin - 10, 0) + 10;
        buildingMesh.scale.y = (Math.random() * Math.random() * Math.random() * buildingMesh.scale.x) * 8 + 8;
        buildingMesh.scale.z = buildingMesh.scale.x

        const value = 1 - Math.random() * Math.random();
        const baseColor = new THREE.Color().setRGB(value + Math.random() * 0.1, value, value + Math.random() * 0.1);
        const topColor = baseColor.clone().multiply(light);
        const bottomColor = baseColor.clone().multiply(shadow);
        const geometry = buildingMesh.geometry;

        for (let j = 0, jl = geometry.faces.length; j < jl; j++) {
            if (j === 2) {
                geometry.faces[j].vertexColors = [baseColor, baseColor, baseColor, baseColor];
            } else {
                geometry.faces[j].vertexColors = [topColor, bottomColor, bottomColor, topColor];
            }
        }

        buildingMesh.updateMatrix();
        cityGeometry.merge(buildingMesh.geometry, buildingMesh.matrix);
    }

    const texture = new THREE.Texture(generateTextureCanvas());
    texture.anisotropy = renderer.getMaxAnisotropy();
    texture.needsUpdate = true;

    const material = new THREE.MeshLambertMaterial({
        map: texture,
        vertexColors: THREE.VertexColors
    });

    const mesh = new THREE.Mesh(cityGeometry, material);
    return mesh;
}

function generateTextureCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;

    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 32, 64);
    for (let y = 2; y < 64; y += 2) {
        for (let x = 0; x < 32; x += 2) {
            const value = Math.floor(Math.random() * 64);
            context.fillStyle = 'rgb(' + [value, value, value].join(',') + ')';
            context.fillRect(x, y, 2, 1);
        }
    }

    const canvas2 = document.createElement('canvas');
    canvas2.width = 512;
    canvas2.height = 1024;

    const context2 = canvas2.getContext('2d');
    context2.imageSmoothingEnabled = false;
    context2.webkitImageSmoothingEnabled = false;
    context2.mozImageSmoothingEnabled = false;
    context2.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
    return canvas2;
}