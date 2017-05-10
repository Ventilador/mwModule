var context = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;
if (!context) {
    throw 'No context';
} else if (context.proteusMW) {
    return;
}
;

(function (that) {
    var self = that.proteusMW = {};
    var modulePrototype = Object.create(null);
    modulePrototype.provider = invokeLaterAndSetModuleName('$provide', 'provider');
    modulePrototype.factory = invokeLaterAndSetModuleName('$provide', 'factory');
    modulePrototype.service = invokeLaterAndSetModuleName('$provide', 'service');
    modulePrototype.publish = invokeLaterAndSetModuleName('$publish', 'service');
    modulePrototype.constant = invokeLater('$provide', 'constant', 'unshift');
    modulePrototype.config = invokeLater('$injector', 'invoke', 'push', this._configBlocks);
    modulePrototype.run = function (block) {
        this._runBlocks.push(block);
        return this;
    };
    self.module = internalModule;
    self.config = registerModuleMethod;
    self.bootstrap = require('./injector');
    var moduleMap = {};
    function internalModule(name, requires) {
        if (requires && Array.isArray(requires)) {
            if (moduleMap[name]) {
                throw 'Module ' + name + ' already exists';
            }
            return (moduleMap[name] = createInternalModule(name, requires));
        } else {
            if (!moduleMap[name]) {
                throw 'Module not found: ' + name;
            }
            return moduleMap[name];
        }
    }

    function createInternalModule(name, requires) {
        var instance = Object.create(modulePrototype);
        instance._invokeQueue = [];
        instance._runBlocks = [];
        instance._configBlocks = [];

        instance.requires = requires;
        instance.name = name;
        return instance;
    }

    function invokeLater(provider, method, pusher, collection) {
        return function () {
            collection = collection || this._invokeQueue;
            var args = new Array(arguments.length);
            var ii = arguments.length;
            while (ii--) {
                args[ii] = arguments[ii];
            }
            collection[pusher || 'push']([provider, method, args]);
            return this;
        };
    }

    function invokeLaterAndSetModuleName(provider, method) {
        return function delegate(recipeName, factoryFunction) {
            if (arguments.length === 1 && typeof recipeName === 'object') {
                forEachReverse(key, delegate, this);
                return this;
            }

            if (factoryFunction && typeof factoryFunction === 'function') {
                factoryFunction.$$moduleName = this.name;
            } else {
                throw 'Invalid factoryFunction for ' + recipeName + '. Did not expect type ' + typeof factoryFunction;
            }
            this._invokeQueue.push([provider, method, [recipeName, factoryFunction]]);
            return this;
        };
    }

    function registerModuleMethod(name, config) {
        if (!name || !config || typeof name !== 'string' || typeof config !== 'object') {
            if (typeof config === 'function') {
                modulePrototype[name] = config;
            }
            throw 'Invalid arguments';
        }

        var keys = Object.keys(config);
        var key, value;
        var touched = {};
        while (keys.length) {
            value = config[key = keys.shift()];
            var fn = unwrap(value);
            var context = getContextKey(value);
            if (context && !modulePrototype[context]) {
                if (touched[context]) {
                    throw 'Circular dependency';
                }
                touched[context] = true;
                keys.push(key);
                continue;
            }
            modulePrototype[name + toCap(key)] = fn;
        }
    }

    function getContextKey(obj) {
        if (typeof obj === 'function') {
            return obj.context || null;
        } else if (Array.isArray(obj)) {
            return obj[0];
        }
        throw 'Invalid object in getContextKey';
    }

    function unwrap(obj) {
        return typeof obj === 'function' ? obj : obj[1];
    }

    function toCap(text) {
        return text[0].toUpperCase() + text.slice(1).toLowerCase();
    }

    function forEachReverse(toLoop, delegate, context) {
        for (var ii = 0, array = Object.keys(toLoop), key = array[ii], value = toLoop[key]; ii < array.length; key = array[++ii], value = toLoop[key]) {
            delegate.call(context, key, value);
        }
    }


})(context);
