var defaultOptions = require("./defaultOptions");
var browserPack = require("browser-pack");
var getUniqueId = require("bit-bundler-utils/getUniqueId");
var pstream = require("p-stream");
var utils = require("belty");


function Bundler(options) {
  this._options = utils.merge({}, defaultOptions, options);
  this._getId = options.filePathAsId ? utils.noop : getUniqueId;
}


Bundler.prototype.bundle = function(context) {
  if (!context.modules.length) {
    return Promise.resolve();
  }

  var bpExports = getBrowserPackExports(this, context);
  var bpModules = createBrowserPackModules(this, context);
  bpModules = configureIds(this, bpModules);
  bpModules = configureEntries(this, bpModules, bpExports);

  var bpBundle = {
    exports: bpExports,
    modules: bpModules
  };

  if (this._options.printInfo) {
    this.printInfo(bpBundle);
  }

  return this.stringify(bpBundle).then(function(result) {
    return {
      bundle: utils.extend({ result: result }, bpBundle)
    };
  });
};


Bundler.prototype.stringify = function(bpBundle) {
  var bp = browserPack(configureBrowserPack(bpBundle, this._options));
  var deferred = pstream(bp);

  bpBundle.modules.forEach(function(mod) {
    bp.write(mod);
  });

  bp.end();
  return deferred;
};


Bundler.prototype.printInfo = function(bpBundle) {
  console.log(formatBundleInfo(bpBundle, configureBrowserPack(bpBundle, this._options)));
};


Bundler.prototype.getId = function(moduleId) {
  return this._getId(moduleId);
};


function configureBrowserPack(bpBundle, options) {
  var bpOptions = utils.merge({}, options.browserPack);

  if (bpOptions.standalone) {
    bpOptions.standaloneModule = bpBundle.exports;
  }

  return bpOptions;
}


function createBrowserPackModules(bundler, context) {
  var stack = context.modules.slice(0);
  var result = [], processed = {}, i = 0, mod;

  while(stack.length !== i) {
    mod = stack[i++];
    if (processed.hasOwnProperty(mod.id)) {
      continue;
    }

    mod = context.cache[mod.id];
    processed[mod.id] = mod;
    stack.push.apply(stack, mod.deps);
    result.push(createBrowserPackModule(mod));
  }

  return result;
}


function configureIds(bundler, bpModules) {
  if (!bundler._options.filePathAsId) {
    bpModules.forEach(function(bpModule) {
      bpModule.id = bundler.getId(bpModule.id);

      Object.keys(bpModule.deps).forEach(function(depName) {
        bpModule.deps[depName] = bundler.getId(bpModule.deps[depName]);
      });
    });
  }

  return bpModules;
}


function configureEntries(bundler, bpModules, bpExports) {
  var exports = bpExports.reduce(function(container, item) {
    container[item] = true;
    return container;
  }, {});

  bpModules.forEach(function(mod) {
    mod.entry = exports.hasOwnProperty(mod.id);
  });

  return bpModules;
}


function getBrowserPackExports(bundler, context) {
  var ids = context.modules.map(function(mod) {
    return mod.id;
  });

  return convertModuleIds(bundler, ids);
}


function createBrowserPackModule(mod) {
  var bpModule = {
    id     : mod.id,
    name   : mod.name,
    path   : mod.path,
    source : mod.source,
    deps   : {}
  };

  var i, length, dep;
  for (i = 0, length = mod.deps.length; i < length; i++) {
    dep = mod.deps[i];
    bpModule.deps[dep.name] = dep.id;
  }

  return bpModule;
}


function convertModuleIds(bundler, ids) {
  return ids.map(function(id) {
    return bundler.getId(id);
  });
}


function formatBundleInfo(bpBundle, options) {
  var output = {};
  var bpModules = bpBundle.modules;

  if (options.standalone) {
    output.standalone = options.standalone;
  }

  output.modules = bpModules.map(function(bpModule) {
    return {
      id: bpModule.id,
      entry: bpModule.entry,
      name: bpModule.name,
      path: bpModule.path,
      deps: JSON.stringify(bpModule.deps)
    };
  });

  return output;
}


function browserPackFactory(options) {
  options.bundler = new Bundler(options);
  return options;
}


module.exports = browserPackFactory;
