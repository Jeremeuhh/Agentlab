# Dossier de faisabilité — une app de covoiturage pour festivals

Une plateforme de covoiturage verticalisée sur les festivals multi-jours à camping, distribuée en B2B2C via les organisateurs qui y trouvent un argument RSE mesurable, et différenciée de BlaBlaCar par la gestion du retour à heure flottante, la logique de groupe et la coordination J+1 — autant de cas d'usage que le covoiturage généraliste ne modélise pas. La monétisation cible un modèle hybride commission par trajet + licence annuelle vendue au festival, avec un MVP volontairement limité au retour post-événement pour valider le différenciant le plus fort avant d'élargir.

---

## Brief (cadrage)

**Idée :** une app de covoiturage pour festivals

**Cadrage :**
- Q : Le modèle cible-t-il les festivals multi-jours avec camping (retour incertain et bagage lourd) ou les concerts d'une nuit à horaire fixe — car la logistique de trajet retour diffère radicalement ?
  R : non précisé
- Q : Comment gérer le pic de départ simultané de dizaines de milliers de personnes sur une fenêtre de 2-3h en fin de festival, là où les apps de covoiturage classiques supposent des départs échelonnés ?
  R : non précisé
- Q : Les organisateurs de festivals sont-ils des partenaires cibles ou des concurrents directs, sachant que beaucoup vendent déjà des navettes officielles et ont un accès privilégié à leur base de festivaliers ?
  R : non précisé
- Q : La monétisation est-elle viable sur un usage ultra-épisodique (2-5 festivals par an par utilisateur) — et quel modèle tient : commission par trajet, pass saison, licence B2B vendue aux festivals ?
  R : non précisé
- Q : BlaBlaCar et Waze Carpool couvrent déjà mécaniquement ce segment : quelle fonctionnalité spécifique festival (coordination de camping, split de parking, retour flexible J+1) justifie une app dédiée plutôt qu'un partenariat ?
  R : non précisé
- Q : Comment gérer la vérification d'identité et la sécurité dans un contexte nocturne avec possible consommation d'alcool, sans friction suffisante pour décourager l'adoption à la dernière minute ?
  R : non précisé
- Q : La stratégie de lancement est-elle géographiquement concentrée sur 2-3 festivals majeurs pour atteindre la masse critique bilatérale, ou une approche agrégateur dès le départ — et comment éviter le cold-start problem côté conducteurs pour chaque nouvel événement ?
  R : non précisé

## Marché

## TAM / SAM / SOM

### Hypothèses de cadrage

| Variable | Valeur retenue | Source / raisonnement |
|---|---|---|
| Festivaliers aux grands événements musicaux Europe (≥5 000 pers.) | 80 M/an | IMS, Eventbrite State of the Industry 2023 |
| Part voyageant depuis hors agglomération (besoin de transport) | 40 % | Enquêtes mobilité festivals FR (ADEME, Hellfest) |
| Taux d'adoption potentiel covoiturage sur ce segment | 25 % | Benchmark BlaBlaCar : 18-30 % selon corridor |
| Revenue moyen par trajet (commission 15 % sur trajet ~€25) | €15-20 | Grille BlaBlaCar + marge opérateur |
| Fréquence d'usage | 2 festivals/an | Usage typique core-user |

---

### TAM — Marché européen du covoiturage événementiel

> Périmètre : Europe des 27 + UK + Suisse, concerts et festivals ≥5 000 spectateurs.

```
80 M spectateurs × 40 % hors-agglomération × 25 % adoption
= 8 M trajets/an × 2 (aller-retour) × €17,50 moyenne
≈ 280 M €/an
```

**TAM estimé : ~300 M€/an**, en croissance de 12-15 %/an portée par le rebond post-COVID et la montée en puissance de la mobilité durable comme critère d'image pour les organisateurs.

---

### SAM — France, Benelux, UK (horizon 3 ans)

Périmètre opérationnel réaliste pour une première phase de déploiement :

- France : ~10 M spectateurs grands événements, densité de festivals parmi les plus élevées d'Europe (Hellfest, Solidays, Rock en Seine, Vieilles Charrues, Main Square…)
- UK : marché festival mature, 12 M festivaliers Glastonbury-tier, culture du carpool établie
- Benelux : festivals Tomorrowland, Dour, poids du modèle co-voiturage (Commuterz, BlaBlaCar)

