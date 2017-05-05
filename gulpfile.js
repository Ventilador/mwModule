var gulp = require('gulp');
var gls = require('gulp-live-server');
var hosts = 1;
var port = require('yargs').argv.port;
gulp.task('p', [], function () {
    var server = gls(['src/hosts/' + port + '.js'], null, false);
    server.start();

    gulp.watch('src/hosts/' + port + '.js', function () {
        server.start();
    });
});





