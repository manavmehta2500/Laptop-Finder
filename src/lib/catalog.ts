// Single source of truth for the catalog lives in src/data/catalog.mjs so the
// Node monitor server and the Vite client both import exactly the same data.
export { CATALOG } from '../data/catalog.mjs';
