// from @mrdoob http://www.mrdoob.com/lab/javascript/webgl/city/01/

var THREEx = THREEx || {}

THREEx.ProceduralCity = function (renderer, num, xmin, xmax, zmin, zmax) {
    var geometry = new THREE.CubeGeometry(1, 1, 1);
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
    //geometry.faces.splice(3, 1);
    //geometry.faceVertexUvs[0].splice(3, 1);

    //geometry.faceVertexUvs[0][2][0].set(0, 0);
    //geometry.faceVertexUvs[0][2][1].set(0, 0);
    //geometry.faceVertexUvs[0][2][2].set(0, 0);
    //geometry.faceVertexUvs[0][2][3].set(0, 0);

    var buildingMesh = new THREE.Mesh(geometry);
    var light = new THREE.Color(0xffffff)
    var shadow = new THREE.Color(0x111111)

    var cityGeometry = new THREE.Geometry();

    for (var i = 0; i < num; i++) {
        buildingMesh.position.x = randomIntFromInterval(xmin, xmax);
        buildingMesh.position.z = randomIntFromInterval(zmin, zmax);

        buildingMesh.rotation.y = Math.random() * Math.PI * 2;

        buildingMesh.scale.x = Math.random() * Math.random() * Math.random() * Math.random() * Math.max(xmax - xmin - 10, 0) + 10;
        buildingMesh.scale.y = (Math.random() * Math.random() * Math.random() * buildingMesh.scale.x) * 8 + 8;
        buildingMesh.scale.z = buildingMesh.scale.x

        var value = 1 - Math.random() * Math.random();
        var baseColor = new THREE.Color().setRGB(value + Math.random() * 0.1, value, value + Math.random() * 0.1);
        var topColor = baseColor.clone().multiply(light);
        var bottomColor = baseColor.clone().multiply(shadow);
        var geometry = buildingMesh.geometry;

        for (var j = 0, jl = geometry.faces.length; j < jl; j++) {
            if (j === 2) {
                geometry.faces[j].vertexColors = [baseColor, baseColor, baseColor, baseColor];
            } else {
                geometry.faces[j].vertexColors = [topColor, bottomColor, bottomColor, topColor];
            }
        }

        buildingMesh.updateMatrix();
        cityGeometry.merge(buildingMesh.geometry, buildingMesh.matrix);
        //THREE.GeometryUtils.merge(cityGeometry, buildingMesh);
    }

    var texture = new THREE.Texture(generateTextureCanvas());
    texture.anisotropy = renderer.getMaxAnisotropy();
    texture.needsUpdate = true;

    var material = new THREE.MeshLambertMaterial({
        map: texture,
        vertexColors: THREE.VertexColors
    });

    var mesh = new THREE.Mesh(cityGeometry, material);
    return mesh;
}

function generateTextureCanvas() {
    var canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    var context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 32, 64);
    for (var y = 2; y < 64; y += 2) {
        for (var x = 0; x < 32; x += 2) {
            var value = Math.floor(Math.random() * 64);
            context.fillStyle = 'rgb(' + [value, value, value].join(',') + ')';
            context.fillRect(x, y, 2, 1);
        }
    }

    var canvas2 = document.createElement('canvas');
    canvas2.width = 512;
    canvas2.height = 1024;
    var context = canvas2.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
    return canvas2;
}
