module.exports = squareService;
function squareService() {
    return function (a) {
        
        return new Promise(function (resolve, reject) {
            if (typeof a !== 'number') {
                return reject('param a is not a number');
            }
            return resolve(a * a);
        });
    };
}