```
France : 10 M × 40 % × 25 % × 2 × €17,50 = 35 M€
UK :     12 M × 35 % × 22 % × 2 × €17,50 = 32 M€
Benelux :  4 M × 40 % × 28 % × 2 × €17,50 = 16 M€
```

**SAM estimé : ~80 M€/an**

---

### SOM — Part capturable à 5 ans

Hypothèse stratégie B2B2C (voir positionnement) : 10 festivals partenaires en France dès l'an 2, 25 en Europe à l'an 5.

| Horizon | Utilisateurs actifs | ARR estimé |
|---|---|---|
| An 2 (France, 10 festivals) | 80 000 | ~2,5 M€ |
| An 3 (France + UK, 20 festivals) | 250 000 | ~7 M€ |
| An 5 (3 pays, 40 festivals) | 700 000 | ~20 M€ |

**SOM cible : 15-20 M€ ARR à 5 ans**, soit ~25 % du SAM France+UK. Hypothèse haute si BlaBlaCar ne réagit pas avec une offre verticalisée ; hypothèse basse (~10 M€) si un acteur établi lance une feature dédiée.

---

## Concurrents principaux

### Concurrents directs

**BlaBlaCar** est le seul concurrent sérieux sur le covoiturage longue distance en France et Europe — 26 M membres, confiance établie, pricing mature. Sa faiblesse structurelle : il est construit autour du départ à heure fixe d'un conducteur solo. Les cas d'usage festival (retour incertain, départ en vague, groupe de 4 cherchant une voiture) cassent son modèle de matching. Il n'a aucune feature spécifique événement à ce jour.

**Uber/Bolt** capte les trajets courts aux abords des festivals, mais le surge pricing en fin d'événement (×4 à ×6 observé à Glastonbury, Hellfest) est le pain point le plus documenté par les festivaliers — et un argument d'acquisition direct.

**Les navettes officielles des festivals** (Hellfest Express, bus Solidays…) sont des concurrents indirects et des partenaires potentiels. Elles couvrent les corridors les plus denses mais pas la capillarité — moins de 15 % des festivaliers les empruntent en moyenne.

### Le vrai concurrent : l'informel

Les groupes Facebook, WhatsApp et Reddit sont aujourd'hui le premier canal de covoiturage festival. Gratuits, portés par la communauté existante, adaptés au contexte. Faiblesse : zéro matching automatisé, zéro paiement intégré, zéro gestion de responsabilité. C'est contre ce statu quo, pas contre BlaBlaCar, que la proposition de valeur doit d'abord convaincre.

### Absence d'acteur vertical établi

Aucun opérateur n'a de positionnement festival consolidé en Europe. Quelques tentatives ont existé (PickMeUp UK, Liftshare Events) sans atteindre la masse critique. Le segment est structurellement non servi — ce qui valide l'opportunité et justifie l'urgence d'exécution.

---

## Tendances sectorielles

**Rebond durable du marché festival.** Le segment a retrouvé et dépassé ses niveaux 2019 en 2023 (+18 % en valeur, source Live Nation). La demande expérientielle portée par la Gen Z (25-34 ans surindexés) soutient la croissance à moyen terme.

**Pression environnementale devenue contrainte réglementaire.** En France, la loi Climat & Résilience et les cahiers des charges des DRAC imposent désormais aux festivals subventionnés un plan mobilité durable. Le covoiturage organisé est le levier le moins coûteux pour réduire le bilan carbone événementiel — ce qui crée une demande B2B organique.

**Saturation du segment domicile-travail.** BlaBlaCar et les acteurs du covoiturage quotidien (Klaxit, Karos) se tournent vers de nouveaux verticaux. Si le segment festival n'est pas capturé rapidement par un acteur dédié, il sera absorbé par une feature BlaBlaCar Events d'ici 18-36 mois.

**Fragmentation croissante des apps festival.** Les festivaliers sont habitués à des outils verticaux dédiés (apps line-up, cashless, walkie-talkie). Une app covoiturage spécifique est moins disruptive dans cet écosystème qu'elle ne l'aurait été il y a cinq ans — l'éducation du comportement est en partie faite.

---

## Positionnement recommandé

