var isArray = Array.isArray;
var request = require('request');
function createInjector(modulesToLoad, locals, config_) {
    var INSTANTIATING = {},
        config = config_ || {},
        providerSuffix = 'Provider',
        path = [],
        loadedModules = Object.create(null),
        requires = [],
        publishes = [],
        providerCache = {
            $provide: {
                provider: supportObject(provider),
                factory: supportObject(factory),
                service: supportObject(service),
                value: supportObject(value),
                constant: supportObject(constant),
                decorator: decorator
            },
            $publish: {
                service: supportObject(publish)
            }
        },
        providerInjector = (providerCache.$injector =
            createInternalInjector(providerCache, function (serviceName, caller) {
                if (typeof caller === 'string') {
                    path.push(caller);
                }
                throw 'unprError \nUnknown provider: ' + path.join(' <- ');
            })),
        instanceCache = Object.assign({}, locals),
        protoInstanceInjector =
            createInternalInjector(instanceCache, function (serviceName, caller) {
                var provider = providerInjector.get(serviceName + providerSuffix, caller);
                return instanceInjector.invoke(
                    provider.$get, provider, undefined, serviceName);
            }),
        instanceInjector = protoInstanceInjector;



    Object.assign(providerCache, locals);
    providerCache['$injector' + providerSuffix] = { $get: valueFn(protoInstanceInjector) };
    instanceInjector.modules = providerInjector.modules = Object.create(null);
    var runBlocks = loadModules(modulesToLoad);

    return new Promise(function (resolve) {
        var toSearch = [];
        for (var ii = 0; ii < requires.length; ii++) {
            if (!providerCache[requires[ii] + 'Provider'] && !instanceCache[require[ii]]) {
                toSearch.push(requires[ii]);
            }
        }
        if (toSearch.length) {
            var urls = config.listenUrls;
            if (!isArray(urls)) {
                throw 'Missing dependencies -> \n\t' + toSearch.join(',\n\t');
            }
            var promise = Promise.all(urls.map(function (url) {
                return new Promise(function (res, rej) {
                    request(url + '/$metadata', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        }

                    }, function (error, response, body) {
                        if (error) {
                            rej(error);
                        } else {
                            res(JSON.parse(body).$metadata);
                        }
                    });
                });
            }));
            promise.then(function (metadatas) {
                for (var ii = 0; ii < metadatas.length; ii++) {
                    for (var jj = 0; jj < metadatas[ii].length; jj++) {
                        createOnlineService(metadatas[ii][jj].$url, metadatas[ii][jj].$name);
                    }
                }
                flush();
                resolve(instanceInjector);
            });
        } else {
            flush();
            resolve(instanceInjector);
        }
    });

    function flush() {
        instanceInjector = protoInstanceInjector.get('$injector');
        if (config.publisher) {
            callPublishers(requires, config.publisher);
        } else {
            configPublisherDefault();
        }
        for (var ii = 0; ii < runBlocks.length; ii++) {
            instanceInjector.invoke(runBlocks[ii]);
        }
    }

    function createOnlineService(url, methodName) {
        instanceCache[methodName] = function () {
            var ii, args = new Array(ii = arguments.length);
            while (ii--) args[ii] = arguments[ii];
            var that = this;
            return new Promise(function (resolve, reject) {
                if (that.auth !== 'pedro') {
                    reject('not auth');
                    return;
                }

                request(url, {
                    method: 'POST',
                    headers: {
                        'auth': that.auth
                    },
                    json: {
                        $apply: args
                    }
                }, function (error, response, body) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(body);
                    }
                });
            });
        };
    }


    function configPublisherDefault() {
        if (!locals.app) {
            throw 'Missing app';
        }
        locals.app
            .post('*', function (req, res) {
                var serviceName = req.url.substr(1);
                if (~publishes.indexOf(serviceName)) {
                    var body = req.body || {}, result;
                    var service = instanceInjector.get(serviceName);
                    if (body.$apply) {
                        result = service.apply(req.headers, body.$apply);
                    } else {
                        result = service.call(req.headers, body);
                    }
                    if (result && typeof result === 'object' && result.then) {
                        return result.then(function (val) {
                            res.send(Object(val));
                        }).catch(function (error) {
                            res.status(error && error.status || 503).send(error);
                        });
                    }
                    res.send(result);
                    return;
                }
                res.status(404).send('Service "' + serviceName + '" not found');
            })
            .get('/[\$]metadata', function (req, res) {
                res.send({
                    $metadata: publishes.map(function (item) {
                        return {
                            $url: req.protocol + '://' + req.get('host') + '/' + item,
                            $name: item
                        };
                    })
                });
            });
    }



    function callPublishers(array, fn) {
        for (var ii = 0; ii < array.length; ii++) {
            fn(array[ii], instanceInjector.get(array[ii]));
        }
    }

    ////////////////////////////////////
    // $provider
    ////////////////////////////////////

    function supportObject(delegate) {
        return function (key, value) {
            if (typeof key === 'object') {
                forEachReverse(key, delegate);
            } else {
                return delegate(key, value);
            }
        };
    }

    function provider(name, provider_) {
        assertNotHasOwnProperty(name, 'service');
        if (isFunction(provider_) || isArray(provider_)) {
            provider_ = providerInjector.instantiate(provider_);
        }
        if (!provider_.$get) {
            throw $injectorMinErr('pget', 'Provider \'{0}\' must define $get factory method.', name);
        }
        return (providerCache[name + providerSuffix] = provider_);
    }

    function publish(name, factoryFn_) {
        var $inject = createInjector.$$annotate(factoryFn_, '');
        var factoryFn = Array.isArray(factoryFn_) ? factoryFn_[factoryFn_.length - 1] : factoryFn_;
        if (typeof (factoryFn) !== 'function') {
            throw 'Invalid constructor at service';
        }
        requires = requires.concat(factoryFn.$inject = $inject);
        publishes.push(name);
        return (providerCache[name + providerSuffix] = {
            $get: factoryFn
        });
    }

    function enforceReturnValue(name, factory) {
        return /** @this */ function enforcedReturnValue() {
            var result = instanceInjector.invoke(factory, this);
            if (isUndefined(result)) {
                throw $injectorMinErr('undef', 'Provider \'{0}\' must return a value from $get factory method.', name);
            }
            return result;
        };
    }

    function factory(name, factoryFn_, enforce) {
        var $inject = createInjector.$$annotate(factoryFn_, '');
        var factoryFn = Array.isArray(factoryFn_) ? factoryFn_[factoryFn_.length - 1] : factoryFn_;
        if (typeof (factoryFn) !== 'function') {
            throw 'Invalid constructor at service';
        }
        requires = requires.concat(factoryFn.$inject = $inject);
        return provider(name, {
            $get: Object.assign(enforce !== false ? enforceReturnValue(name, factoryFn) : factoryFn, {
                $$moduleName: factoryFn.$$moduleName,
                $$requires: factoryFn.$$requires
            })
        });
    }

    function service(name, constructor_) {
        var $inject = createInjector.$$annotate(constructor_, '');
        var constructor = Array.isArray(constructor_) ? constructor_[constructor_.length - 1] : constructor_;
        if (typeof (constructor) !== 'function') {
            throw 'Invalid constructor at service';
        }
        requires = requires.concat(constructor.$inject = $inject);
        return factory(name, ['$injector', function ($injector) {
            return $injector.instantiate(constructor);
        }]);
    }

    function value(name, val) { return factory(name, valueFn(val), false); }

    function constant(name, value) {
        assertNotHasOwnProperty(name, 'constant');
        providerCache[name] = value;
        instanceCache[name] = value;
    }

    function decorator(serviceName, decorFn) {
        var origProvider = providerInjector.get(serviceName + providerSuffix),
            orig$get = origProvider.$get;

        origProvider.$get = function () {
            var origInstance = instanceInjector.invoke(orig$get, origProvider);
            return instanceInjector.invoke(decorFn, null, { $delegate: origInstance });
        };
    }

    ////////////////////////////////////
    // Module Loading
    ////////////////////////////////////
    function loadModules(modulesToLoad) {
        var runBlocks = [];
        if (!Array.isArray(modulesToLoad)) {
            throw 'modulesToLoad is not an array';
        }
        var moduleFn;
        for (var ii = 0, module = modulesToLoad[ii]; ii < modulesToLoad.length; module = modulesToLoad[++ii]) {
            if (loadedModules[module]) {
                return;
            }
            if (typeof module !== 'string') {
                console.error('injector.loadModules', module, modulesToLoad);
                throw 'Invalid module type while loading modules';
            }
            loadedModules[module] = true;
            moduleFn = proteusMW.module(module);
            instanceInjector.modules[module] = moduleFn;
            runBlocks = runBlocks.concat(loadModules(moduleFn.requires)).concat(moduleFn._runBlocks);
            runInvokeQueue(moduleFn._invokeQueue);
        }
        return runBlocks;
    }
    function runInvokeQueue(queue) {
        var i, ii;
        for (i = 0, ii = queue.length; i < ii; i++) {
            var invokeArgs = queue[i],
                provider = providerInjector.get(invokeArgs[0]);

            provider[invokeArgs[1]].apply(provider, invokeArgs[2]);
        }
    }

    ////////////////////////////////////
    // internal Injector
    ////////////////////////////////////

    function createInternalInjector(cache, factory) {

        function getService(serviceName, caller) {
            if (cache.hasOwnProperty(serviceName)) {
                if (cache[serviceName] === INSTANTIATING) {
                    throw $injectorMinErr('cdep', 'Circular dependency found: {0}',
                        serviceName + ' <- ' + path.join(' <- '));
                }
                return cache[serviceName];
            } else {
                try {
                    path.unshift(serviceName);
                    cache[serviceName] = INSTANTIATING;
                    cache[serviceName] = factory(serviceName, caller);
                    return cache[serviceName];
                } catch (err) {
                    if (cache[serviceName] === INSTANTIATING) {
                        delete cache[serviceName];
                    }
                    throw err;
                } finally {
                    path.shift();
                }
            }
        }


        function injectionArgs(fn, locals, serviceName) {
            var args = [],
                $inject = createInjector.$$annotate(fn, serviceName);

            for (var i = 0, length = $inject.length; i < length; i++) {
                var key = $inject[i];
                if (typeof key !== 'string') {
                    throw $injectorMinErr('itkn',
                        'Incorrect injection token! Expected service name as string, got {0}', key);
                }
                args.push(locals && locals.hasOwnProperty(key) ? locals[key] :
                    getService(key, serviceName));
            }
            return args;
        }

        function isClass(func) {

            var result = func.$$ngIsClass;
            if (!isBoolean(result)) {
                result = func.$$ngIsClass = /^class\b/.test(stringifyFn(func));
            }
            return result;
        }

        function invoke(fn, self, locals, serviceName) {
            if (typeof locals === 'string') {
                serviceName = locals;
                locals = null;
            }

            var args = injectionArgs(fn, locals, serviceName);
            if (isArray(fn)) {
                fn = fn[fn.length - 1];
            }

            if (!isClass(fn)) {
                // http://jsperf.com/angularjs-invoke-apply-vs-switch
                // #5388
                return fn.apply(self, args);
            } else {
                args.unshift(null);
                return new (Function.prototype.bind.apply(fn, args))();
            }
        }


        function instantiate(Type, locals, serviceName) {
            // Check if Type is annotated and use just the given function at n-1 as parameter
            // e.g. someModule.factory('greeter', ['$window', function(renamed$window) {}]);
            var ctor = (isArray(Type) ? Type[Type.length - 1] : Type);
            var args = injectionArgs(Type, locals, serviceName);
            // Empty object at position 0 is ignored for invocation with `new`, but required.
            args.unshift(null);
            return new (Function.prototype.bind.apply(ctor, args))();
        }


        return {
            invoke: invoke,
            instantiate: instantiate,
            get: getService,
            annotate: createInjector.$$annotate,
            has: function (name) {
                return providerCache.hasOwnProperty(name + providerSuffix) || cache.hasOwnProperty(name);
            }
        };
    }
}
function valueFn(value) {
    return function () {
        return value;
    };
}
function isFunction(fn) {
    return typeof fn === 'function';
}
function isBoolean(a) {
    return typeof a === 'boolean';
}

