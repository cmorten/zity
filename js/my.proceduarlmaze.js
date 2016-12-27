// from @mrdoob http://www.mrdoob.com/lab/javascript/webgl/city/01/

var my = my || {}

my.ProceduralMaze = function (map_canvas, w, h, start_x, start_y) {

    // generate the maze array
    // 1s are blocks to contain buildings and unaccessible
    // 0s are "path" blocks
    var map = [];

    //console.log(map_canvas);

    map_canvas.width = 200;
    map_canvas.height = 200;

    var backCanvas = document.createElement('canvas');
    backCanvas.width = map_canvas.width;
    backCanvas.height = map_canvas.height;

    var ctx = backCanvas.getContext('2d');
    ctx.clearRect(0, 0, map_canvas.width, map_canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;

    var x_block = map_canvas.width / w;
    var y_block = map_canvas.height / h;
    var buffer = x_block / 2;

    for (var i = 0; i < w; i++) {
        map[i] = [];
        for (var j = 0; j < h; j++) {
            //access [top, right, bottom, left]
            map[i].push({
                touched: 0,
                bounds: [1, 1, 1, 1]
            });
        }
    }

    map[start_x][start_y].touched = 1;

    var av_list = [];
    av_list.push([start_x, start_y]);
    var count = 0;

    var restart = true;
    var last = [0, 0];

    while (av_list.length < w * h) {
        //if (restart) {
        var rand_pos = randomIntFromInterval(0, av_list.length - 1);
        var x = av_list[rand_pos][0];
        var y = av_list[rand_pos][1];

        restart = false;
        /* } else {
             var x = last[0];
             var y = last[1];
         }*/

        //console.log("choose coords: (" + x + ", " + y + ")");

        var sum = map[x][y].bounds.reduce((a, b) => a + b, 0);
        //console.log("number of options: " + sum);

        if (sum == 0) {
            //console.log("skipping as no options...");
            restart = true;
            continue;
        }

        var rand_bound = -1;
        var escape = 0;
        while (rand_bound < 0 && escape < 8) {
            let p = randomIntFromInterval(0, 3);
            //console.log("trying bound: " + p);
            if (map[x][y].bounds[p] == 1) {
                //console.log("accepted bound: " + p);
                rand_bound = p;
                break;
            }
            escape++;
        }

        if (escape >= 8) {
            //console.log("escaping as no options...");
            restart = true;
            continue;
        }

        var done_bool = false;

        var rand_bypass = randomIntFromInterval(-20, 6);

        if (!(rand_bound == 0 && y == 0) && !(rand_bound == 1 && x == w - 1) && !(rand_bound == 2 && y == h - 1) && !(rand_bound == 3 && x == 0)) {
            if (rand_bound == 0) {
                if ((map[x][y - 1].touched == 0 || rand_bypass > 5) && x > -1 && x < w && y - 1 > -1 && y - 1 < h) {
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
                if ((map[x + 1][y].touched == 0 || rand_bypass > 5) && x + 1 > -1 && x + 1 < w && y > -1 && y < h) {
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
                if ((map[x][y + 1].touched == 0 || rand_bypass > 5) && x > -1 && x < w && y + 1 > -1 && y + 1 < h) {
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
                if ((map[x - 1][y].touched == 0 || rand_bypass > 5) && x - 1 > -1 && x - 1 < w && y > -1 && y < h) {
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
        c: backCanvas
    };
}