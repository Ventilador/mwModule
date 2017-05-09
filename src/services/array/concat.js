contactService.$inject = ['sum', 'slice'];
module.exports = contactService;
function contactService(sum, slice) {
    return function () {
        var args = slice.apply(null, arguments);
        return new Promise(function (resolve, reject) {
            sum.apply(null, args);
        });
    };
}
