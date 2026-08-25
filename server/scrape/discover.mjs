/**
 * Discovery — "find every single laptop".
 *
 * Collects Product JSON-LD nodes from brand/retailer listing pages (and the
 * Best Buy API when a key is configured), fingerprints each candidate, and
 * keeps everything not already in our catalog. The result is
 * public/data/discovered.json — new models the catalog doesn't know yet,
 * with name/brand/image/price/URL, ready to be reviewed (or auto-added later).
 */
import { fetchPage, extractLdJsonBlocks, productPriceFromLd } from './fetchers.mjs';
import { scrapeBestBuyApi } from './fetchers.mjs';

const SOURCES = [
  { name: 'Lenovo laptops', url: 'https://www.lenovo.com/us/en/laptops' },
  { name: 'Dell laptops', url: 'https://www.dell.com/en-us/shop/laptops' },
  { name: 'ROG laptops', url: 'https://rog.asus.com/us/laptops/' },
  { name: 'ASUS laptops', url: 'https://www.asus.com/us/laptops/all-products/' },
  { name: 'Razer Blade', url: 'https://www.razer.com/gaming-laptops' },
  { name: 'MSI laptops', url: 'https://www.msi.com/Laptop' },
  { name: 'HP laptops', url: 'https://www.hp.com/us-en/laptops.html' },
  { name: 'Acer laptops', url: 'https://www.acer.com/us-en/laptops' },
];

function collectProducts(html, baseUrl) {
  const out = [];
  const blocks = extractLdJsonBlocks(html);
  const walk = (nodes) => {
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
      if (types.includes('Product')) {
        const price = productPriceFromLd([n]);
        out.push({
          name: n.name || null,
          brand: n.brand?.name || (typeof n.brand === 'string' ? n.brand : null),
          image: n.image?.[0] ?? n.image ?? null,
          url: n.url || baseUrl,
          price: price?.price ?? null,
          currency: price?.currency ?? null,
          inStock: price?.inStock ?? null,
        });
      }
      for (const k of Object.keys(n)) {
        const v = n[k];
        if (Array.isArray(v)) walk(v);
        else if (v && typeof v === 'object' && k !== 'offers') walk([v]);
      }
    }
  };
  walk(blocks);
  return out.filter((p) => p.name && p.price > 0);
}

export async function discover({ knownNames = [], log = () => {} } = {}) {
  const known = new Set(knownNames.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const candidates = [];
  const seen = new Set();

  // fetch all listing sources in parallel
  const sourceResults = await Promise.all(
    SOURCES.map(async (src) => {
      try {
        const page = await fetchPage(src.url, { timeout: 15000 });
        if (!page.html) {
          log(src.name, `skip (http ${page.status})`);
          return { src, prods: [] };
        }
        const prods = collectProducts(page.html, src.url);
        log(src.name, `${prods.length} products`);
        return { src, prods };
      } catch (e) {
        log(src.name, `error: ${e.message}`);
        return { src, prods: [] };
      }
    }),
  );
  for (const { src, prods } of sourceResults) {
    for (const p of prods) {
      const fp = (p.name + (p.url || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(fp)) continue;
      seen.add(fp);
      if (known.has(p.name.toLowerCase().replace(/[^a-z0-9]/g, ''))) continue;
      candidates.push({ ...p, source: src.name, firstSeen: new Date().toISOString() });
    }
  }

  // Best Buy API (when a key is configured) — their catalog is huge
  if (process.env.BESTBUY_CLIENT_ID) {
    for (const brand of ['Lenovo', 'ASUS', 'HP', 'Acer', 'Dell', 'Razer', 'MSI']) {
      const r = await scrapeBestBuyApi(`${brand} laptop`);
      if (r.ok && Array.isArray(r.products)) {
        for (const p of r.products) {
          const fp = (p.simpleName + (p.url || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seen.has(fp)) continue;
          seen.add(fp);
          if (known.has(p.simpleName.toLowerCase().replace(/[^a-z0-9]/g, ''))) continue;
          candidates.push({
            name: p.simpleName,
            brand: p.brandName,
            image: p.image?.large ?? null,
            url: p.url,
            price: parseFloat(p.salePrice ?? p.price ?? 0) || null,
            currency: 'USD',
            inStock: p.stock !== 'outOfStock',
            source: 'Best Buy API',
            firstSeen: new Date().toISOString(),
          });
        }
      }
    }
  }

  return { generatedAt: new Date().toISOString(), count: candidates.length, candidates: candidates.slice(0, 300) };
}
