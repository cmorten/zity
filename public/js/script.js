const game = {
    init() {
        document.getElementById('title').style.display = 'none';
        document.getElementById('enter').style.display = 'none';
        document.getElementById('loading').style.display = 'inline-block';

        const stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);

        game.stats = stats;
        game.progress_load = document.getElementById('progress');
        game.progress_text = document.getElementById('load_text');
        game.timer = document.getElementById('timer');

        setTimeout(function () {
            game._init();
        }, 60);
    },

    _init() {
        game.paused = false;
        game.ended = false;
        game.loop_functions = [];
        game.w = 14;
        game.h = 14;
        game.actual_w = 20 * (1 + 2 * game.w);
        game.actual_h = 20 * (1 + 2 * game.h);
        game.progress_load.style.width = '0px';
        game.base_fog_level = 0.005;

        // scene
        setTimeout(function () {
            game.progress_text.innerHTML = 'Loading: The frightful fog';
            game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
            game.scene = new THREE.Scene();
            game.scene.fog = new THREE.FogExp2(0xFFFDE1, game.base_fog_level);
            game.scene.background = new THREE.Color(0xFFFDE1);

            // renderer
            setTimeout(function () {
                game.progress_text.innerHTML = 'Loading: A terrifying renderer';
                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                game.renderer = new THREE.WebGLRenderer({
                    antialias: false
                });
                game.renderer.setSize(window.innerWidth, window.innerHeight);
                game.renderer.setClearColor(0xFFFDE1, 1);
                game.renderer.shadowMap.enabled = true;
                game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                // camera
                setTimeout(function () {
                    game.progress_text.innerHTML = 'Loading: Ghostly camera';
                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                    game.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 3000);
                    game.camera.position.y = 1;

                    // lighting
                    setTimeout(function () {
                        game.progress_text.innerHTML = 'Loading: Spooky lighting';
                        game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                        game.lighting();

                        // Ground
                        setTimeout(function () {
                            game.progress_text.innerHTML = 'Loading: The ground to which you cling';
                            game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                            game.create_plane();

                            // Game Constants
                            setTimeout(function () {
                                game.progress_text.innerHTML = 'Loading: Boring game stuff';
                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                                game.tot_x_cols = 2 * game.w + 1;
                                game.tot_z_cols = 2 * game.h + 1;
                                game.block_x = game.actual_w / game.tot_x_cols;
                                game.block_z = game.actual_h / game.tot_z_cols;

                                game.start_x = randomIntFromInterval(0, game.w - 1);
                                game.start_z = randomIntFromInterval(0, game.h - 1);

                                game.camera.position.x = (game.start_x * 2 + 1.5) * game.block_x - game.actual_w / 2;
                                game.camera.position.z = (game.start_z * 2 + 1.5) * game.block_z - game.actual_h / 2;

                                setTimeout(function () {
                                    game.progress_text.innerHTML = 'Loading: An endless maze';
                                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                                    game.generate_maze();

                                    setTimeout(function () {
                                        game.progress_text.innerHTML = 'Loading: The last city you\'ll ever see';
                                        game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                                        game.generate_city();

                                        const loader = new THREE.JSONLoader();
                                        loader.load('./models/bob_walk_tex.json', function (geometry, materials) {
                                            game.zombie_geometry = geometry;

                                            materials.forEach(function (material) {
                                                material.skinning = true;
                                            });

                                            game.zombie_material = new THREE.MeshFaceMaterial(materials);

                                            game.zombies = [];
                                            game.generate_zombies();

                                            setTimeout(function () {
                                                game.progress_text.innerHTML = 'Loading: Your ability to move';
                                                game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';
                                                game.gen_controls();

                                                setTimeout(function () {
                                                    game.progress_text.innerHTML = 'Loading: The final countdown';
                                                    game.progress_load.style.width = parseFloat(game.progress_load.style.width) + 40 + 'px';

                                                    // Drawing scene
                                                    game.init_loop_functions();
                                                    game.draw();

                                                    setTimeout(function () {
                                                        document.getElementById('loading').style.display = 'none';
                                                        document.getElementById('welcome').style.display = 'none';
                                                        document.getElementById('map-container').style.display = 'inline-block';
                                                        document.getElementById('timer').style.display = 'inline-block';
                                                        document.body.appendChild(game.renderer.domElement);
                                                        game.start_time = new Date();
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

    lighting() {
        // General Ambience lighting
        const light = new THREE.HemisphereLight(0xffffff, 0x101020, 0.6);
        game.light = light;
        light.position.set(10, 1000, 0.25);
        game.scene.add(light);

        // Moonlight
        const spotLight = new THREE.SpotLight(0xFFFDE1, 0.6);
        game.spotLight = spotLight;
        spotLight.position.set(-100, 300, -100);
        spotLight.castShadow = true;
        spotLight.target.position.set(0, 0, 0);
        game.scene.add(spotLight);
        game.scene.add(spotLight.target);
    },

    create_plane() {
        // Ground
        const floorTexture = new THREE.ImageUtils.loadTexture('./img/gravel.jpg');
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(game.actual_w * 2, game.actual_h * 2);
        floorTexture.needsUpdate = true;

        const floorMaterial = new THREE.MeshLambertMaterial({
            map: floorTexture
        });

        const geometry = new THREE.PlaneGeometry(game.actual_w, game.actual_h);
        const plane = new THREE.Mesh(geometry, floorMaterial);
        game.plane = plane;
        plane.rotation.x = -90 * Math.PI / 180;
        plane.castShadow = false;
        plane.receiveShadow = true;
        game.scene.add(plane);
    },

    generate_maze() {
        // Maze map logic
        game.minimap = document.getElementById('minimap');
        game.fog = document.getElementById('fog');
        game.minimap.style.width = 20 * game.w + 'px';
        game.minimap.style.height = 20 * game.h + 'px';
        game.minimap.style.top = '0px';
        game.minimap.style.left = '0px';
        game.minimap.width = 20 * (game.w);
        game.minimap.height = 20 * (game.h);

        const out = new ProceduralMaze(game.minimap, game.w, game.h, game.start_x, game.start_z);
        game.map = out.map;
        game.bc = out.c;
        game.fog.height = 20 * (game.h);
        game.fog.width = 20 * (game.w);
        game.fog.style.left = '0px';
        game.fog.style.top = '0px';
        game.fog.style.width = 20 * game.w + 'px';
        game.fog.style.height = 20 * game.h + 'px';
        game.fog.width = game.minimap.width;
        game.fog.height = game.minimap.height;
    },

    generate_city() {
        // Generate city geometry
        game.city_map = [];
        game.cityGeometry = new THREE.Geometry();

        for (let i = 0; i < game.tot_x_cols; i++) {
            game.city_map[i] = [];
            for (let j = 0; j < game.tot_z_cols; j++) {
                game.city_map[i][j] = 0;
            }
        }

        for (let i = 0; i < game.tot_x_cols; i++) {
            for (let j = 0; j < game.tot_z_cols; j++) {
                if (i == 0 || j == 0 || i == game.tot_x_cols - 1 || j == game.tot_z_cols - 1) {
                    game.city_map[i][j] = 1;
                    const city = new ProceduralCity(game.renderer, 6, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                    city.updateMatrix();
                    game.cityGeometry.merge(city.geometry, city.matrix);
                }

                if (i % 2 == 0 && j % 2 == 0) {
                    game.city_map[i][j] = 1;
                    const city = new ProceduralCity(game.renderer, 6, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                    city.updateMatrix();
                    game.cityGeometry.merge(city.geometry, city.matrix);
                }

                if ((i - 1) % 2 == 0 && (j - 1) % 2 == 0) {
                    let x = (i - 1) / 2;
                    let z = (j - 1) / 2;
                    let bounds = game.map[x][z].bounds;

                    if (j - 1 > 0 && bounds[0] == 1) {
                        game.city_map[i][j - 1] = 1;
                        const city = new ProceduralCity(game.renderer, 6, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, (j - 1) * game.block_z - game.actual_h / 2 + 5, j * game.block_z - game.actual_h / 2 - 5);
                        city.updateMatrix();
                        game.cityGeometry.merge(city.geometry, city.matrix);
                    }
                    if (i + 1 < game.tot_x_cols && bounds[1] == 1) {
                        game.city_map[i + 1][j] = 1;
                        const city = new ProceduralCity(game.renderer, 6, (i + 1) * game.block_x - game.actual_w / 2 + 5, (i + 2) * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                        city.updateMatrix();
                        game.cityGeometry.merge(city.geometry, city.matrix);
                    }
                    if (j + 1 < game.tot_z_cols && bounds[2] == 1) {
                        game.city_map[i][j + 1] = 1;
                        const city = new ProceduralCity(game.renderer, 6, i * game.block_x - game.actual_w / 2 + 5, (i + 1) * game.block_x - game.actual_w / 2 - 5, (j + 1) * game.block_z - game.actual_h / 2 + 5, (j + 2) * game.block_z - game.actual_h / 2 - 5);
                        city.updateMatrix();
                        game.cityGeometry.merge(city.geometry, city.matrix);
                    }
                    if (x - 1 > 0 && bounds[3] == 1) {
                        game.city_map[i - 1][j] = 1;
                        const city = new ProceduralCity(game.renderer, 6, (i - 1) * game.block_x - game.actual_w / 2 + 5, i * game.block_x - game.actual_w / 2 - 5, j * game.block_z - game.actual_h / 2 + 5, (j + 1) * game.block_z - game.actual_h / 2 - 5);
                        city.updateMatrix();
                        game.cityGeometry.merge(city.geometry, city.matrix);
                    }
                }
            }
        }

        const grid = transpose(game.city_map);
        game.grid = new PF.Grid(grid);

        const texture = new THREE.Texture(generateTextureCanvas());
        texture.anisotropy = game.renderer.getMaxAnisotropy();
        texture.needsUpdate = true;

        const material = new THREE.MeshLambertMaterial({
            map: texture,
            vertexColors: THREE.VertexColors
        });

        game.cityMesh = new THREE.Mesh(game.cityGeometry, material);
        game.cityMesh.castShadow = true;
        game.cityMesh.receiveShadow = true;
        game.scene.add(game.cityMesh);
    },

    generate_zombies() {
        // Zombies
        let zombie_count_to_add = 2;
        if (game.zombies.length == 0) {
            zombie_count_to_add = 6;
            game.counts = 0.25;
        }

        for (let i = 0; i < zombie_count_to_add; i++) {
            const alg_num = randomIntFromInterval(1, 9);
            let finder;
            switch (alg_num) {
                case 1:
                    finder = new PF.AStarFinder();
                    break;
                case 2:
                    finder = new PF.BestFirstFinder();
                    break;
                case 3:
                    finder = new PF.BreadthFirstFinder();
                    break;
                case 4:
                    finder = new PF.DijkstraFinder();
                    break;
                case 5:
                    finder = new PF.JumpPointFinder();
                    break;
                case 6:
                    finder = new PF.BiAStarFinder();
                    break;
                case 7:
                    finder = new PF.BiBestFirstFinder();
                    break;
                case 8:
                    finder = new PF.BiBreadthFirstFinder();
                    break;
                case 9:
                    finder = new PF.BiDijkstraFinder();
                    break;
            }

            const z = new zombie(finder, 2);
            game.zombies.push(z);
        }

        game.counts *= 2;

        if (!game.paused && !game.ended) {
            setTimeout(function () {
                game.generate_zombies();
            }, game.counts * 10000);
        }
    },

    gen_controls() {
        // Movement Controls
        game.controls = new THREE.FirstPersonControls(game.camera);
        game.controls.movementSpeed = 3.5;
        game.controls.lookSpeed = 0.1;
        game.controls.lookVertical = true;
    },

    end() {
        game.scene.fog.density = 0.2;
        game.scene.fog.color.setRGB(1, 0, 0);
        game.paused = true;
        game.ended = true;
    },

    reset() {
        document.getElementById('welcome').style.display = '';
        document.getElementById('title').style.display = '';
        document.getElementById('enter').style.display = '';
        document.body.removeChild(game.renderer.domElement);
        document.body.removeChild(game.stats.dom);
        document.getElementById('map-container').style.display = 'none';
        document.getElementById('timer').style.display = 'none';
        game.controls = null;
        game.renderer = null;
        game.scene = null;
        game.paused = false;
        game.ended = false;
    },

    init_loop_functions() {
        // Loop Calls
        // Controls
        game.loop_functions.push(
            function (delta) {
                game.controls.update(delta);
                game.camera.position.y = 1;

                let diff = (new Date() - game.start_time) / 1000;
                let str = '';

                const hours = (diff / 3600) | 0;
                str += (hours > 0) ? hours + ' hours, ' : '';
                diff -= hours * 3600;

                const minutes = (diff / 60) | 0;
                str += (minutes > 0) ? minutes + ' mins, ' : '';
                diff -= minutes * 60;
                str += (diff > 0) ? (diff | 0) + ' s' : '';
                game.timer.innerHTML = 'Stayed Alive ' + str;
                game.base_fog_level = Math.min(0.05, game.base_fog_level + delta / 4000);
            }
        );

        // Collision Logic
        game.loop_functions.push(
            function () {
                const position = game.camera.position;
                const x = position.x;
                const z = position.z;
                let step_x = ((x + game.actual_w / 2) / game.block_x) | 0;
                let step_z = ((z + game.actual_h / 2) / game.block_z) | 0;
                game.step_x = step_x;
                game.step_z = step_z;

                if (game.city_map[step_x][step_z] == 1) {
                    // Then in a city block, need to move player back into non-city square
                    const d_top = (step_z - 1 > 0 && game.city_map[step_x][step_z - 1] == 0) ? Math.pow(x - ((step_x + 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_t_r = (step_z - 1 > 0 && step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z - 1] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_right = (step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_b_r = (step_z + 1 < game.tot_z_cols && step_x + 1 < game.tot_x_cols && game.city_map[step_x + 1][step_z + 1] == 0) ? Math.pow(x - ((step_x + 1.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_bottom = (step_z + 1 < game.tot_z_cols && game.city_map[step_x][step_z + 1] == 0) ? Math.pow(x - ((step_x + 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_b_l = (step_z + 1 < game.tot_z_cols && step_x - 1 > 0 && game.city_map[step_x - 1][step_z + 1] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 1.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_left = (step_x - 1 > 0 && game.city_map[step_x - 1][step_z] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z + 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;
                    const d_t_l = (step_z - 1 > 0 && step_x - 1 > 0 && game.city_map[step_x - 1][step_z - 1] == 0) ? Math.pow(x - ((step_x - 0.5) * game.block_x - game.actual_w / 2), 2) + Math.pow(z - ((step_z - 0.5) * game.block_z - game.actual_h / 2), 2) : 99999;

                    const tmp = [d_top, d_t_r, d_right, d_b_r, d_bottom, d_b_l, d_left, d_t_l];
                    const index = tmp.reduce((iMin, x, i, arr) => x < arr[iMin] ? i : iMin, 0);

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

        // Zombie Logic
        game.loop_functions.push(
            function (delta) {
                const position = game.camera.position;
                const step_x = game.step_x;
                const step_z = game.step_z;
                let min_dist = 999999999;

                const look_vector = new THREE.Vector3(0, 0, -1);
                look_vector.applyQuaternion(game.camera.quaternion);

                for (let i = 0; i < game.zombies.length; i++) {
                    const grid = game.grid.clone();
                    const z = game.zombies[i];
                    const path = z.alg.findPath(z.step_x, z.step_z, step_x, step_z, grid);
                    const dist = Math.sqrt(Math.pow(z.x - position.x, 2) + Math.pow(z.z - position.z, 2));
                    const speedup = Math.min(2, Math.max(1, 20 / dist));
                    const speed = z.speed * delta * speedup;
                    const curr_x = z.x;
                    const curr_z = z.z;

                    let next_x = position.x;
                    let next_z = position.z;

                    if (path.length >= 2 && !(z.step_x == step_x && z.step_z == step_z)) {
                        const next_coord = path[1];
                        next_x = (next_coord[0] + 0.5) * game.block_x - game.actual_w / 2;
                        next_z = (next_coord[1] + 0.5) * game.block_z - game.actual_h / 2;
                    }

                    const dir = new THREE.Vector3(next_x - curr_x, 0, next_z - curr_z).normalize().multiplyScalar(speed);
                    z.x += dir.x;
                    z.z += dir.z;
                    z.update(speed / 2);

                    if (dist < 1) {
                        game.end();
                    }
                    min_dist = Math.min(dist, min_dist);
                }

                game.scene.fog.density = Math.max(1 / Math.max(min_dist / 1.5, 4), game.base_fog_level);

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
                const position = game.camera.position;
                const x = position.x;
                const z = position.z;

                const curr_x = (x + game.actual_w / 2) / game.actual_w * game.minimap.width;
                const curr_z = (z + game.actual_h / 2) / game.actual_h * game.minimap.height;

                const ctx = game.minimap.getContext('2d');
                const ctx2 = game.fog.getContext('2d');
                const r1 = 10;
                const r2 = 30;
                const overlay = 'rgba(1, 0, 0, 1)';
                const pX = curr_x;
                const pY = curr_z;

                const xb = game.minimap.width / game.w;
                const zb = game.minimap.height / game.h;
                const xbuffer = xb / 2;
                const zbuffer = zb / 2;
                const xtot = 2 * xbuffer + xb * (game.w - 1);
                const ztot = 2 * zbuffer + zb * (game.h - 1);
                const cdx = Math.sign(curr_x - xtot / 2) * Math.pow((curr_x - xtot / 2) / (xtot / 2), 1) * (curr_x - xtot / 2);
                const cdz = Math.sign(curr_z - ztot / 2) * Math.pow((curr_z - ztot / 2) / (ztot / 2), 1) * (curr_z - ztot / 2);

                game.minimap.width = game.minimap.width;
                game.fog.width = game.fog.width;
                game.minimap.style.left = 200 / 2 - xtot / 2 - cdx + 'px';
                game.minimap.style.top = 200 / 2 - ztot / 2 - cdz + 'px';
                game.fog.style.left = 200 / 2 - xtot / 2 - cdx + 'px';
                game.fog.style.top = 200 / 2 - ztot / 2 - cdz + 'px';

                ctx.drawImage(game.bc, 0, 0);

                const radius = 6;
                ctx.beginPath();
                ctx.arc(curr_x, curr_z, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'darkred';
                ctx.stroke();

                for (let i = 0; i < game.zombies.length; i++) {
                    const z = game.zombies[i];
                    const z_curr_x = (z.x + game.actual_w / 2) / game.actual_w * game.minimap.width;
                    const z_curr_z = (z.z + game.actual_h / 2) / game.actual_h * game.minimap.height;

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

                const radGrd = ctx.createRadialGradient(pX, pY, r1, pX, pY, r2);
                radGrd.addColorStop(0, 'rgba(0, 0, 0,  1)');
                radGrd.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
                radGrd.addColorStop(1, 'rgba(0, 0, 0,  0)');

                ctx2.globalCompositeOperation = 'destination-out';
                ctx2.fillStyle = radGrd;
                ctx2.fillRect(pX - r2, pY - r2, r2 * 2, r2 * 2);
            }
        );
    },

    draw() {
        game.last = null;

        requestAnimationFrame(
            function animate(now) {
                game.stats.begin();
                game.last = game.last || now - 1000 / 60;
                const delta = Math.min(200, now - game.last);
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

const zombie = function (alg, speed) {
    const start_x = randomIntFromInterval(0, game.w - 1, [game.start_x - 1, game.start_x, game.start_x + 1]);
    const start_z = randomIntFromInterval(0, game.h - 1, [game.start_z - 1, game.start_z, game.start_z + 1]);

    const obj = new THREE.SkinnedMesh(game.zombie_geometry, game.zombie_material);

    obj.scale.set(0.15, 0.15, 0.15);
    obj.position.set(start_x, 0, start_z);
    obj.castShadow = true;
    obj.receiveShadow = true;

    const action = {};

    const mixer = new THREE.AnimationMixer(obj);
    action.walk = mixer.clipAction(game.zombie_geometry.animations[0]);
    action.walk.setEffectiveWeight(1).play();

    const x = (start_x * 2 + 1.5) * game.block_x - game.actual_w / 2;
    const z = (start_z * 2 + 1.5) * game.block_z - game.actual_h / 2;
    const step_x = ((x + game.actual_w / 2) / game.block_x) | 0;
    const step_z = ((z + game.actual_h / 2) / game.block_z) | 0;

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
            animation: mixer,
            update(delta) {
                this.obj.position.x = this.x;
                this.obj.position.z = this.z;
                this.step_x = ((this.x + game.actual_w / 2) / game.block_x) | 0;
                this.step_z = ((this.z + game.actual_h / 2) / game.block_z) | 0;
                this.obj.lookAt(new THREE.Vector3(game.camera.position.x, 0, game.camera.position.z));
                this.animation.update(delta);
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

function randomIntFromInterval(min, max, skip) {
    if (!skip) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    } else {
        let flag = true;
        let a;
        while (flag) {
            a = Math.floor(Math.random() * (max - min + 1) + min);
            if (skip.indexOf(a) == -1) {
                flag = false;
            }
        }
        return a;
    }
}

function transpose(a) {
    const arrLen = a.length;
    const b = JSON.parse(JSON.stringify(a));

    for (let i = 0; i < arrLen; i++) {
        for (let j = 0; j < i; j++) {
            const temp = b[i][j];
            b[i][j] = b[j][i];
            b[j][i] = temp;
        }
    }
    return b;
}