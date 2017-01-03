var express = require('express');
var cfenv = require('cfenv');
var app = express();
var fs = require('fs');

var path = require('path');
var http = require('http');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static(__dirname + '/public'));

var appEnv = cfenv.getAppEnv();

var port = appEnv.port || 3030;

var server = app.listen(port, '0.0.0.0', function () {
    console.log("server starting on " + appEnv.url);
});
