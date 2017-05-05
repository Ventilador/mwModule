require('./../src/module');
proteusMW.config('seneca', {
    service: function (name, factory) {
        this.push(['$provide', 'service', arguments]);
    }
});

proteusMW.module('main', [])
    .senecaService('myService', [function () {
        return function (a, b) {
            if (a === '1' && b === true) {
                console.log('' +
                    '----------------------------------------\n' +
                    '---------------   :-*   ----------------\n' +
                    '----------------------------------------\n'
                );
            }

        };
    }]);

var injector = proteusMW.bootstrap(['main'], {});
injector.get('myService')('1', true);