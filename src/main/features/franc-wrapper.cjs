// Wrapper around `franc-min` that normalises its API across
// different versions (v5 vs v6+) and ESM/CJS interop.

module.exports = {
  franc: async (text) => {
    try {
      // Dynamic import to handle ESM module in CJS environment
      const module = await import('franc-min');
      const fn = module.default || module.franc;
      return fn(text);
    } catch (e) {
      console.error('Failed to load franc-min:', e);
      return 'und';
    }
  },
};
