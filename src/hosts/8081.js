require('./../module/index.js');
require('./common.js');
var concatService = require('./../services/array/concat.js');
var app = require('express')();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json({ limit: '10mb' }))
    .listen(8081);

proteusMW.module('array', ['common'])
    .publish('concat', concatService);
proteusMW.bootstrap(['array'], {
    app: app
}, { listenUrls: ['http://localhost:8082'] }).then(function (injector) {
    console.log('loaded: 8081');
});




