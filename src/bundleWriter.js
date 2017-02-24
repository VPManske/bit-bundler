var fs = require("fs");
var path = require("path");
var mkdirp = require("mkdirp");
var types = require("dis-isa");

function bundleWriter(defaultDest) {
  return function writerDelegate(context) {
    var file = context.file;
    var logger = context.getLogger("bundler/writer");

    var pending = Object
      .keys(context.shards)
      .map(processShard)
      .concat(Promise.resolve(writeBundle(logger, context.bundle, streamFactory(file.dest || defaultDest))));

    return Promise.all(pending).then(function() { return context;});

    function processShard(dest) {
      var shard = context.shards[dest];

      if (!shard || !shard.content) {
        logger.log("bundle-empty", dest, "is an empty bundle");
        return;
      }

      return Promise.resolve(writeBundle(logger, shard, streamFactory(dest)));
    }
  };
}

function writeBundle(logger, bundle, stream) {
  if (!bundle || !bundle.content) {
    return;
  }

  if (stream) {
    return new Promise(function(resolve, reject) {
      stream.write(bundle.content, function(err) {
        if (err) {
          logger.error("write-failure", bundle, err);
          reject(err);
        }
        else {
          logger.log("write-success", bundle);
          resolve();
        }
      });
    });
  }
}

function fileStream(dest) {
  mkdirp.sync(path.dirname(dest));
  return fs.createWriteStream(dest);
}

function streamFactory(dest) {
  if (types.isFunction(dest)) {
    dest = dest();
  }

  return types.isString(dest) ? fileStream(dest) : dest;
}

bundleWriter.stream = streamFactory;
module.exports = bundleWriter;
