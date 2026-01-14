// Wrapper around `franc-min` that normalises its API across
// different versions (v5 vs v6+) and ESM/CJS interop.
//
// - In some environments (v5), `require('franc-min')` returns the
//   franc function directly.
// - In others (v6+ ESM), it returns an object with a `.franc` function.
//
// This wrapper always exports an object with a single `franc` function
// so TypeScript/ESM code can import it consistently.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const francLib = require('franc-min');

let francFn;
if (typeof francLib === 'function') {
  francFn = francLib;
} else if (francLib && typeof francLib.franc === 'function') {
  francFn = francLib.franc;
} else if (francLib && typeof francLib.default === 'function') {
  francFn = francLib.default;
} else {
  francFn = () => 'und';
}

module.exports = {
  franc: francFn,
};
