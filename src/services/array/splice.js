contactService.$inject = ['sum', 'slice'];
module.exports = contactService;
function contactService(sum, slice) {
    return function () {
        var that = this;
        var args = slice.apply(null, arguments);
        return new Promise(function (resolve, reject) {
            sum.apply(that, args).then(resolve).catch(reject);
        });
    };
}
