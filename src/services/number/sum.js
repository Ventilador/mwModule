sumService.$inject = ['slice'];
module.exports = sumService;
function sumService(slice) {
    return function () {
        var args = slice.apply(null, arguments);
        return new Promise(function (resolve, reject) {
            var ii = args.length;
            var total = 0, current;
            while (ii--) {
                current = args[ii];
                if (typeof current !== 'number') {
                    reject('current is not a number' + current);
                    return;
                }
                total += current;
            }
            resolve(total);
        });
    };
}

