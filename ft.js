// Proxy France Travail — API "Offres d'emploi v2" (CDD, CDI, etc.)
//
// Pourquoi un proxy : l'API exige un OAuth2 client_credentials (secret côté serveur, jamais
// exposable dans le navigateur) et ne renvoie pas d'en-têtes CORS.
//
// Configuration (gratuite, sans carte bancaire) :
//   1. Créer un compte sur https://francetravail.io
//   2. Créer une application, puis souscrire à l'API "Offres d'emploi v2"
//   3. Vercel → Settings → Environment Variables :
//        FT_CLIENT_ID     = <identifiant client>
//        FT_CLIENT_SECRET = <clé secrète>
//   4. Redéployer
//
// Sans ces variables, l'endpoint renvoie 503 et l'app bascule proprement sur les liens de
// recherche externes (aucune casse).

const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
const SCOPE = "api_offresdemploiv2 o2dsoffre";

let cachedToken = null; // { value, expiresAt } — réutilisé entre invocations chaudes

async function getToken(id, secret) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
    scope: SCOPE,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!r.ok) throw new Error("auth_failed_" + r.status);
  const j = await r.json();
  cachedToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in || 1500) * 1000 };
  return cachedToken.value;
}

export default async function handler(req, res) {
  const id = process.env.FT_CLIENT_ID;
  const secret = process.env.FT_CLIENT_SECRET;
  if (!id || !secret) {
    res.status(503).json({ error: "ft_not_configured" });
    return;
  }

  // Paramètres autorisés, transmis tels quels à l'API France Travail
  const allowed = [
    "motsCles", "typeContrat", "experience", "qualification", "commune", "departement",
    "region", "distance", "range", "minCreationDate", "maxCreationDate", "codeROME",
    "natureContrat", "dureeHebdo", "alternance",
  ];
  const qs = new URLSearchParams();
  for (const k of allowed) if (req.query[k] !== undefined && req.query[k] !== "") qs.set(k, req.query[k]);
  if (!qs.has("range")) qs.set("range", "0-99");

  try {
    const token = await getToken(id, secret);
    const r = await fetch(`${SEARCH_URL}?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    // 204 = aucun résultat (comportement normal de cette API, pas une erreur)
    if (r.status === 204) {
      res.status(200).json({ resultats: [] });
      return;
    }
    if (!r.ok) {
      res.status(r.status).json({ error: "upstream_" + r.status, detail: (await r.text()).slice(0, 300) });
      return;
    }
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: "ft_error", detail: String(e) });
  }
}
