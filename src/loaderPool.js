"use strict";

var path = require("path");
var logger = require("./logger");
var Workit = require("workit");

class WorkerPool extends Workit.Pool {
  log(chunk) {
    logger._stream.write(chunk);
  }
}

class LoaderPool {
  constructor(options) {
    this.options = Object.assign({}, options);
    this.cache = {};
    this.pending = {};
    this.pool = createPool(this, options.multiprocess);
  }

  fetch(names, referrer) {
    var deferred = Array.isArray(names) ? this._fetchMany(names, referrer) : this._fetchOne(names, referrer);

    return deferred
      .then(result => {
        this.pool.workers.map(worker => worker.invoke("clear"));
        return result;
      })
      .catch(err => {
        this.pool.workers.map(worker => worker.invoke("clear"));
        throw err;
      });
  }

  setModule(mod) {
    this.cache[mod.id] = mod;
  }

  getModule(id) {
    return this.cache[id];
  }

  deleteModule(mod) {
    delete this.cache[mod.id];
  }

  getCache() {
    return this.cache;
  }

  _fetchMany(names, referrer) {
    return Promise.all(names.map(name => this._fetchOne(name, referrer)));
  }

  _fetchOne(name, referrer) {
    return resolve(this, name, referrer).then((modulePath) => {
      if (this.cache[modulePath]) {
        return this.cache[modulePath];
      }
      else if (this.pending[modulePath]) {
        return this.pending[modulePath];
      }

      var pending = fetch(this, name, referrer);
      this.pending[modulePath] = pending;

      return pending.then(mod => {
        delete this.pending[mod.path];
        this.setModule(mod);

        if (!mod.deps.length) {
          return mod;
        }

        // console.log("deps", mod.name, mod.deps);

        return this._fetchMany(mod.deps, mod).then(deps => {
          mod.deps = deps.map((dep, i) => Object.assign({}, dep, { deps: [], name: mod.deps[i] }));
          return mod;
        });
      });
    });
  }
}

function resolve(loader, name, referrer) {
  return loader.pool.invoke("resolve", {
    name: name,
    referrer: referrer
  });
}

function fetch(loader, name, referrer) {
  return loader.pool.invoke("fetchShallow", {
    name: name,
    referrer: referrer
  });
}

function createPool(loader, size) {
  var pool = new WorkerPool(path.join(__dirname, "./loaderWorker.js"), {
    size: size === true ? 2 : size,
    silent: true
  });

  pool.workers.forEach((worker) => {
    worker.process.stdout.pipe(process.stdout);
    worker.process.stderr.pipe(process.stderr);
    worker.process.on("error", workerError);

    return worker
      .invoke("init", loader.options)
      .catch(initError);

    function initError(error) {
      worker.stop();
      logError(error);
      rejectWorkersQueue();
      rejectPoolsQueue();
    }

    function workerError(error) {
      logError(error);
      rejectWorkersQueue();
      rejectPoolsQueue();
    }

    function logError(error) {
      if (error) {
        process.stderr.write(error + "\n");
      }
    }

    function rejectWorkersQueue() {
      worker.rejectQueue();
    }

    function rejectPoolsQueue() {
      if (!pool.workers.length) {
        pool.rejectQueue();
      }
    }
  });

  return pool;
}

module.exports = LoaderPool;
