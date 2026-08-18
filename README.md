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

## Recherche large (par défaut) au lieu de codes ROME

Après avoir constaté qu'une offre réelle (Decathlon, ingénieur composants footwear) n'était
récupérable sous aucun des 5 codes ROME essayés successivement, le filtrage par ROME côté API
est devenu **optionnel et désactivé par défaut** (case "Recherche large" dans les paramètres).
Impossible de deviner à l'avance tous les codes ROME que les entreprises utilisent pour des
métiers hybrides (textile/mode/ingénierie) — la recherche large récupère tous les métiers pour
chaque zone géographique active, et c'est le moteur de score (lexique + entreprises ciblées) qui
fait le tri ensuite. Décoche la case si tu veux explicitement restreindre à quelques métiers
(recherche plus rapide côté volume de données, mais tu reprends le risque de rater des offres).

## Couverture élargie (suite à un cas manqué : Decathlon Offer & Design)

Trois corrections après qu'une offre réelle (ingénieur composants footwear, Decathlon Offer &
Design, Wattrelos) soit passée à travers :

- **ROME élargi** : ajout de `H1205` (études-modèles industrie des matériaux souples — couvre
  les rôles ingénierie textile/footwear que H1206/H1210/H1204/H1502 ne couvrent pas toujours).
- **Zones actives par défaut élargies** (9 au lieu de 3 : France entière, Grenoble, Lyon, Paris,
  Toulouse, Bordeaux, Nantes, Lille, Marseille) — sans localisation, l'API trie uniquement par
  date décroissante et peut ne jamais faire remonter une offre un peu ancienne publiée loin des
  zones actives. Rayon en select (10/30/60/100 km, les seuls paliers acceptés par l'API — un
  input libre pouvait envoyer une valeur invalide).
- **Lexique moins strict** : ajout de mots-clés standalone moins exigeants (`conception` seul,
  `composants`, `équipements`, `laboratoire`, `footwear/chaussants/upper/semelles`,
  `process de décoration`, `caractérisation`…) qui ne demandaient auparavant qu'une phrase
  complète (ex. "conception produits") pour compter.
- **Fallback générique Decathlon** : toute offre dont l'entreprise commence par "Decathlon"
  (n'importe quel département/sous-marque, même non listé dans les 162 entreprises ciblées)
  est remontée à un score plancher de 62, sauf si le texte sent clairement la vente/caisse
  (détection retail existante). Étiquetée "département non répertorié — à vérifier au cas par
  cas" pour rester transparent sur le niveau de confiance.

## Entreprises ciblées

Panneau "Entreprises ciblées" (sous les paramètres de recherche) : liste éditable de marques
sport (préchargée avec 162 entreprises — montagne, vélo, nautisme, protection, textile
technique, laboratoires d'essais…), chacune avec une note ★1–5 d'importance.

- **Case à cocher par entreprise** : décocher désactive la correspondance sans supprimer
  l'entreprise de la liste (elle reste visible, réactivable en un clic). Boutons "Tout cocher"
  / "Tout décocher" pour aller vite. Le bouton ✕ supprime définitivement.
- Toute offre dont l'entreprise (cochée) matche la liste (comparaison tolérante : accents,
  SAS/SARL, variantes de nom ignorés) a son score automatiquement remonté à
  `45 + priorité×10` (★5 → 95), même si le texte de l'offre est pauvre en mots-clés.
- Nouvel onglet **🎯 Entreprises cibles** : ne montre que les offres chez ces entreprises,
  et liste en dessous celles **sans offre actuelle** — donc à viser en candidature spontanée.
- Tri "Correspondance entreprise cible" dans la barre d'outils.
- Ajout à l'unité, import en masse (`Nom;Catégorie;Priorité` une ligne par entreprise),
  export (copie presse-papier), reset à la liste par défaut. Tout est stocké en localStorage.

## Mots-clés personnalisés

Panneau "Mots-clés personnalisés" : ajoute n'importe quel mot ou expression (ex. `conception`,
`prototypage`, `cahier des charges`) avec un poids (1–40, défaut 12). Trouvé dans le titre =
poids ×3 automatiquement, comme pour les mots-clés intégrés. Chaque mot est cochable (activer/
désactiver sans le supprimer) et contribue au score global de la même façon que les lexiques
`LEX` du moteur. Utile pour affiner sans toucher au code.

## Ajuster le ciblage

Tout est dans `index.html` :
- `LEX` : lexiques et poids par domaine (ajoute tes mots-clés/marques).
- `NEG` : mots-clés éliminatoires.
- `LOCATIONS` : villes proposées (lat/lon).
- Seuil "Recommandées" : `j.score>=55` dans `TABS`.
