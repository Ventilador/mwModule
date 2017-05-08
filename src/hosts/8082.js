require('./../module/index.js');
require('./common.js');
var sumService = require('./../services/number/sum.js');
var divideService = require('./../services/number/divide.js');
var timesService = require('./../services/number/times.js');
var minusService = require('./../services/number/minus.js');
var squareService = require('./../services/number/square.js');
var app = require('express')();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json({ limit: '10mb' }))
    .listen(8082);

proteusMW.module('numbers', ['common'])
    .publish('divide', divideService)
    .publish('sum', sumService)
    .publish('minus', minusService)
    .publish('square', squareService)
    .publish('times', timesService);
proteusMW.bootstrap(['numbers'], {
    app: app
}, {}).then(function (injector) {
});




