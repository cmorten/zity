const express = require('express');
const bodyParser = require('body-parser');
const cfenv = require('cfenv');

const app = express();
const appEnv = cfenv.getAppEnv();
const port = appEnv.port || 3030;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(`${__dirname}/public`));

app.listen(port, '0.0.0.0', () => {
    console.log(`server starting on ${appEnv.url}`);
});
