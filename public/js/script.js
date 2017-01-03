var game = {
    init: function () {
        document.getElementById('title').style.display = "none";
        document.getElementById('enter').style.display = "none";
        document.getElementById('loading').style.display = "inline-block";

        var stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
        game.stats = stats;

        game.progress_load = document.getElementById('progress');
        game.progress_text = document.getElementById('load_text');
        setTimeout(function () {
            game._init();
        }, 60);
    },

    _init: function () {
        game.paused = false;
        game.ended = false;
        game.loop_functions = [];
        game.w = 20;
        game.h = 20;
        game.actual_w = 20 * (1 + 2 * game.w);
        game.actual_h = 20 * (1 + 2 * game.h);
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
                            game.create_plane();

                            //Game Constants
                            setTimeout(function () {
                                game.progress_text.innerHTML = "Loading: Boring game stuff";
                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
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

                                        var loader = new THREE.JSONLoader();

                                        loader.load('../models/basic-zombie.json', function (geometry) {
                                            game.zombie_geometry = geometry;


                                            game.generate_zombies();

                                            setTimeout(function () {
                                                game.progress_text.innerHTML = "Loading: Your ability to move";
                                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";
                                                game.gen_controls();
                                                setTimeout(function () {
                                                    game.progress_text.innerHTML = "Loading: The final countdown";
                                                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + "px";

                                                    //Drawing scene
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
                                        });
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

    create_plane: function () {
        //Ground
        var floorTexture = new THREE.ImageUtils.loadTexture('./img/gravel.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(game.actual_w * 2, game.actual_h * 2);
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
        game.minimap.style.width = 20 * game.w + "px";
        game.minimap.style.height = 20 * game.h + "px";
        game.minimap.style.top = "0px";
        game.minimap.style.left = "0px";
        game.minimap.width = 20 * (game.w);
        game.minimap.height = 20 * (game.h);
        var out = new my.ProceduralMaze(game.minimap, game.w, game.h, game.start_x, game.start_z);
        game.map = out.map;
        game.bc = out.c;
        game.fog.height = 20 * (game.h);
        game.fog.width = 20 * (game.w);
        game.fog.style.left = "0px";
        game.fog.style.top = "0px";
        game.fog.style.width = 20 * game.w + "px";
        game.fog.style.height = 20 * game.h + "px";
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


        var grid = transpose(game.city_map);
        game.grid = new PF.Grid(grid);

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

    generate_zombies: function () {
        //Zombies
        game.zombies = [];

        for (var i = 0; i < 14; i++) {
            let alg_num = randomIntFromInterval(1, 9);
            switch (alg_num) {
            case 1:
                var finder = new PF.AStarFinder();
                break;
            case 2:
                var finder = new PF.BestFirstFinder();
                break;
            case 3:
                var finder = new PF.BreadthFirstFinder();
                break;
            case 4:
                var finder = new PF.DijkstraFinder();
                break;
            case 5:
                var finder = new PF.JumpPointFinder();
                break;
            case 6:
                var finder = new PF.BiAStarFinder();
                break;
            case 7:
                var finder = new PF.BiBestFirstFinder();
                break;
            case 8:
                var finder = new PF.BiBreadthFirstFinder();
                break;
            case 9:
                var finder = new PF.BiDijkstraFinder();
                break;
            }

            let z = new zombie(finder, randomIntFromInterval(3, 5));
            game.zombies.push(z);
        }
    },

    gen_controls: function () {
        //Movement Controls
        game.controls = new THREE.FirstPersonControls(game.camera);
        game.controls.movementSpeed = 20;
        game.controls.lookSpeed = 0.1;
        game.controls.lookVertical = true;
        //game.controls.constrainVertical = true;
    },

    end: function () {
        game.scene.fog.density = 0.2;
        game.scene.fog.color.setRGB(1, 0, 0);
        game.paused = true;
        game.ended = true;
    },

    reset: function () {
        document.getElementById('welcome').style.display = "";
        document.getElementById('title').style.display = "";
        document.getElementById('enter').style.display = "";
        document.body.removeChild(game.renderer.domElement);
        document.body.removeChild(game.stats.dom);
        document.getElementById('map-container').style.display = "none";
        game.controls = null;
        game.renderer = null;
        game.scene = null;
        game.paused = false;
        game.ended = false;
    },

    init_loop_functions: function () {
        //Loop Calls
        //Controls
        game.loop_functions.push(
            function (delta, now) {
                game.controls.update(delta);
                game.camera.position.y = 1;
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
                game.step_x = step_x;
                game.step_z = step_z;

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
                        step_z--;
                    } else if (index == 1) {
                        position.z = step_z * game.block_z - game.actual_h / 2;
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                        step_z--;
                        step_x++;
                    } else if (index == 2) {
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                        step_x++;
                    } else if (index == 3) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                        position.x = (step_x + 1) * game.block_x - game.actual_w / 2;
                        step_z++;
                        step_x++;
                    } else if (index == 4) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                        step_z++;
                    } else if (index == 5) {
                        position.z = (step_z + 1) * game.block_z - game.actual_h / 2;
                        position.x = step_x * game.block_x - game.actual_w / 2;
                        step_z++;
                        step_x--;
                    } else if (index == 6) {
                        position.x = step_x * game.block_x - game.actual_w / 2;
                        step_x--;
                    } else if (index == 7) {
                        position.z = step_z * game.block_z - game.actual_h / 2;
                        position.x = step_x * game.block_x - game.actual_w / 2;
                        step_z--;
                        step_x--;
                    }

                    game.step_x = step_x;
                    game.step_z = step_z;
                }
            }
        );

        //Zombie Logic
        game.loop_functions.push(
            function (delta, now) {
                var position = game.camera.position;
                var step_x = game.step_x;
                var step_z = game.step_z;

                var min_dist = 999999999;
                var closest_z = '';
                var best_theta = 0;

                var look_vector = new THREE.Vector3(0, 0, -1);
                look_vector.applyQuaternion(game.camera.quaternion);

                for (var i = 0; i < game.zombies.length; i++) {
                    let grid = game.grid.clone();
                    let z = game.zombies[i];
                    let path = z.alg.findPath(z.step_x, z.step_z, step_x, step_z, grid);
                    var speed = z.speed * delta;
                    var curr_x = z.x;
                    var curr_z = z.z;

                    if (path.length >= 2 && !(z.step_x == step_x && z.step_z == step_z)) {
                        var next_coord = path[1];
                        var next_x = (next_coord[0] + 0.5) * game.block_x - game.actual_w / 2;
                        var next_z = (next_coord[1] + 0.5) * game.block_z - game.actual_h / 2;
                    } else {
                        var next_x = position.x;
                        var next_z = position.z;
                    }

                    var dir = new THREE.Vector3(next_x - curr_x, 0, next_z - curr_z).normalize().multiplyScalar(speed);
                    //TODO: more natural movement + some randomness
                    z.x += dir.x;
                    z.z += dir.z;
                    z.update();

                    var dist = Math.sqrt(Math.pow(z.x - position.x, 2) + Math.pow(z.z - position.z, 2));

                    if (dist < 1) {
                        game.end();
                    }

                    //Local Fog Logic
                    //var cos_theta = (look_vector.x * (z.x - position.x) + look_vector.z * (z.z - position.z)) / (Math.sqrt(Math.pow(look_vector.x, 2) + Math.pow(look_vector.z, 2)) * Math.sqrt(Math.pow((z.x - position.x), 2) + Math.pow((z.z - position.z), 2)));
                    //var theta = Math.acos(cos_theta);

                    var flag = false;

                    //if (theta < Math.PI / 2) {
                    if ((z.step_x == game.step_x || z.step_x == game.step_x - 1 || z.step_x == game.step_x + 1) && (z.step_z == game.step_z || z.step_z == game.step_z - 1 || z.step_z == game.step_z + 1)) {
                        flag = true;
                    } else {
                        if (z.step_x == game.step_x) {
                            let start = Math.min(z.step_z, game.step_z);
                            let stop = Math.max(z.step_z, game.step_z);
                            if (stop - start < 6) {
                                flag = true;
                                for (var j = start; j < stop; j++) {
                                    if (game.city_map[z.step_x][j] == 1) {
                                        flag = false;
                                        break;
                                    }
                                }
                            }
                        } else if (z.step_z == game.step_z) {
                            let start = Math.min(z.step_x, game.step_x);
                            let stop = Math.max(z.step_x, game.step_x);
                            if (stop - start < 6) {
                                flag = true;
                                for (var j = start; j < stop; j++) {
                                    if (game.city_map[j][z.step_z] == 1) {
                                        flag = false;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    //}

                    //if (flag == true) {
                    min_dist = Math.min(dist, min_dist);
                    if (dist == min_dist) {
                        closest_z = z;
                        //best_theta = theta;
                    }
                    //}
                }

                //console.log(min_dist, 1 / Math.max(Math.pow(min_dist, 2), 1), theta / Math.PI * 180);

                var factor = 1; //(best_theta < Math.PI / 3) ? 1 : (best_theta < Math.PI / 1.5) ? (Math.cos((best_theta - Math.PI / 3) * (Math.PI / (Math.PI / 1.5 - Math.PI / 3))) + 1) / 2 : 0;
                game.scene.fog.density = Math.max(Math.max(1 / Math.max(min_dist / 2.01, 1), 0.025) * factor, 0.025);

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

                var xb = game.minimap.width / game.w;
                var zb = game.minimap.height / game.h;
                var xbuffer = xb / 2;
                var zbuffer = zb / 2;
                var xtot = 2 * xbuffer + xb * (game.w - 1);
                var ztot = 2 * zbuffer + zb * (game.h - 1);
                var cdx = Math.sign(curr_x - xtot / 2) * Math.pow((curr_x - xtot / 2) / (xtot / 2), 1) * (curr_x - xtot / 2);
                var cdz = Math.sign(curr_z - ztot / 2) * Math.pow((curr_z - ztot / 2) / (ztot / 2), 1) * (curr_z - ztot / 2);

                game.minimap.width = game.minimap.width;
                game.fog.width = game.fog.width;
                game.minimap.style.left = 200 / 2 - xtot / 2 - cdx + "px";
                game.minimap.style.top = 200 / 2 - ztot / 2 - cdz + "px";
                game.fog.style.left = 200 / 2 - xtot / 2 - cdx + "px";
                game.fog.style.top = 200 / 2 - ztot / 2 - cdz + "px";

                ctx.drawImage(game.bc, 0, 0);

                var radius = 6;
                ctx.beginPath();
                ctx.arc(curr_x, curr_z, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'darkred';
                ctx.stroke();

                for (var i = 0; i < game.zombies.length; i++) {
                    let z = game.zombies[i];
                    let z_curr_x = (z.x + game.actual_w / 2) / game.actual_w * game.minimap.width;
                    let z_curr_z = (z.z + game.actual_h / 2) / game.actual_h * game.minimap.height;

                    ctx.beginPath();
                    ctx.arc(z_curr_x, z_curr_z, radius - 2, 0, 2 * Math.PI, false);
                    ctx.fillStyle = 'green';
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'darkgreen';
                    ctx.stroke();
                }

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
                game.stats.begin();
                game.last = game.last || now - 1000 / 60;
                var delta = Math.min(200, now - game.last);
                game.last = now;

                game.loop_functions.forEach(
                    function (update_function) {
                        update_function(delta / 1000, now / 1000);
                    }
                );
                game.stats.end();

                if (!game.paused) {
                    requestAnimationFrame(animate);
                }

                if (game.ended) {
                    game.reset();
                }
            }
        );
    }
}

var zombie = function (alg, speed) {
    var start_x = randomIntFromInterval(0, game.w - 1);
    var start_z = randomIntFromInterval(0, game.h - 1);
    var material = new THREE.MeshLambertMaterial({
        map: texture,
        vertexColors: THREE.VertexColors
    });

    var obj = new THREE.Mesh(game.zombie_geometry, material);

    obj.position.set(x, 0.7, z);
    obj.castShadow = true;
    obj.receiveShadow = true;

    var x = (start_x * 2 + 1.5) * game.block_x - game.actual_w / 2;
    var z = (start_z * 2 + 1.5) * game.block_z - game.actual_h / 2;
    var step_x = ((x + game.actual_w / 2) / game.block_x) | 0;
    var step_z = ((z + game.actual_h / 2) / game.block_z) | 0;

    if (game.scene) {
        game.scene.add(obj);
        return {
            x: x,
            z: z,
            step_x: step_x,
            step_z: step_z,
            speed: speed,
            alg: alg,
            obj: obj,
            update: function () {
                this.obj.position.x = this.x;
                this.obj.position.z = this.z;
                this.step_x = ((this.x + game.actual_w / 2) / game.block_x) | 0;
                this.step_z = ((this.z + game.actual_h / 2) / game.block_z) | 0;
            }
        };
    } else {
        return null;
    }
}

window.onload = function () {
    document.getElementById('enter').onclick = function () {
        game.init();
    }
}

window.onresize = function () {
    if (game.renderer) {
        game.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function transpose(a) {
    var arrLen = a.length;
    var b = JSON.parse(JSON.stringify(a));

    for (var i = 0; i < arrLen; i++) {
        for (var j = 0; j < i; j++) {
            var temp = b[i][j];
            b[i][j] = b[j][i];
            b[j][i] = temp;
        }
    }
    return b;
}
