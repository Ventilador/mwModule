var express = require('express');
var Seneca = require('seneca');
var app = express();
var seneca = Seneca({});
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json({ limit: '10mb' }))
    .post('*', function (req, res) {
        res.send(toParam(
            req.originalUrl,
            req.body
        ));
    })
    .get('*', function (req, res) {
        res.send(toParam('Hello World', req.host, req.baseUrl, req.originalUrl, req.params, req.query));
    });



function toParam() {
    var toReturn = {};
    for (var ii = 0, current = arguments[ii]; ii < arguments.length; current = arguments[++ii]) {
        toReturn[ii] = current;
    }
    return toReturn;
}
app.listen(8081);
