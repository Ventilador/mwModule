
function createInjector(modulesToLoad, locals) {
    strictDi = (strictDi === true);
    var INSTANTIATING = {},
        providerSuffix = 'Provider',
        path = [],
        loadedModules = Object.create(null),
        providerCache = {
            $provide: Object.assign({
                provider: supportObject(provider),
                factory: supportObject(factory),
                service: supportObject(service),
                value: supportObject(value),
                constant: supportObject(constant),
                decorator: decorator
            }, locals)
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

    providerCache['$injector' + providerSuffix] = { $get: valueFn(protoInstanceInjector) };
    instanceInjector.modules = providerInjector.modules = Object.create(null);
    var runBlocks = loadModules(modulesToLoad);
    instanceInjector = protoInstanceInjector.get('$injector');
    instanceInjector.strictDi = strictDi;
    return instanceInjector;

    ////////////////////////////////////
    // $provider
    ////////////////////////////////////

    function supportObject(delegate) {
        return function (key, value) {
            if (isObject(key)) {
                forEach(key, reverseParams(delegate));
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

    function enforceReturnValue(name, factory) {
        return /** @this */ function enforcedReturnValue() {
            var result = instanceInjector.invoke(factory, this);
            if (isUndefined(result)) {
                throw $injectorMinErr('undef', 'Provider \'{0}\' must return a value from $get factory method.', name);
            }
            return result;
        };
    }

    function factory(name, factoryFn, enforce) {
        return provider(name, {
            $get: enforce !== false ? enforceReturnValue(name, factoryFn) : factoryFn
        });
    }

    function service(name, constructor) {
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
            moduleFn = porteusMW(module);
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
                $inject = createInjector.$$annotate(fn, strictDi, serviceName);

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
            // Support: IE 9-11 only
            // IE 9-11 do not support classes and IE9 leaks with the code below.
            if (msie || typeof func !== 'function') {
                return false;
            }
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

module.exports = createInjector;