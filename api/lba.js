// Proxy Vercel → API Apprentissage (La bonne alternance)
// Avantages : le token reste côté serveur (variable d'env LBA_API_TOKEN),
// pas de souci CORS, et mise en cache CDN 10 min pour économiser le quota.
//
// Config : Vercel → Project → Settings → Environment Variables
//   LBA_API_TOKEN = <ton JWT>

const UPSTREAM = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search";

export default async function handler(req, res) {
  const token = process.env.LBA_API_TOKEN;
  if (!token) {
    // Pas de token côté serveur → le front bascule automatiquement en appel direct.
    res.status(404).json({ error: "LBA_API_TOKEN non configuré sur Vercel" });
    return;
  }
  const allowed = ["romes", "rncp", "latitude", "longitude", "radius", "target_diploma_level"];
  const qs = new URLSearchParams();
  for (const k of allowed) if (req.query[k] !== undefined) qs.set(k, req.query[k]);

  try {
    const r = await fetch(`${UPSTREAM}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await r.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: "Upstream injoignable", detail: String(e) });
  }
}
