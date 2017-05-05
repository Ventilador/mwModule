var context = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;
if (!context) {
    throw 'No context';
}
var supportObject = require('./utils.js').supportObject;

(function (that) {
    if (that.proteusMW) {
        return;
    }
    var self = that.proteusMW = {};
    var modulePrototype = Object.create(null);
    modulePrototype.provider = invokeLaterAndSetModuleName('$provide', 'provider');
    modulePrototype.factory = invokeLaterAndSetModuleName('$provide', 'factory');
    modulePrototype.service = invokeLaterAndSetModuleName('$provide', 'service');
    modulePrototype.constant = invokeLater('$provide', 'constant', 'unshift');
    modulePrototype.config = config;
    modulePrototype.run = function (block) {
        this._runBlocks.push(block);
        return this;
    };
    self.module = internalModule;
    self.config = registerModuleMethod;
    var moduleMap = {};
    function internalModule(name, requires) {
        if (requires && Array.isArray(requires)) {
            if (moduleMap[name]) {
                throw 'Module ' + name + ' already exists';
            }
            return moduleMap[name] = createInternalModule(name, requires);
        } else {
            return moduleMap[name];
        }
    }

    function createInternalModule(name, requires) {
        var instance = Object.create(modulePrototype);
        instance._invokeQueue = [];
        instance._runBlocks = [];
        instance.requires = requires;
        instance.name = name;
        return instance;
    }

    function invokeLater(provider, method) {
        if (!queue) queue = invokeQueue;
        return function () {
            this._invokeQueue.push([provider, method, arguments]);
            return this;
        };
    }

    /**
     * @param {string} provider
     * @param {string} method
     * @returns {angular.Module}
     */
    function invokeLaterAndSetModuleName(provider, method, queue) {
        return function (recipeName, factoryFunction) {
            if (factoryFunction && typeof factoryFunction === 'function') {
                factoryFunction.$$moduleName = name;
            }
            this._invokeQueue.push([provider, method, arguments]);
            return this;
        };
    }

    function registerModuleMethod(name, config) {
        if (!name || !config || typeof name !== 'string' || typeof config !== 'object') {
            throw 'Invalid arguments';
        }


        var keys = Object.keys(config);
        var key, value;
        var touched = {};
        while (keys.length) {
            value = config[key = keys.shift()];
            var fn = unwrap(value);
            var context = getContextKey(value);
            if (context) {
                if (modulePrototype[context]) {
                    fn = bindFn(modulePrototype[context], fn);
                } else if (keys.indexOf(context = context.replace(new RegExp('^(' + name + ')'), '').toLowerCase()) !== -1) {
                    if (touched[context]) {
                        throw 'Circular Dependency found';
                    }
                    touched[context] = true;
                    keys.push(context);
                    continue;
                }
                throw 'Context not found';
            } else {
                fn = bindFn(fn);
            }
            modulePrototype[name + toCap(key)] = modulePrototype[name + toCap(key)] = fn;
        }
    }

    function bindFn(context, fn) {
        if (typeof context === 'function') {
            fn = context;
            context = null;
        }
        return function () {
            fn.apply(context || this._invokeQueue, arguments);
        };
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
        return text.replace(/([A-Z])/g, "$1").toLowerCase();
    }


})(context);
