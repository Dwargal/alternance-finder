# Radar Alternance — Briac

App statique (aucun build) qui interroge l'API Apprentissage / La bonne alternance,
puis **analyse le texte complet de chaque offre** (titre + description + description
employeur) pour scorer les offres selon 6 domaines : Sport/Outdoor, Essais/IET,
Ergonomie/Biomécanique, Produit/R&D, Matériaux/Éco-conception, Industrialisation.

## Déploiement Vercel (remplace l'app actuelle)

```
alternance-finder/
├── index.html      ← l'app
├── api/lba.js      ← proxy serverless (token caché côté serveur)
└── README.md
```

1. Pousse ces fichiers dans le repo lié à `alternance-finder-briac.vercel.app`
   (ou `vercel deploy` depuis ce dossier).
2. **Recommandé** : Vercel → Settings → Environment Variables →
   `LBA_API_TOKEN = <le JWT>` puis redeploy. Ensuite, vide la constante
   `FALLBACK_TOKEN` dans `index.html` : le token ne sera plus visible dans
   le code source public.
3. Sans variable d'env, l'app fonctionne quand même : le front bascule
   automatiquement en appel direct à l'API avec le token embarqué (comme avant).

## Comment le tri fonctionne

- Une requête API par **zone active** (chips dans "Paramètres"), avec les codes
  ROME configurés (défaut : H1206, H1210, H1204, H1502). Dédoublonnage par id.
- L'API ne permet pas de filtrer "ingénierie sportive" ou "essais terrain" —
  c'est le **moteur lexical local** qui s'en charge : mots-clés pondérés avec
  bonus ×3 si trouvés dans le titre, bonus de combinaison (sport × essais/ergo),
  bonus marques (Decathlon, Salomon, Rossignol, Petzl, Babolat, Mavic…), et
  malus sur les offres hors-cible (vente, caisse, compta, RH, immobilier…).
- Score 0–100. "Recommandées" = score ≥ 55 et durée ≤ 12 mois (ou inconnue).
  Les contrats > 12 mois restent dans leur onglet dédié.
- Les mots-clés détectés sont **surlignés dans la description** (dépliable).
- Statuts ★ favori / ✓ candidaté / ✕ rejeté persistés en localStorage,
  badge NEW sur les offres jamais vues, export CSV de la vue filtrée.

## Ajuster le ciblage

Tout est dans `index.html` :
- `LEX` : lexiques et poids par domaine (ajoute tes mots-clés/marques).
- `NEG` : mots-clés éliminatoires.
- `LOCATIONS` : villes proposées (lat/lon).
- Seuil "Recommandées" : `j.score>=55` dans `TABS`.
  
