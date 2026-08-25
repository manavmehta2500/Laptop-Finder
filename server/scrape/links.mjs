/**
 * Link verification — "perfect links" guarantee.
 *
 * Each cycle we re-check a rotating sample of offer URLs: the page must load
 * AND its title/head must actually contain the laptop we claim it is. A bad
 * link is flagged in the snapshot (linkOk: false + reason) so the UI can
 * warn and we can fix it in the catalog.
 */
import { fetchPage } from './fetchers.mjs';
import { scoreCandidate } from './matcher.mjs';

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

export async function verifyOfferLink(offer, laptop) {
  const t0 = Date.now();
  const page = await fetchPage(offer.url, { allowBrowser: false, timeout: 12000 });
  if (!page.html) return { linkOk: false, linkNote: `http ${page.status}${page.error ? ' ' + page.error : ''}`, ms: Date.now() - t0 };

  const title = extractTitle(page.html);
  const head = (title + ' ' + page.html.slice(0, 30000)).toLowerCase();
  const score = scoreCandidate(laptop.name, title + ' ' + head.slice(0, 2000));
  const brandOk = offer.site.startsWith('Amazon') || !laptop.brand || head.includes(laptop.brand.toLowerCase());
  const ok = score >= 50 && brandOk;
  return { linkOk: ok, linkTitle: title.slice(0, 120), linkNote: ok ? null : `content mismatch (score ${score.toFixed(0)})`, ms: Date.now() - t0 };
}

/** Pick a rotating sample of offers to verify this cycle. */
export function pickLinkSample(laptops, count = 15, salt = 0) {
  const offers = laptops.flatMap((l) => l.offers.map((o) => ({ laptop: l, offer: o })));
  if (offers.length <= count) return offers;
  const step = offers.length / count;
  const out = [];
  for (let i = 0; i < count; i++) out.push(offers[Math.floor((i + salt % 1) * step) % offers.length]);
  return out;
}
