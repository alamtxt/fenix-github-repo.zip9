// Cloudflare Worker – Yahoo chart relay (sirf /v8/finance/chart/ allow)
// Settings → Variables me KEY naam ka secret rakho (koi lamba random text)
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/v8/finance/chart/')) return new Response('not allowed', {status: 404});
    if (env.KEY && req.headers.get('x-key') !== env.KEY) return new Response('forbidden', {status: 403});
    const H = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'};
    for (const h of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
      const r = await fetch('https://' + h + u.pathname + u.search, {headers: H});
      if (r.status !== 429 && r.status < 500) return new Response(r.body, {status: r.status, headers: {'content-type': 'application/json'}});
    }
    return new Response('upstream fail', {status: 502});
  }
};
