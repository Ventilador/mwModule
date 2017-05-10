timesService.$inject = ['slice'];
module.exports = timesService;
function timesService(slice) {
    return function () {
        
        var args = slice.apply(null, arguments);
        return new Promise(function (resolve, reject) {
            var ii = args.length;
            var total = 1, current;
            while (ii--) {
                current = args[ii];
                if (typeof current !== 'number') {
                    return reject('current is not a number');
                }
                total *= current;
            }
            return resolve(total);
        });
    };
}
