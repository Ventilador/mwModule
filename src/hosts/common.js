proteusMW.module('common', [])
    .service('slice', function () {
        return function () {
            var args = [];
            for (var ii = 0; ii < arguments.length; ii++) {
                args.push(arguments[ii]);
            }
            return args;
        };
    })