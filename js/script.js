var game = {
    init: function () {
        document.getElementById('title').style.display = "none";
        document.getElementById('enter').style.display = "none";
        document.getElementById('loading').style.display = "inline-block";

        game.progress_load = document.getElementById('progress');
        game.progress_text = document.getElementById('load_text');
        setTimeout(function () {
            game._init();
        }, 60);
    },

    _init: function () {
        game.loop_functions = [];
        game.actual_w = 400;
        game.actual_h = 400;
        game.progress_load.style.width = "0px";

        //scene
        setTimeout(function () {
            game.progress_text.innerHTML = "Loading: The frightful fog";
            game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
            game.scene = new THREE.Scene();
            game.scene.fog = new THREE.FogExp2(0xFFFDE1, 0.025);
            game.scene.background = new THREE.Color(0xFFFDE1);

            //renderer
            setTimeout(function () {
                game.progress_text.innerHTML = "Loading: A terrifying renderer";
                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                game.renderer = new THREE.WebGLRenderer({
                    antialias: false
                });
                game.renderer.setSize(window.innerWidth, window.innerHeight);
                game.renderer.setClearColor(0xFFFDE1, 1);
                game.renderer.shadowMapEnabled = true;
                game.renderer.shadowMapType = THREE.PCFSoftShadowMap;

                //camera
                setTimeout(function () {
                    game.progress_text.innerHTML = "Loading: Ghostly camera";
                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                    game.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 3000);
                    game.camera.position.y = 1;

                    //lighting
                    setTimeout(function () {
                        game.progress_text.innerHTML = "Loading: Spooky lighting";
                        game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                        game.lighting();

                        //Ground
                        setTimeout(function () {
                            game.progress_text.innerHTML = "Loading: The ground to which you cling";
                            game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                            game.plane();

                            //Game Constants
                            setTimeout(function () {
                                game.progress_text.innerHTML = "Loading: Boring game stuff";
                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                game.w = 12;
                                game.h = 12;
                                game.tot_x_cols = 2 * game.w + 1;
                                game.tot_z_cols = 2 * game.h + 1;
                                game.block_x = game.actual_w / game.tot_x_cols;
                                game.block_z = game.actual_h / game.tot_z_cols;

                                game.start_x = randomIntFromInterval(0, game.w - 1);
                                game.start_z = randomIntFromInterval(0, game.h - 1);

                                game.camera.position.x = (game.start_x * 2 + 1.5) * game.block_x - game.actual_w / 2;
                                game.camera.position.z = (game.start_z * 2 + 1.5) * game.block_z - game.actual_h / 2;

                                setTimeout(function () {
                                    game.progress_text.innerHTML = "Loading: An endless maze";
                                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                    game.generate_maze();
                                    setTimeout(function () {
                                        game.progress_text.innerHTML = "Loading: The last city you'll ever see";
                                        game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                        game.generate_city();
                                        setTimeout(function () {
                                            game.progress_text.innerHTML = "Loading: Your ability to move";
                                            game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                            game.controls();
                                            setTimeout(function () {
                                                game.progress_text.innerHTML = "Loading: The final countdown";
                                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                                game.init_loop_functions();
                                                game.draw();

                                                setTimeout(function () {
                                                    document.getElementById('loading').style.display = "none";
                                                    document.getElementById('welcome').style.display = "none";
                                                    document.getElementById('map-container').style.display = "inline-block";
                                                    document.body.appendChild(game.renderer.domElement);
                                                }, 2000);
                                            }, 60);
                                        }, 60);
                                    }, 60);
                                }, 60);
                            }, 60);
                        }, 60);
                    }, 60);
                }, 60);
            }, 60);
        }, 60);
    },

    lighting: function () {
        //General Ambience lighting
        var light = new THREE.HemisphereLight(0xffffff, 0x101020, 0.6);
        game.light = light;
        light.position.set(10, 1000, 0.25);
        game.scene.add(light);

        //Moonlight
        var spotLight = new THREE.SpotLight(0xFFFDE1, 0.6);
        game.spotLight = spotLight;
        spotLight.position.set(-100, 300, -100);
        spotLight.castShadow = true;
        spotLight.target.position.set(0, 0, 0);
        game.scene.add(spotLight);
        game.scene.add(spotLight.target);
    },

    plane: function () {
        //Ground
        var floorTexture = new THREE.ImageUtils.loadTexture('./img/gravel.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(300, 300);
        floorTexture.needsUpdate = true;
        var floorMaterial = new THREE.MeshLambertMaterial({
            map: floorTexture
        });

        var geometry = new THREE.PlaneGeometry(game.actual_w, game.actual_h);
        var plane = new THREE.Mesh(geometry, floorMaterial);
        game.plane = plane;
        plane.rotation.x = -90 * Math.PI / 180;
        plane.castShadow = false;
        plane.receiveShadow = true;
        game.scene.add(plane);
    },

    generate_maze: function () {
        //Maze map logic
        game.minimap = document.getElementById('minimap');
        game.fog = document.getElementById('fog');
        var out = new my.ProceduralMaze(game.minimap, game.w, game.h, game.start_x, game.start_z);
        game.map = out.map;
        game.bc = out.c;
        game.fog.width = game.minimap.width;
        game.fog.height = game.minimap.height;
    },

    generate_city: function () {
        //Generate city geometry
        game.city_map = [];
        game.cityGeometry = new THREE.Geometry();

        for (var i = 0; i < game.tot_x_cols; i++) {
            game.city_map[i] = [];
            for (var j = 0; j < game.tot_z_cols; j++) {
                game.city_map[i][j] = 0;
            }
        }

        for (var i = 0; i < game.tot_x_cols; i++) {
            for (var j = 0; j < game.tot_z_cols; j++) {
                if (i == 0 || j == 0 || i == game.tot_x_cols - 1 || j == game.tot_z_cols - 1) {
                    game.city_map[i][j] = 1;
                    var city = new THREEx.ProceduralCity(game.renderer, 20, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                    THREE.GeometryUtils.merge(game.cityGeometry, city);
                }

                if (i % 2 == 0 && j % 2 == 0) {
                    game.city_map[i][j] = 1;
                    var city = new THREEx.ProceduralCity(game.renderer, 20, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                    THREE.GeometryUtils.merge(game.cityGeometry, city);
                }

                if ((i - 1) % 2 == 0 && (j - 1) % 2 == 0) {
                    var x = (i - 1) / 2;
                    var z = (j - 1) / 2;
                    var bounds = game.map[x][z].bounds;

                    if (j - 1 > 0 && bounds[0] == 1) {
                        game.city_map[i][j - 1] = 1;
                        var city = new THREEx.ProceduralCity(game.renderer, 20, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, (j - 1) * game.block_z - game.actual_h / 2 + 5, j * game.block_z - game.actual_h / 2 - 5);
                        THREE.GeometryUtils.merge(game.cityGeometry, city);
                    }
                    if (i + 1 < game.tot_x_cols && bounds[1] == 1) {
                        game.city_map[i + 1][j] = 1;
                        var city = new THREEx.ProceduralCity(game.renderer, 20, (i + 1) * game.block_x - game.actual_w / 2 + 5, (i + 2) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                        THREE.GeometryUtils.merge(game.cityGeometry, city);
                    }
                    if (j + 1 < game.tot_z_cols && bounds[2] == 1) {
                        game.city_map[i][j + 1] = 1;
                        var city = new THREEx.ProceduralCity(game.renderer, 20, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, (j + 1) * game.block_z - game.actual_h / 2 + 5, (j + 2) * game.block_z - game.actual_h / 2 - 5);
                        THREE.GeometryUtils.merge(game.cityGeometry, city);
                    }
                    if (x - 1 > 0 && bounds[3] == 1) {
                        game.city_map[i - 1][j] = 1;
                        var city = new THREEx.ProceduralCity(game.renderer, 20, (i - 1) * game.block_x - game.actual_w / 2 + 5, i * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                        THREE.GeometryUtils.merge(game.cityGeometry, city);
                    }
                }
            }
        }

        var texture = new THREE.Texture(generateTextureCanvas());
        texture.anisotropy = game.renderer.getMaxAnisotropy();
        texture.needsUpdate = true;

        var material = new THREE.MeshLambertMaterial({
            map: texture,
            vertexColors: THREE.VertexColors
        });

        game.cityMesh = new THREE.Mesh(game.cityGeometry, material);
        game.cityMesh.castShadow = true;
        game.cityMesh.receiveShadow = true;
        game.scene.add(game.cityMesh);
    },

    controls: function () {
        //Movement Controls
        game.controls = new THREE.FirstPersonControls(game.camera);
        game.controls.movementSpeed = 30;
        game.controls.lookSpeed = 0.1;
        game.controls.lookVertical = false; //true;
        //game.controls.constrainVertical = true;
    },

    init_loop_functions: function () {
        //Loop Calls
        //Controls
        game.loop_functions.push(
            function (delta, now) {
                game.controls.update(delta);
            }
        );

        //Collision Logic
        game.loop_functions.push(
            function () {
                var position = game.camera.position;
                var x = position.x;
                var z = position.z;
                var step_x = ((x + game.actual_w / 2) / game.block_x) | 0;
                var step_z = ((z + game.actual_h / 2) / game.block_z) | 0;

                if (game.city_map[step_x][step_z] == 1) {
                    //then in a city block, need to move player back into non-city square
                    var d_top = (step_z - 1 > 0 && game.city_map[step_x][step_z - 1] == 0) ? Math.pow(x - ((step_x + 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_t_r = (step_z - 1 > 0 && step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z - 1] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_right = (step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_b_r = (step_z + 1 < game.tot_z_cols && step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z + 1] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_bottom = (step_z + 1 < game.tot_z_cols && game.city_map[step_x][step_z + 1] == 0) ? Math.pow(x - ((step_x + 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_b_l = (step_z + 1 < game.tot_z_cols && step_x - 1 > 0 && game.city_map[step_x - 1][step_z + 1] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_left = (step_x - 1 > 0 && game.city_map[step_x - 1][step_z] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    var d_t_l = (step_z - 1 > 0 && step_x - 1 > 0 && game.city_map[step_x - 1][step_z - 1] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;

                    var tmp = [d_top, d_t_r, d_right, d_b_r, d_bottom, d_b_l, d_left, d_t_l];
                    var index = tmp.reduce((iMin, x, i, arr) => x < arr[iMin] ? i : iMin, 0);

                    if (index == 0) {
                        position.z = step_z * game.block_z - game.actual_h / 2;
                    } else if (index == 1) {
                        position.z = step_z * game.block_z - game.actual_h / 2;
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                    } else if (index == 2) {
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                    } else if (index == 3) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                    } else if (index == 4) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                    } else if (index == 5) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                        position.x = step_x * game.block_x - game.actual_w / 2;
                    } else if (index == 6) {
                        position.x = step_x * game.block_x - game.actual_w / 2;
                    } else if (index == 7) {
                        position.z = step_z * game.block_z - game.actual_h / 2;
                        position.x = step_x * game.block_x - game.actual_w / 2;
                    }
                }
            }
        );

        // Draw Scene
        game.loop_functions.push(
            function () {
                game.renderer.render(game.scene, game.camera);
            }
        );

        // Minimap Logic
        game.loop_functions.push(
            function () {
                var position = game.camera.position;
                var x = position.x;
                var z = position.z;

                var curr_x = (x + game.actual_w / 2) / game.actual_w * game.minimap.width;
                var curr_z = (z + game.actual_h / 2) / game.actual_h * game.minimap.height;

                var ctx = game.minimap.getContext('2d');
                var ctx2 = game.fog.getContext('2d');
                var r1 = 10;
                var r2 = 30;
                var density = 0.4;
                var overlay = 'rgba(1, 0, 0, 1)';
                var pX = curr_x;
                var pY = curr_z;

                game.minimap.width = game.minimap.width;
                game.minimap.style.left = (100 - curr_x) / 100 * 20 + "px";
                game.minimap.style.top = (100 - curr_z) / 100 * 20 + "px";
                game.fog.style.left = (100 - curr_x) / 100 * 20 + "px";
                game.fog.style.top = (100 - curr_z) / 100 * 20 + "px";

                ctx.drawImage(game.bc, 0, 0);

                var radius = 6;
                ctx.beginPath();
                ctx.arc(curr_x, curr_z, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'darkred';
                ctx.stroke();

                ctx2.globalCompositeOperation = 'source-over';
                ctx2.clearRect(0, 0, minimap.width, minimap.height);
                ctx2.fillStyle = overlay;
                ctx2.fillRect(0, 0, minimap.width, minimap.height);

                var radGrd = ctx.createRadialGradient(pX, pY, r1, pX, pY, r2);
                radGrd.addColorStop(0, 'rgba(0, 0, 0,  1)');
                radGrd.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
                radGrd.addColorStop(1, 'rgba(0, 0, 0,  0)');

                ctx2.globalCompositeOperation = 'destination-out';
                ctx2.fillStyle = radGrd;
                ctx2.fillRect(pX - r2, pY - r2, r2 * 2, r2 * 2);
            }
        );
    },

    draw: function () {
        game.last = null;

        requestAnimationFrame(
            function animate(now) {
                requestAnimationFrame(animate);

                game.last = game.last || now - 1000 / 60;
                var delta = Math.min(200, now - game.last);
                game.last = now;

                game.loop_functions.forEach(
                    function (update_function) {
                        update_function(delta / 1000, now / 1000);
                    }
                );
            }
        );
    }
}

window.onload = function () {
    document.getElementById('enter').onclick = function () {
        game.init();
    }
}

window.onresize = function () {
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}