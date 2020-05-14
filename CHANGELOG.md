## 1.0.0-beta.1 (May 14, 2020)

- Added `hitext.printer.fork()` method to extend/overload a printer set
- Changed `hitext()` pipeline to return a decorate function (i.e. `hitext(...).use(...).decorate(...)` -> `hitext(...).use(...)(...)`)
- Added second argument (`printer`) to `hitext().use()` that overrides decorator's default printer setup (e.x. `hitext().use(decorator, { html: { ... } })`)
- Renamed printer's methods: `start` -> `open`, `finish` -> `close`
- Removed default `<div>` wrapper for `html` printer
- Removed from export: `generateRanges`, `resolvePrinter`, `print`, `finalize`, `decorate` and `utils`
- Changed semantic for main function to `hitext([...plugins], printerType, printerSet)`
- Changed first argument of `hitext.use()` method to be a decorator (i.e. `{ name, ranges: function(source, createRange) | Array.<range>, printer: Object }`) or array of ranges
- Added `generateRanges()` method to pipeline
- Removed first argument (`type`) in `createRange()` handler, range's `type` is now set up automatically
- Removed `spotlight` generator (use array of ranges instead)
- Removed any range specific from build-in printers
- Added ability to extend printer via a function (`createHook` method is used), see `tty` printer examples
- Removed `theme` folder that had contained CSS for `html` printer

## 1.0.0-alpha.2 (July 10, 2018)

- Added posibility to create a preset with `use()` and `printer()` chaining
- Removed `hitext.generator.lang` and related
- Added `hitext.generator.match` generator
- Moved styles from HTML printer aside (to `theme/default.css`). Styles should be used outside of hitext scope
- Fixed edge cases in printing (when some ranges have wrong values for start and/or end fields)
- Added `fork()` method to all printers

## 1.0.0-alpha.1 (June 30, 2018)

- Initial release
