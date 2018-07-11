## 1.0.0-alpha.2 (July 10, 2018)

- Added posibility to create a preset with `use()` and `printer()` chaining
- Removed `hitext.generator.lang` and related
- Added `hitext.generator.match` generator
- Moved styles from HTML printer aside (to `theme/default.css`). Styles should be used outside of hitext scope
- Fixed edge cases in printing (when some ranges have wrong values for start and/or end fields)
- Added `fork()` method to all printers

## 1.0.0-alpha.1 (June 30, 2018)

- Initial release
