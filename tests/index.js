require('./../src/module');
var request = require('request');
proteusMW.config('sis', {
    config: ['seneca', function (seneca) {
        return service.then(function (listOfHosts) {
            this._invokeQueue.push(['$provide', 'factory', listOfHosts, function (seneca) {
                return function (pattern, callback) {
                    seneca.act(pattern, callback);
                };
            }]);
        });

    }],
    list: function (pattern, configObject) {
        this.run(['seneca', '$injector', 'SIS', '$parse', senecaResolveService]);

        if (injectorName) {
            this._invokeQueue.push(['$provide', 'factory', [injectorName, createMethod(pattern)]]);
        }

        function senecaResolveService(seneca, injector, sis, $parse, logError) {
            var getter = $parse(createExpression(configObject.get));
            var setter = $parse(createExpression(configObject.set, true));
            var filter = $parse(createExpression(configObject.filter, true));
            app[pattern.verb || 'GET']('api/' + pattern.service + '/' + pattern.method, function (req) {
                sis.doRequest('api/' + pattern.service + '/' + pattern.method, function (error, result) {
                    if (!error) {
                        result = injector.invoke(factory, {
                            result: result
                        });
                        result = result.filter(filter(req.body));
                    } else {
                        logError(error);
                    }
                    cb(error, setter(scope, getter({}, result)));
                }, pattern.verb || 'GET', req.body, req.headers.authorization);
            });
        }
    }
});

function createMethod(pattern) {
    return function (seneca) {
        return function (pattern) {
            var defer = new Promise();
            seneca.act(pattern, function (error, result) {
                if (error) {
                    defer.reject(error);
                } else {
                    defer.resolve(data);
                }
            });
            return defer.promise;
        };
    };
}

var getterResult = {
    a: locals.Model.Id,
    b: locals.Model.Name
};
function setterFunction(locals) {
    this.id = locals.a;
    this.name = locals.b;
}
if ('a' in locals) {

}

function createExpression(array, set) {
    var toReturn = '';
    for (var ii = 97, jj = 0, length = array.length + ii; ii < length; ii++ , jj++) {
        if (set) {
            toReturn += array[jj] + '=' + String.fromCharCode(ii) + ';';
        } else {
            toReturn += String.fromCharCode(ii) + '=' + array[jj] + ';';
        }
    }
    return toReturn;
}


proteusMW.module('main', [])
    .sisService({
        role: 'proteusApi',
        action: 'list',
        entity: 'portfolio'
    }, [function (args, callback) {
        var req = request(args.url, {
            body: args.body
        }, callback);
    }]);






var injector = proteusMW.bootstrap(['main'], { seneca: seneca, SIS: getSis() }, ['app', 'seneca', function (app, seneca) {

}]);
injector.get('myService')('1', true);