function isUndefined(a) {
    return typeof a === 'undefined';
}
function stringifyFn(fn) {
    return Function.prototype.toString.call(fn);
}

function assertNotHasOwnProperty(name) {
    return name !== 'hawOwnProperty';
}
createInjector.$$annotate = annotate;
module.exports = createInjector;
function annotate(fn, name) {
    var $inject,
        argDecl,
        last;

    if (typeof fn === 'function') {
        if (!($inject = fn.$inject)) {
            $inject = [];
            if (fn.length) {
                if (!isString(name) || !name) {
                    name = fn.name;
                }
                throw $injectorMinErr('strictdi',
                    '{0} is not using explicit annotation and cannot be invoked in strict mode', name);

            }
            fn.$inject = $inject;
        }
    } else if (isArray(fn)) {
        last = fn.length - 1;
        assertArgFn(fn[last], 'fn');
        $inject = fn.slice(0, last);
    } else {
        assertArgFn(fn, 'fn', true);
    }
    return $inject;
}

function forEachReverse(obj, fn, context) {
    if (!obj || typeof fn !== 'function') {
        return;
    }
    var ii = 0;
    context = context || null;
    if (isArray(obj)) {
        for (; ii < obj.length; ii++) {
            fn.call(context, ii, obj[ii]);
        }
    } else {
        for (var array = Object.keys(obj), key = array[ii], value = obj[key]; ii < array.length; key = array[++ii], value = obj[key]) {
            fn.call(context, key, value);
        }
    }
}

function $injectorMinErr(type, message) {
    var args = new Array(arguments.length);
    for (var ii = 2, jj = 0; ii < arguments.length; ii++ , jj++) {
        args[jj] = arguments[ii];
    }
    return type + ': ' + format.call(message, args);
}

function format(args) {
    return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
}

function assertArgFn(fn) {
    if (!isFunction(fn)) {
        throw 'not a function';
    }
}