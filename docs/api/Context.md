## Context(options) : Context

When calling [bundle](Bitbundler.md#bundlefiles--promise) to generate bundles, a promise is returned that gives back a context when the promise is resolved. This context has the resulting bundles and the information used for generating the bundles. The context also has enough information to update bundles and a method to do so; `execute(files)`. The context is generated with the following information:


### Options

- **`bundle`** { Bundle } - Main bundle.
- **`cache`** { object } - Map of modules by module `id`.
- **`exclude`** { string[] } - Array of module `ids` to exclude from `context.bundle`. This is used by bundler plugins such as [bit-bundler-splitter](https://github.com/MiguelCastillo/bit-bundler-splitter) in order to specify which modules to exclude from `context.bundle`.
- **`file`** { { string[] : src, string : dest } } - Object with `src` files to bundle up and `dest` to specify where to write `context.bundle` to.
- **`modules`** { object[] } - Array of root modules of the module graph generated by the module loader. These modules have an `id` that are used as keys into the `cache` to get full module objects.
- **`shards`** { Bundle } - Map of shards (Bundle instances) pulled out of the main `context.bundle`. This map contains items created by bundler plugins such as [bundle splitter](https://github.com/MiguelCastillo/bit-bundler-splitter).
- **`getLogger`** { function } - Method to create loggers. The method takes an optional string name which is used when logging messages.
- **`setBundle`** { function } - Method to set the main bundle.
- **`setShard`** { function } - Method to set a bundle shard.
- **`visitBundles`** { function } - Register visitor methods that get called with each bundle; main and shards.

> The context is generally used by plugins and post processors such as [bit-bundler-splitter](https://github.com/MiguelCastillo/bit-bundler-splitter), [Bitbundler.dest](#bitbundlerdestdestination--function), and [Bitbundler.watch](#bitbundlerwatchcontext-options--context).

Once you have a context, you can call the `execute` method with a list of files that need to be reprocessed in order to regenerate new bundles. This exactly what [Bitbundler.watch](#bitbundlerwatchcontext-options--context) does internally.