**Stratégie B2B2C, pas B2C direct.** Le cold-start problem (trop peu de conducteurs pour matcher les passagers sur chaque événement) est fatal en approche directe au grand public. La solution : vendre une licence SaaS aux festivals. En échange, le festival intègre la plateforme dans sa communication officielle, offre un accès prioritaire au parking covoiturage, et fournit sa base d'inscrits comme surface d'acquisition. Le festival y gagne un KPI RSE mesurable ; l'app y gagne une audience captive et qualifiée dès le lancement.

**Différenciateurs opérationnels vs BlaBlaCar** à mettre en avant :
- Matching sur créneau horaire de retour flottant (« entre 22h et minuit ») plutôt qu'heure fixe
- Gestion du groupe entrant (4 amis cherchent un seul véhicule)
- Badge communauté : l'appartenance au même festival remplace en partie la vérification d'identité froide

**Éviter la concurrence frontale sur les trajets génériques.** Un partenariat ou un white-label BlaBlaCar pour les corridors denses (Paris → Clisson pour Hellfest) est plus défendable qu'une guerre de position avec 26 M membres enrôlés.

**Lancement géographiquement concentré.** 3 festivals « signature » pour la première saison — un à forte identité communautaire (Hellfest), un à dominante publique jeune urbaine (Solidays), un à fort enjeu mobilité (festival isolé, accès limité). Densité et réputation avant couverture.

## Chiffrage

## Coûts de démarrage

### Développement produit

| Poste | Hypothèse | Montant |
|---|---|---|
| Développement MVP (iOS + Android + backend) | 2 devs × 7 mois, en régie ou agence mid-range | 120 000 – 180 000 € *(estimation à valider)* |
| Design UX/UI | Freelance senior, 2 mois | 15 000 – 25 000 € *(estimation à valider)* |
| Infrastructure cloud (AWS/GCP, année 1) | Faible charge initiale | 6 000 – 12 000 € *(estimation à valider)* |
| Sécurité & vérification d'identité | Intégration SDK tiers (Onfido, Stripe Identity) | 5 000 – 10 000 € *(estimation à valider)* |
| **Sous-total produit** | | **~150 000 – 225 000 €** |

### Coûts non-produit (année 0)

| Poste | Montant |
|---|---|
| Frais légaux (CGU, RGPD, statuts, assurance RC) | 10 000 – 20 000 € *(estimation à valider)* |
| Marketing lancement (2-3 festivals pilotes : présence terrain, influenceurs, partenariats) | 30 000 – 60 000 € *(estimation à valider)* |
| Frais de structure (bureau, outils SaaS, comptabilité) | 8 000 – 15 000 €/an *(estimation à valider)* |
| **Sous-total non-produit** | **~50 000 – 95 000 €** |

