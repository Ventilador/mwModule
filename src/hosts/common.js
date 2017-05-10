proteusMW.module('common', [])
    .service('slice', function () {

        return function () {
            var asd = Array.prototype.slice.call(arguments);
            var args = [];
            for (var ii = 0; ii < arguments.length; ii++) {
                args.push(arguments[ii]);
            }
            return asd;
        };
    });