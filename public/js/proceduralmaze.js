// from @mrdoob http://www.mrdoob.com/lab/javascript/webgl/city/01/
// With modifications.

const ProceduralMaze = function (map_canvas, w, h, start_x, start_y) {
    // generate the maze array
    // 1s are blocks to contain buildings and unaccessible
    // 0s are "path" blocks
    const map = [];

    const backCanvas = document.createElement('canvas');
    backCanvas.width = map_canvas.width;
    backCanvas.height = map_canvas.height;

    const ctx = backCanvas.getContext('2d');
    ctx.clearRect(0, 0, map_canvas.width, map_canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;

    const x_block = map_canvas.width / w;
    const y_block = map_canvas.height / h;
    const buffer = x_block / 2;

    for (let i = 0; i < w; i++) {
        map[i] = [];
        for (let j = 0; j < h; j++) {
            map[i].push({
                touched: 0,
                bounds: [1, 1, 1, 1]
            });
        }
    }

    map[start_x][start_y].touched = 1;

    const av_list = [];
    av_list.push([start_x, start_y]);

    while (av_list.length < w * h) {
        const rand_pos = randomIntFromInterval(0, av_list.length - 1);
        const x = av_list[rand_pos][0];
        const y = av_list[rand_pos][1];
        const sum = map[x][y].bounds.reduce((a, b) => a + b, 0);
        let restart = false;

        if (sum == 0) {
            restart = true;
            continue;
        }

        let rand_bound = -1;
        let escape = 0;

        while (rand_bound < 0 && escape < 8) {
            const p = randomIntFromInterval(0, 3);
            if (map[x][y].bounds[p] == 1) {
                rand_bound = p;
                break;
            }
            escape++;
        }

        if (escape >= 8) {
            restart = true;
            continue;
        }

        let done_bool = false;
        let rand_bypass = randomIntFromInterval(0, 100);
        let rand_bypass_tol = 98;

        if (!(rand_bound == 0 && y == 0) && !(rand_bound == 1 && x == w - 1) && !(rand_bound == 2 && y == h - 1) && !(rand_bound == 3 && x == 0)) {
            if (rand_bound == 0) {
                if ((map[x][y - 1].touched == 0 || rand_bypass > rand_bypass_tol) && x > -1 && x < w && y - 1 > -1 && y - 1 < h) {
                    ctx.beginPath();
                    ctx.moveTo(buffer + x_block * x, buffer + y_block * y + 5);
                    ctx.lineTo(buffer + x_block * x, buffer + y_block * (y - 1) - 5);
                    ctx.stroke();
                    map[x][y - 1].bounds[2] = 0;
                    if (map[x][y - 1].touched == 0) {
                        av_list.push([x, y - 1]);
                    }
                    map[x][y - 1].touched = 1;
                    done_bool = true;
                    last = [x, y - 1];
                }
            } else if (rand_bound == 1) {
                if ((map[x + 1][y].touched == 0 || rand_bypass > rand_bypass_tol) && x + 1 > -1 && x + 1 < w && y > -1 && y < h) {
                    ctx.beginPath();
                    ctx.moveTo(buffer + x_block * x - 5, buffer + y_block * y);
                    ctx.lineTo(buffer + x_block * (x + 1) + 5, buffer + y_block * y);
                    ctx.stroke();
                    map[x + 1][y].bounds[3] = 0;
                    if (map[x + 1][y].touched == 0) {
                        av_list.push([x + 1, y]);
                    }
                    map[x + 1][y].touched = 1;
                    done_bool = true;
                    last = [x + 1, y];
                }
            } else if (rand_bound == 2) {
                if ((map[x][y + 1].touched == 0 || rand_bypass > rand_bypass_tol) && x > -1 && x < w && y + 1 > -1 && y + 1 < h) {
                    ctx.beginPath();
                    ctx.moveTo(buffer + x_block * x, buffer + y_block * y - 5);
                    ctx.lineTo(buffer + x_block * x, buffer + y_block * (y + 1) + 5);
                    ctx.stroke();
                    map[x][y + 1].bounds[0] = 0;
                    if (map[x][y + 1].touched == 0) {
                        av_list.push([x, y + 1]);
                    }
                    map[x][y + 1].touched = 1;
                    done_bool = true;
                    last = [x, y + 1];
                }
            } else if (rand_bound == 3) {
                if ((map[x - 1][y].touched == 0 || rand_bypass > rand_bypass_tol) && x - 1 > -1 && x - 1 < w && y > -1 && y < h) {
                    ctx.beginPath();
                    ctx.moveTo(buffer + x_block * x + 5, buffer + y_block * y);
                    ctx.lineTo(buffer + x_block * (x - 1) - 5, buffer + y_block * y);
                    ctx.stroke();
                    map[x - 1][y].bounds[1] = 0;
                    if (map[x - 1][y].touched == 0) {
                        av_list.push([x - 1, y]);
                    }
                    map[x - 1][y].touched = 1;
                    done_bool = true;
                    last = [x - 1, y];
                }
            }
        }

        if (done_bool) {
            map[x][y].bounds[rand_bound] = 0;
        } else {
            restart = true;
            continue;
        }
    }

    return {
        map: map,
        c: backCanvas,
    };
};