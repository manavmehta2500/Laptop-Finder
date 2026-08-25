/**
 * The matcher — picks the right product from a page full of candidates.
 *
 * Deterministic, key-free "AI" scorer: normalizes titles, compares token
 * overlap, and gives heavy weight to model codes (G14, 15IRH8, 8945HS, …)
 * because those are what make a laptop config unique. Plug in an LLM later
 * if you ever want semantic matching — the contract (score(candidate)) is
 * the same.
 */

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** extract model-ish tokens: alnum tokens containing digits, e.g. g14, 15irh8, ux3405 */
const modelTokens = (s) => {
  const tokens = norm(s).split(' ').filter(Boolean);
  return tokens.filter((t) => /\d/.test(t) && /[a-z]/.test(t));
};

const pureNumberTokens = (s) => norm(s).split(' ').filter((t) => /^\d+$/.test(t));

export function scoreCandidate(query, candidateTitle, siteBrand) {
  const q = norm(query);
  const c = norm(candidateTitle);
  if (!q || !c) return 0;

  const qTokens = new Set(q.split(' '));
  const cTokens = new Set(c.split(' '));

  // base overlap
  let overlap = 0;
  for (const t of qTokens) if (cTokens.has(t)) overlap += 1;
  let score = (overlap / Math.max(1, Math.sqrt(qTokens.size))) * 40;

  // model codes are the strongest signal
  const qModels = modelTokens(q);
  const cModels = modelTokens(c);
  if (qModels.length) {
    const matched = qModels.filter((m) => cModels.some((cm) => cm === m || cm.includes(m) || m.includes(cm)));
    score += (matched.length / qModels.length) * 45;
  } else {
    score += 10; // no model code to mismatch on
  }

  // brand must not contradict
  if (siteBrand) {
    const b = norm(siteBrand);
    if (b && !c.includes(b) && q.includes(b)) score -= 15;
  }

  // length sanity — a candidate 5x longer than the query is probably a variant
  const ratio = c.length / Math.max(1, q.length);
  if (ratio > 6) score -= 8;

  // bonus for exact phrase containment
  if (c.includes(q)) score += 12;
  if (q.includes(c)) score += 8;

  return score;
}

/**
 * Pick the best product link.
 * candidates: [{ href, title }]
 * Returns { href, title, score } or null when nothing scores high enough.
 */
export function pickBest(candidates, query, siteBrand, threshold = 55) {
  let best = null;
  for (const cand of candidates) {
    const s = scoreCandidate(query, cand.title, siteBrand);
    if (!best || s > best.score) best = { ...cand, score: s };
  }
  if (best && best.score >= threshold) return best;
  return null;
}
