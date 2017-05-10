module.exports = function divideService() {
    return function (a, b) {
       
        return new Promise(function (resolve, reject) {
            if (typeof a !== 'number') {
                return reject('param a is not a number');
            }
            if (typeof b !== 'number') {
                return reject('param b is not a number');
            }
            return resolve(a / b);
        });
    };
};