**Enveloppe totale de démarrage (jusqu'au premier break-even) : 200 000 – 320 000 €** *(estimation à valider)*, hors salaires fondateurs.

---

## Modèle de revenus

Deux modèles complémentaires, à combiner selon la traction :

### Modèle A — Commission par trajet (B2C)
Applicable si l'app sert de place de marché directe entre festivaliers.

- Commission prélevée sur le montant partagé entre passagers
- Taux cible : **15 %** *(estimation à valider)*, aligné sur BlaBlaCar
- Avantage : revenus indexés sur l'usage réel
- Risque : ultra-saisonnier, quasiment nul hors mai-août

### Modèle B — Licence B2B vendue aux festivals
L'organisateur achète un module « covoiturage officiel » intégré à son app ou billetterie.

- Cible : festivals 20 000+ entrées qui cherchent à réduire la pression parking et répondre aux obligations RSE/mobilité
- Prix indicatif : **5 000 – 15 000 €/festival** *(estimation à valider)*, selon taille et fonctionnalités
- Avantage : prévisibilité, accès direct à la base festivaliers, résout le cold-start problem
- Risque : cycle de vente long (6-18 mois), interlocuteurs souvent des mairies ou associations

### Modèle C — Pass festivalier annuel (optionnel, année 2+)
Abonnement consommateur donnant accès prioritaire et frais réduits.

- Prix cible : **10 – 20 €/an** *(estimation à valider)*
- Pertinent uniquement si la base utilisateurs dépasse ~50 000 comptes actifs

---

## Hypothèses de prix et de volume

| Paramètre | Hypothèse centrale | Source / commentaire |
|---|---|---|
| Distance moyenne trajet festival | 80 km aller | *(estimation à valider)* — festivals régionaux majoritaires |
| Contribution demandée au passager | 12 – 22 € | *(estimation à valider)* — barème URSSAF 2026 : ~0,15 €/km/passager |
| Commission nette app (modèle A) | **1,80 – 3,30 €/trajet** (15 % × prix moyen) | *(estimation à valider)* |
| Nombre de trajets moyen/festival | 500 – 2 000 | *(estimation à valider)* — 1-4 % des entrées en covoiturage app |
| Festivals partenaires année 1 | 3 pilotes | *(estimation à valider)* |
| Festivals partenaires année 3 | 20 – 30 | *(estimation à valider)* |

**Hypothèse saisonnalité :** 80 % des trajets se concentrent sur 14 semaines (mi-mai → fin août). Le modèle doit intégrer un creux de revenus B2C de 9 mois.

---

## Seuil de rentabilité (break-even)

### Charges fixes mensuelles (équipe post-MVP, 4 personnes)

| Poste | Mensuel |
|---|---|
| 2 développeurs (charges comprises) | 14 000 – 18 000 € *(estimation à valider)* |
| 1 product/growth | 6 000 – 8 000 € *(estimation à valider)* |
| 1 commercial B2B (dès mois 6) | 5 000 – 7 000 € *(estimation à valider)* |
| Infrastructure + outils | 1 500 – 2 500 € *(estimation à valider)* |
| Marketing opérationnel | 3 000 – 8 000 € *(estimation à valider)* |
| **Total burn mensuel** | **~30 000 – 44 000 €** *(estimation à valider)* |

### Calcul du break-even selon le modèle dominant

**Modèle A seul (commission) :**
- Marge par trajet : ~2,50 € *(estimation à valider)*
- Trajets nécessaires/mois pour couvrir 37 000 €/mois : **~15 000 trajets** *(estimation à valider)*
- Avec 20 festivals × 750 trajets = 15 000/saison → **non rentable en modèle B2C pur** sur l'année complète

**Modèle B seul (licences festivals) :**
- À 8 000 €/festival × 12 festivals/an = **96 000 €/an**
- Charges annuelles : ~420 000 – 530 000 €
- Licences nécessaires : **55 – 70 festivals/an** pour couvrir seul *(estimation à valider)* — difficile avant l'année 4-5

**Modèle mixte (réaliste, année 3) :**

| Source | Volume | Revenus annuels |
|---|---|---|
| Licences B2B | 15 festivals × 8 000 € | 120 000 € *(estimation à valider)* |
| Commission B2C | 30 festivals × 1 000 trajets × 2,50 € | 75 000 € *(estimation à valider)* |
| **Total** | | **~195 000 €** |
| Charges annuelles | | ~420 000 – 530 000 € |
| **Gap à couvrir** | | **~225 000 – 335 000 €** |

Le break-even opérationnel n'est pas atteignable avant l'**année 4-5** en croissance organique, ou l'**année 2-3** si un accord-cadre avec 3-5 festivals majeurs (Hellfest, Solidays, Les Vieilles Charrues) est signé dès le lancement et finance une partie du développement.

> **Conclusion chiffrage :** le projet est capitalistiquement léger (~300 k€ pour atteindre le marché) mais structurellement contraint par la saisonnalité et le cycle de vente B2B long. Le modèle hybride commission + licence est le seul chemin crédible vers la rentabilité ; un financement de 18-24 mois de runway (~600 000 – 900 000 € *(estimation à valider)*) est nécessaire pour tenir jusqu'au break-even.

## Plan

Les réponses non renseignées imposent des hypothèses de travail explicites ; elles sont signalées en italique et devront être validées avant de lever du financement.

---

## Hypothèses structurantes retenues

| Axe | Hypothèse de travail |
|---|---|
| Cible | Festivals multi-jours avec camping (Hellfest, Garorock, Solidays…) — logistique la plus complexe, donc différenciation la plus forte |
| Partenaires | Organisateurs traités comme canaux de distribution B2B, pas comme concurrents |
| Monétisation | Commission 10-15 % par trajet + licence annuelle B2B vendue au festival |
| Lancement | 2 festivals pilotes la première saison pour atteindre la masse critique |
| Différenciant clé | Coordination retour flexible (J / J+1 / J+2), split parking, gestion de bagages lourds — fonctions absentes de BlaBlaCar |

---

## Définition du MVP

Le MVP est la surface minimale qui résout **un seul problème mieux que BlaBlaCar** : le retour post-festival, imprévisible et chargé.

**Ce que le MVP fait :**
- Création d'annonce de trajet liée à un événement (non à une adresse libre)
- Recherche par festival + fenêtre de départ ("après 22h samedi" à "dimanche matin")
- Profil conducteur vérifié (email + téléphone ; *vérification pièce d'identité différée post-MVP*)
- Chat in-app + confirmation de réservation
- Paiement en ligne avec commission plateforme
- Option "flexible J+1" : le conducteur signale qu'il peut partir le lendemain matin

**Ce que le MVP ne fait pas :**
- Coordination intra-camping, carte interactive du site
- Notation en temps réel
- Application native iOS/Android (PWA responsive suffit pour valider l'usage)
- Multi-langue

---

## Séquencement en 4 phases

### Phase 0 — Cadrage & découverte client (semaines 1–3)

Objectif : invalider ou confirmer les hypothèses avant d'écrire une ligne de code.

- [ ] 20 entretiens utilisateurs : festivaliers 18-35 ans ayant eu un problème de retour
- [ ] 3 entretiens organisateurs (responsable transport ou partenariats)
- [ ] Audit BlaBlaCar sur 3 festivals 2025 : volume d'annonces, taux de remplissage, délais de publication
- [ ] Décision go/no-go sur hypothèses monétisation et B2B

**Jalon :** synthèse des entretiens + confirmation du différenciant clé — fin semaine 3

---

### Phase 1 — Prototype & validation (semaines 4–10)

Objectif : avoir 50 trajets réels sur un festival pilote.

- Développement MVP (stack recommandée : Next.js + Supabase + Stripe — équipe de 1-2 devs)
- Partenariat signé avec **1 festival pilote** (objectif : accès à leur newsletter ou réseaux sociaux)
- Campagne de pré-inscription : landing page + waitlist ouverte 8 semaines avant le festival
- Test beta fermé : 200 utilisateurs, 0 % commission pour ne pas bloquer l'adoption

**Jalons :**
- Semaine 6 : MVP en ligne, beta ouverte
- Semaine 10 (J du festival) : 50 trajets complétés, NPS collecté

---

### Phase 2 — Itération & second pilote (semaines 11–20)

Objectif : répliquer sur un deuxième festival avec les apprentissages du premier.

- Correction des frictions majeures identifiées en phase 1
- Activation de la commission (10 %)
- Démarche commerciale B2B : présentation du deck festival + données pilote 1
- Objectif : **1 contrat de licence signé** avec un organisateur

**Jalons :**
- Semaine 14 : roadmap v2 figée
- Semaine 20 : festival pilote 2 complété, premier revenu B2B

---

### Phase 3 — Passage à l'échelle (semaines 21–52)

Objectif : 5+ festivals, rentabilité opérationnelle sur la saison.

- Application native si le taux de conversion PWA → installation dépasse 40 %
- Vérification d'identité automatisée (Stripe Identity ou équivalent)
- Développement commercial B2B : 10 festivals pour la saison suivante
- Exploration subvention ADEME / mobilité verte (argument CO₂ évité mesurable)

**Jalon :** bilan de saison — CAC, LTV, taux de rematch conducteur/passager — base du dossier de levée seed

---

## Premières actions cette semaine

1. **Lundi** — Lister 30 festivaliers dans le réseau proche et envoyer un message court pour cadrer 20 entretiens (20 min, format visio)
2. **Mardi** — Identifier les responsables transport de 3 festivals (Hellfest, Garorock, We Love Green) via LinkedIn ; envoyer une demande de contact
3. **Mercredi** — Scraper manuellement BlaBlaCar sur une édition 2024/2025 d'un festival cible : nombre d'annonces publiées, délai avant festival, taux de places disponibles vs réservées
4. **Jeudi** — Rédiger le guide d'entretien utilisateur (10 questions max) et le valider sur 2 personnes
5. **Vendredi** — Décision : continuer seul ou chercher un co-fondateur tech ? Si solo : évaluer No-Code (Bubble/Adalo) pour avancer plus vite jusqu'au pilote

---

## Risques prioritaires à surveiller

| Risque | Mitigation |
|---|---|
| Cold-start conducteurs au premier festival | Recrutement actif via groupes Facebook/Reddit du festival ciblé 6 semaines avant |
| Festival qui intègre lui-même la fonctionnalité (via BlaBlaCar Pro) | Aller vite — être déjà présent avec des données avant qu'ils bougent |
| Usage ultra-épisodique = CAC non amorti | Partenariat B2B obligatoire pour monétiser le canal d'acquisition, pas seulement la transaction |
| Retour nocturne + alcool : responsabilité légale | CGU claires, signalement in-app, pas de tolérance zéro sur les avis négatifs — *avis juridique recommandé avant lancement public* |

## Trajectoires

## Scénario 1 — Prudent : le laboratoire local

**Hypothèse centrale :** l'app n'existe pas encore ; on valide le modèle avant d'investir.

**Investissement** : < 50 k€ (dev no-code/low-code ou MVP React Native + Firebase, 1 dev part-time, 0 commercial à plein temps). Financement : fonds propres ou love money.

**Rythme :**
- M0–M3 : MVP minimaliste — annonce de trajet, matching manuel par groupe WhatsApp automatisé, zéro paiement intégré (virement ou Lydia entre pairs).
- M4–M9 : déploiement sur 2 festivals test en France (ex. Hellfest + Garorock), partenariat informel avec 1–2 associations de festivaliers pour seeding côté conducteurs.
- M10–M18 : bilan, décision go/no-go sur un vrai financement.

**Risques spécifiques :**
- Cold-start quasi-certain sur chaque événement sans budget acquisition ; le bouche-à-oreille est lent.
- Absence de monétisation = pas de revenus pour mesurer la viabilité business, seulement l'usage.
- Dépendance à la bonne volonté des conducteurs sans incentive financier structuré.

**Issue :** deux cas. Si NPS élevé et taux de remplissage > 60 % sur les événements test → base pour lever 300–500 k€ en seed. Si stagnation → pivot ou abandon avec moins de 12 mois et < 50 k€ brûlés.

---

## Scénario 2 — Réaliste : la niche défendable

**Hypothèse centrale :** on choisit un positionnement précis — festivals multi-jours avec camping — et on l'assume comme différenciateur face à BlaBlaCar (retour flexible J+1, coordination matériel partagé, logique de "groupe camping" plutôt que covoiturage point A→B).

**Investissement :** 300–600 k€ sur 24 mois (seed ou subvention BPI + amorçage régional). Équipe : 2 dev, 1 growth, 1 bizdev festivals.

**Rythme :**
- M0–M6 : app native iOS/Android, paiement intégré (Stripe), vérification identité légère (photo + numéro de billet festival comme preuve d'entrée), système de groupes par camping.
- M7–M12 : 5–8 festivals partenaires signés en B2B (intégration widget sur leur billetterie, partage de base email festivaliers contre visibilité). Commission 10–15 % par trajet.
- M13–M24 : 15–20 festivals, expansion vers festivals européens voisins (Belgique, Espagne), test d'un pass saison 29 €.

**Risques spécifiques :**
- Le B2B festivals est lent à signer (cycles budgétaires annuels, interlocuteurs surchargés en saison).
- Le pic de départ simultané reste un problème non résolu : sans algorithme de coordination de départ par vague, l'UX s'effondre précisément au moment le plus critique.
- Les organisateurs peuvent internaliser la fonctionnalité ou muscler leurs navettes officielles si le volume devient visible.

**Issue :** breakeven opérationnel possible à ~25 k trajets/an à commission moyenne 8 €. Si atteint en Y2 → série A de 2–4 M€ pour accélérer l'internationalisation. Si raté → cession d'actifs (base utilisateurs, contrats festivals) à un acteur mobilité.

---

## Scénario 3 — Ambitieux : la plateforme de mobilité événementielle

**Hypothèse centrale :** le festival n'est qu'un segment d'entrée ; la cible réelle est toute mobilité événementielle à pic (concerts, matchs, grands rassemblements). L'avantage concurrentiel est la coordination temps réel de flux de départ massifs — un problème que BlaBlaCar ne cherche pas à résoudre.

**Investissement :** 2–5 M€ sur 36 mois (série A dès le départ, ou CVC d'un acteur transport/billetterie). Équipe complète : tech (5–7), ops, sales, data.

**Rythme :**
- M0–M9 : app + API B2B ouverte aux organisateurs, SDK intégrable dans n'importe quelle billetterie (Billetweb, Weezevent, Ticketmaster FR). Algorithme de "vague de départ" : les utilisateurs choisissent une fenêtre horaire, le système optimise les groupes en temps réel 2h avant la fin.
- M10–M18 : partenariats structurels avec 2–3 agrégateurs billetterie pour intégration native au moment de l'achat. Lancement Allemagne + UK.
- M19–M36 : monétisation multi-couche — commission trajet (B2C), licence API (B2B organisateurs), données anonymisées flux mobilité (B2B collectivités/transporteurs).

**Risques spécifiques :**
- Complexité technique réelle de la coordination de départ à grande échelle (problème d'optimisation combinatoire sous contrainte temps réel + géolocalisation).
- Pression des acteurs établis : BlaBlaCar pourrait lancer une verticale événementielle en 6 mois si le segment devient visible ; Ticketmaster pourrait internaliser.
- Burn élevé avant preuve de scalabilité du modèle B2B ; les levées à ce montant exigent une traction déjà convaincante — ce qui crée un paradoxe de séquençage avec le scénario réaliste comme prérequis implicite.

**Issue :** soit une sortie stratégique (acquisition par un acteur mobilité, billetterie ou transport en commun) dans les 5 ans pour 20–80 M€, soit une position de leader européen de la mobilité événementielle avec rentabilité à Y4–Y5. Le risque d'échec complet est aussi le plus élevé : le capital brûlé sans atteindre la masse critique bilatérale laisse peu d'actifs récupérables.

---

**Ce qui distingue les trois scénarios en une ligne :**

| | Prudent | Réaliste | Ambitieux |
|---|---|---|---|
| **Paris** | valider l'usage | capturer la niche | définir la catégorie |
| **Levier principal** | communauté | partenariats B2B | plateforme + API |
| **Horizon de preuve** | 18 mois | 24 mois | 36 mois |
| **Capital risqué** | < 50 k€ | 300–600 k€ | 2–5 M€ |
| **Sortie probable** | pivot ou seed | cession ou série A | acquisition ou IPO segment |

## Synthèse & recommandation

### Cohérences solides

Le dossier est internally consistent sur l'essentiel : la stratégie B2B2C apparaît dans les quatre sections comme la seule réponse crédible au cold-start problem, et les trois scénarios en déclinent logiquement trois niveaux d'ambition. Le MVP est calibré avec discipline — la décision de retarder la vérification d'identité et l'app native est juste. La liste des risques (cold-start, épisodique, responsabilité nocturne) est honnête et non cosmétique. La recommandation de commencer par 2-3 festivals « signature » plutôt qu'un agrégateur généraliste est la bonne séquence.

### Tensions internes

**Le TAM et la réalité opérationnelle ne se serrent pas la main.** Le TAM suppose 25 % d'adoption sur le segment hors-agglomération ; le chiffrage retient 1-4 % des entrées festival en covoiturage via app. L'écart n'est pas réconcilié. Si le taux réaliste est 2 %, le SAM fonctionnel est 5-6× plus petit que les 80 M€ annoncés — et le SOM à 15-20 M€ ARR à 5 ans suppose une part de marché structurellement irréaliste sur ce segment compressé.

**Le plan est un an ; le chiffrage dit quatre à cinq ans.** Le séquencement en 52 semaines se termine sur « base du dossier de levée seed », mais la section chiffrage établit que le break-even opérationnel n'est pas atteignable avant l'année 4-5 en organique. Le plan ignore implicitement les trois années entre les deux, ce qui crée une fausse impression de trajectoire courte.

**Le B2B est central mais son cycle est incompatible avec la fenêtre de trésorerie.** La section chiffrage mentionne des cycles de vente de 6 à 18 mois ; le plan cible un premier contrat de licence à la semaine 20. Pour un festival subventionné ou associatif — interlocuteur type — les décisions budgétaires se bouclent en septembre-octobre pour la saison suivante. Un premier contact en janvier pour un festival de juillet est structurellement trop court.

**Le scénario 2 et le MVP sont en tension sur la stack.** Le plan recommande une PWA pour le MVP ; le scénario réaliste démarre sur une app native iOS/Android dès M0-M6. Ce n'est pas la même mise de fonds ni la même durée. Si le projet suit le scénario 2, le MVP décrit dans le plan est sous-calibré ; s'il suit le plan, le scénario 2 démarre à M10 au plus tôt.

**La concurrence informelle est sous-évaluée.** BlaBlaCar est correctement identifié, mais l'analyse reconnaît elle-même que les groupes Facebook/WhatsApp/Reddit sont « le premier canal de covoiturage festival ». La section positionnement ne propose pas de réponse directe à la question : pourquoi un festivalier qui a déjà un groupe WhatsApp de retour avec ses amis téléchargerait-il une app tierce avec frais de commission ? C'est le vrai obstacle à l'adoption, pas BlaBlaCar.

### Risques majeurs non complètement couverts

**BlaBlaCar Events dans 18-36 mois** est mentionné comme menace mais traité comme hypothèse basse. C'est l'hypothèse centrale. BlaBlaCar a la base, la notoriété, les partenariats festivals existants (navettes sur certains événements) et le pricing power. Une feature « départ flexible post-festival » lui coûte deux sprints. La fenêtre d'exécution est réelle mais étroite.

**Le pic de départ simultané reste un problème ouvert.** Aucun des trois scénarios ne le résout avant le scénario 3, qui l'inscrit comme problème d'optimisation combinatoire à M0-M9. Or c'est précisément le moment de l'événement où l'app sera jugée — 22h30 en fin de festival, 40 000 personnes, réseau saturé, tout le monde veut partir. Si l'UX s'effondre à ce moment, aucun NPS ne survivra.

**La saisonnalité à 80 % sur 14 semaines implique un modèle de coûts fixes incompatible.** Une équipe de 4 personnes à 30-44 k€/mois brûle 270-400 k€ entre septembre et avril pour zéro revenu B2C. Le modèle B2B est censé lisser ça, mais les licences festivals se payent une fois par an, avant la saison. La trésorerie est structurellement sous tension en Q4-Q1 chaque année.

### Recommandation : go conditionnel sur scénario 2, sous quatre conditions bloquantes

**Go** — l'opportunité est réelle. Le segment est structurellement non servi, le vent réglementaire (obligations RSE festivals) est favorable, la compétition verticale est absente, et le capital d'entrée est accessible. Le risque de regret en ne bougeant pas dans les 18 prochains mois est élevé.

**Conditionnel** — quatre conditions doivent être vérifiées avant d'engager du capital :

1. **Phase 0 non négociable.** Les sept questions de cadrage non renseignées ne sont pas du perfectionnisme — plusieurs (multi-jours vs. concert sec, gestion du pic de départ, modèle partenaire vs. concurrent) sont des bifurcations de produit. Les passer en hypothèses de travail sans validation terrain avant de coder est le chemin le plus court vers un MVP qui répond à la mauvaise question.

2. **Un accord de principe festival signé avant de commencer le développement.** Pas un « intérêt informel » mais un email de partenariat avec un responsable transport ou partenariats d'un festival ≥ 20 000 entrées, engagement de relai communication inclus. Sans ça, le cold-start sera fatal et le pilote ne produira pas de données exploitables.

3. **Runway de 18 mois minimum dès le départ, pas 12.** Le premier break-even crédible (modèle mixte, année 3) suppose que les 18 premiers mois sont financés sans pression de revenus. Partir avec 300 k€ sur 12 mois dans un modèle saisonnier signifie lever en plein creux de trésorerie (automne) après une première saison incomplète — position de négociation désastreuse.

4. **Réponse explicite au problème WhatsApp avant le lancement public.** Si la proposition de valeur ne bat pas « groupe WhatsApp + virement Lydia » sur au moins deux dimensions concrètes (sécurité du paiement, matching automatisé au-delà du réseau existant, ou coordination J+1 que WhatsApp ne gère pas), l'adoption restera dans le cercle des early adopters technophiles et ne se diffusera pas.

**No-go immédiat si :** la Phase 0 ne confirme pas de friction réelle sur le retour (le problème est peut-être déjà suffisamment résolu par l'informel), ou si aucun festival ne répond positivement en 6 semaines de démarchage — signal que le B2B est plus dur que modélisé et que tout le modèle économique tient sur un canal d'acquisition incertain.
