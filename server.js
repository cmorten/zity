var express = require('express');
var app = express();
var fs = require('fs');

var path = require('path');
var http = require('http');

var port = 3030;

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static('public'));

app.get('/index', function (req, res) {
    fs.readFile(__dirname + "/public/index.html", 'utf8', function (err, data) {
        res.send(data);
    });
});

var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Server instance listening: " + JSON.stringify(server.address()));
});