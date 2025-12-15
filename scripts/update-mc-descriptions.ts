import { MongoClient, ObjectId } from 'mongodb';
import { Webinar, WebinarGroup } from '../types';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/pharmia'; // Ensure DB name is part of URI

const masterClassMarkdown = `
# Planning de Formation Continue pour Pharmaciens en Démarrage d'Officine
## Décembre 2025 - Juin 2026

**Format:** Wébinaires en direct
**Horaire:** 18h00
**Jours:** Mercredi, Jeudi, Vendredi
**Plateforme:** À définir (Zoom, Teams, Typebot, etc.)

---\n
## CALENDRIER DÉTAILLÉ - DÉCEMBRE 2025 À JUIN 2026

### **DÉCEMBRE 2025**

#### Mercredi 18 décembre 2025
- **Thème:** Demande spontanée - Gestion des symptômes des maladies hivernales
- **Titre:** "Rhume, grippe, Sinusite, Angines Comment faire la part des choses et prise en charge au comptoir"
- **Objectifs au comptoir:**
  - Savoir identifier les maladies hivernales au comptoir de l'officine
  - Poser les bonnes questions pour qualifier la demande
  - Proposer une prise en charge adaptée ou orientation médicale
  - Gérer les demandes des antibiotiques en automédication

#### Jeudi 19 décembre 2025
- **Thème:** Dermo-cosmétique - Problèmes dermatologiques hivernaux
- **Titre:** "Soigner la peau en hiver : du conseil au comptoir"
- **Objectifs au comptoir:**
  - Reconnaître sécheresse cutanée, gerçures et eczéma hivernal
  - Conseiller produits adaptés (nettoyants, hydratants, protecteurs)
  - Expliquer les mécanismes des problèmes dermatologiques
  - Vendre et justifier les prix des produits premium

#### Vendredi 20 décembre 2025
- **Thème:** Techniques de communication - Accueil et gestion des situations
- **Titre:** "L'accueil au comptoir : écoute active et gestion du stress"
- **Objectifs au comptoir:**
  - Accueillir le patient avec empathie et professionnalisme
  - Gérer les clients impatients et mécontents
  - Maintenir la confidentialité en zone ouverte
  - Créer une relation de confiance malgré le stress

#### Jeudi 26 décembre 2025
- **Thème:** Micronutrition - Renforcement immunitaire hivernal
- **Titre:** "Compléments alimentaires et micronutrition : booster l'immunité en hiver"
- **Objectifs au comptoir:**
  - Évaluer les carences courantes (Vitamine D, B12, Zinc)
  - Recommander des protocoles adaptés aux demandes
  - Connaître les interactions médicament-complément
  - Expliquer les bénéfices vs. risques (preuves scientifiques)
  - Justifier les prix des compléments premium

#### Vendredi 27 décembre 2025
- **Thème:** Ordonnance et conseil - Déchiffrage et vérification
- **Titre:** "Vérifier, valider, conseiller avec la Technique CAO : Conseil Associé à l'Ordonnance"
- **Objectifs au comptoir:**
  - Décoder et valider une ordonnance rapidement et correctement
  - Découvrir le profil du patient avant la dispensation
  - Maitriser la Dispensation et le conseil pharmaceutique adapté
  - Importance de l'hygiène de vie et des conseils alimentataires
  - Comment proposer et justifier la vente additionnelle

**⚠️ CONGÉS : 28 décembre 2025 - 4 janvier 2026**

---\n
### **JANVIER 2026**

#### Mercredi 8 janvier 2026 (Reprise)
- **Thème:** Techniques de vente - Vente éthique et argumentée
- **Titre:** "Vendre en pharmacie avec la technique CAB: éthique, empathie et arguments scientifiques"
- **Objectifs au comptoir:**
  - Identifier les vrais besoins vs. les envies
  - Argumenter avec la Technique CAB orientée Patient/Client
  - Répondre aux objections "Prix"

#### Jeudi 9 janvier 2026
- **Thème:** Pharmacie vétérinaire - Antiparasitaires externes
- **Titre:** "Officine multi-services : accueillir les propriétaires d'animaux"
- **Objectifs au comptoir:**
  - Connaître la législation (ordonnance vétérinaire obligatoire)
  - Identifier les médicaments vétérinaires vs. humains
  - Gérer les interactions homme-animal
  - Conseiller sur automédication vétérinaire
  - Créer une zone dédiée aux produits vétérinaires

#### Vendredi 10 janvier 2026
- **Thème:** Dispositifs médicaux - Classification et conseils
- **Titre:** "Dispositifs médicaux : classer, conseiller, tracer"
- **Objectifs au comptoir:**
  - Identifier la classe des dispositifs (I, II a, II b, III)
  - Connaître les obligations de délivrance
  - Conseiller l'utilisation correcte aux patients
  - Gérer la traçabilité (EURES)
  - Justifier les prix (marquage CE)

#### Mercredi 15 janvier 2026
- **Thème:** Demande spontanée - Approfondissement sur maladies ordinaires
- **Titre:** "Au-delà des symptômes bénins : infections respiratoires et digestives"
- **Objectifs au comptoir:**
  - Distinguer rhume simple, bronchite et pneumonie
  - Évaluer la gravité : critères d'alerte
  - Recommander symptomatologie adaptée (expectorants, antitussifs)
  - Gérer gastro-entérite : réhydratation et régime
  - Connaître les cas où l'antibiotique n'est pas indiqué

#### Jeudi 16 janvier 2026
- **Thème:** Dermo-cosmétique - Acné, psoriasis, eczéma
- **Titre:** "Pathologies cutanées courantes : diagnostic et traitement"
- **Objectifs au comptoir:**
  - Distinguer acné inflammatoire vs. comédonale
  - Conseiller routines adaptées (acné, eczéma, psoriasis)
  - Recommander cosmétiques spécifiques sans majorer les lésions
  - Orienter vers dermatologue si nécessaire
  - Assurer le suivi et la fidélisation du client

#### Vendredi 17 janvier 2026
- **Thème:** Rappels Pharmacologie - Pharmacocinétique et fondamentaux
- **Titre:** "ABC de la pharmacologie : absorber, distribuer, métaboliser, éliminer"
- **Objectifs au comptoir:**
  - Comprendre le trajet du médicament dans l'organisme
  - Adapter posologie selon l'âge, poids, fonctions hépatique/rénale
  - Identifier les populations à risque (enfants, âgés, enceintes)
  - Conseiller sur les interactions prévisibles
  - Justifier modifications de traitement

#### Mercredi 22 janvier 2026
- **Thème:** Ordonnance et conseil - Conseil pharmaceutique et observance
- **Titre:** "Conseiller le traitement pour améliorer l'observance"
- **Objectifs au comptoir:**
  - Expliquer les modes d'administration (oral, injection, application)
  - Gérer les effets secondaires attendus (tolérance, gestion)
  - Optimiser l'observance (rappels, aide-mémoire)
  - Adapter le traitement si effets indésirables
  - Assurer le suivi du patient

#### Jeudi 23 janvier 2026
- **Thème:** Micronutrition - Populations spéciales (sportifs, seniors, femmes)
- **Titre:** "Supplémentation adaptée : du sportif au senior"
- **Objectifs au comptoir:**
  - Évaluer les besoins spécifiques de chaque population
  - Recommander protocoles pour sportifs (récupération, performance)
  - Prévenir ostéoporose chez la femme en transition
  - Compléter allaitements et grossesses
  - Adapter aux régimes (vegan, végétarien)

#### Vendredi 24 janvier 2026
- **Thème:** Techniques de communication - Gestion des conflits
- **Titre:** "Gérer les situations difficiles : client mécontent, refus de délivrance"
- **Objectifs au comptoir:**
  - Écouter sans juger les préoccupations du client
  - Refuser une délivrance et l'expliquer poliment mais fermement
  - Résoudre conflits sans escalade
  - Gérer confidentialité lors de situations sensibles
  - Protéger santé mentale du pharmacien face au stress

#### Mercredi 29 janvier 2026
- **Thème:** Pharmacie vétérinaire - Pathologies courantes
- **Titre:** "Maladies du chien et du chat : conseils au comptoir"
- **Objectifs au comptoir:**
  - Reconnaître symptômes courants chez chien/chat (diarrhée, toux, prurit)
  - Connaître les antiparasitaires (internes/externes)
  - Conseiller prévention (vaccins, alimentation)
  - Orienter vers vétérinaire quand nécessaire
  - Vendre produits vétérinaires et compléments

#### Jeudi 30 janvier 2026
- **Thème:** Dispositifs médicaux - Gestion pratique en officine
- **Titre:** "Du pansement à l'orthopédie : produits et conseils pratiques"
- **Objectifs au comptoir:**
  - Conseiller pansements adaptés à la plaie (sèche, suintante, infectée)
  - Guider sur cicatrisation et prévention infection
  - Recommander produits continence et hygiène intime
  - Conseiller sur contention et maintien (maintiens, chevillères)
  - Démontrer utilisation correcte aux patients

#### Vendredi 31 janvier 2026
- **Thème:** Rappels Pharmacologie - Classes thérapeutiques
- **Titre:** "Les médicaments hivernaux : anti-inflammatoires, antialgiques, antihistaminiques"
- **Objectifs au comptoir:**
  - Connaître les AINS (ibuprofène, naproxène, etc.) et leurs usages
  - Conseiller paracétamol : doses, contre-indications, risques hépatotoxicité
  - Gérer antihistaminiques (sédatifs vs. non-sédatifs)
  - Utiliser décongestionnants responsablement
  - Prévenir interactions (AINS + antihypertenseurs, etc.)

---\n
### **FÉVRIER 2026**

#### Mercredi 5 février 2026
- **Thème:** Demande spontanée - Situations d'urgence
- **Titre:** "Urgences au comptoir : reconnaître et réagir vite"
- **Objectifs au comptoir:**
  - Identifier anaphylaxie et réactions allergiques graves
  - Repérer signes d'infarctus et malaise cardiaque
  - Reconnaître hypoglycémie et crise convulsive
  - Appeler le SAMU à bon escient
  - Gérer la panique et rassurer le patient

#### Jeudi 6 février 2026
- **Thème:** Dermo-cosmétique - Soins anti-âge et transition vers printemps
- **Titre:** "Beauté au printemps : anti-rides, anti-UV et prévention du photovieillissement"
- **Objectifs au comptoir:**
  - Identifier signes de vieillissement cutané (rides, relâchement, taches)
  - Conseiller principes actifs anti-âge (rétinol, peptides, acide hyaluronique)
  - Sensibiliser prévention solaire (SPF adapté, usage régulier)
  - Recommander routines adaptées par type de peau
  - Éduquer sur le photovieillissement et ses conséquences

#### Vendredi 7 février 2026 - **JOURNÉE MONDIALE DES MALADES (11 février)**
- **Thème:** Accompagnement du patient chronique
- **Titre:** "Éducation thérapeutique du patient : accompagner le chronique"
- **Objectifs au comptoir:**
  - Identifier les patients porteurs de pathologies chroniques
  - Implémenter ETP (Education Thérapeutique du Patient)
  - Évaluer observance aux traitements
  - Détecter complications et alertes précoces
  - Renforcer rôle de prévention du pharmacien

#### Mercredi 12 février 2026
- **Thème:** Micronutrition - Nutraceutique et médecine orthomoléculaire
- **Titre:** "Micronutrition avancée : de la carence à la prévention"
- **Objectifs au comptoir:**
  - Comprendre concept de micronutrition vs. macronutrition
  - Évaluer carences via interrogatoire et signes cliniques
  - Prescrire protocoles de supplémentation corrects
  - Prévenir surcharge minérale (toxicité du cuivre, zinc)
  - Éduquer sur alimentation riche en micronutriments

#### Jeudi 13 février 2026
- **Thème:** Ordonnance et conseil - Cas complexes et polypharmacologie
- **Titre:** "Polypharmacologie : gérer les interactions majeures"
- **Objectifs au comptoir:**
  - Détecter interactions majeures P450, transporteurs
  - Consulter bases de données (Thériaque, HAS)
  - Contacter médecin/gériatre pour arbitrage
  - Simplifier les schémas thérapeutiques si possible
  - Assurer adhérence malgré complexité

#### Vendredi 14 février 2026
- **Thème:** Techniques de vente - Merchandising et gestion commerciale
- **Titre:** "Augmenter les ventes : présentation, promotions et fidelisation"
- **Objectifs au comptoir:**
  - Disposer produits pour maximiser visibilité
  - Créer des présentoirs attractifs par catégorie
  - Gérer stocks : ruptures et surstock
  - Proposer promotions responsables (éthique)
  - Analyser données vente pour réajuster offre

#### Mercredi 11 février 2026
- **Thème:** Rappels Pharmacologie - Pharmacovigilance et dépendance
- **Titre:** "Signaler, prévenir, identifier : pharmacovigilance et substances à risque"
- **Objectifs au comptoir:**
  - Signaler effets indésirables à l'ANSM
  - Identifier substances à risque de dépendance (benzodiazépines, opioïdes)
  - Gérer patients à risque (antécédents addictions)
  - Reconnaître usages détournés de médicaments
  - Éduquer patient sur risques d'accoutumance

#### Jeudi 20 février 2026
- **Thème:** Techniques de communication - Digital et téléconsultation
- **Titre:** "Pharmacien connecté : conseil à distance et présence digitale"
- **Objectifs au comptoir:**
  - Dispenser conseils pharmaceutiques par chat/video
  - Documenter consultations distantes
  - Gérer RGPD et confidentialité données
  - Animer présence réseaux sociaux professionnels
  - Protéger cybersécurité de l'officine

#### Vendredi 21 février 2026
- **Thème:** Dispositifs médicaux - Innovation et nouveaux produits
- **Titre:** "Innover en officine : dispositifs connectés et nouvelles technologies"
- **Objectifs au comptoir:**
  - Connaître dispositifs connectés (tensiomètres, glucomètres, balances)
  - Appareils massage et rééducation
  - Tracer dispositifs via EURES (marquage CE)
  - Assurer formation client sur utilisation
  - Valoriser innovation auprès des patients

#### Mercredi 26 février 2026
- **Thème:** Demande spontanée - Synthèse et cas cliniques intégrés
- **Titre:** "Cas cliniques : intégrer tous les apprentissages"
- **Objectifs au comptoir:**
  - Traiter cas réalistes du comptoir
  - Intégrer pharmacologie, conseils, éthique
  - Valider orientation médecin vs. prise en charge
  - Répondre aux questions complexes des participants
  - Préparer aux situations réelles

#### Jeudi 27 février 2026
- **Thème:** Ordonnance et conseil - Synthèse pratique intégrée
- **Titre:** "Procédure complète : vérifier, conseiller, documenter"
- **Objectifs au comptoir:**
  - Maîtriser protocole complet de délivrance
  - Générer arguments persuasifs et personnalisés
  - Documenter interventions de manière traçable
  - Gérer refus de délivrance avec arguments
  - Assurer suivi de l'efficacité thérapeutique

#### Vendredi 28 février 2026 - **JOURNÉE INTERNATIONALE DES MALADIES RARES (28 février)**
- **Thème:** Pharmacien et maladies rares
- **Titre:** "Maladies rares : sensibilisation et rôle clé du pharmacien"
- **Objectifs au comptoir:**
  - Sensibiliser aux maladies rares (définition, épidémiologie)
  - Reconnaître signes d'alerte et favoriser diagnostic précoce
  - Connaître traitements spécifiques (médicaments orphelins)
  - Soutenir patients diagnostiqués (orientation, éducation)
  - Collaborer avec centres de référence

---\n
### **MARS 2026**

#### Mercredi 5 mars 2026
- **Thème:** Demande spontanée - Allergies saisonnières et transition printemps
- **Titre:** "Rhume des foins et allergies : prévention et gestion"
- **Objectifs au comptoir:**
  - Reconnaître symptômes d'allergie saisonnière (rhinite, conjonctivite)
  - Différencier allergie, rhume viral, sinusite
  - Recommander antihistaminiques (effet sédatif vs. non-sédatif)
  - Conseiller rhinocorticoïdes adaptées
  - Éduquer sur prévention (douche, aération, filtration)

#### Jeudi 6 mars 2026
- **Thème:** Dermo-cosmétique - Soins du printemps et protection solaire
- **Titre:** "Préparer la peau au soleil : protection et écrans solaires"
- **Objectifs au comptoir:**
  - Conseiller indices de protection adaptés (SPF 30, 50+)
  - Différencier filtres minéraux vs. chimiques
  - Éduquer sur application correcte (quantités, fréquence)
  - Recommander produits rémanents (eau, sueur)
  - Gérer idées reçues sur protection solaire

#### Vendredi 7 mars 2026
- **Thème:** Micronutrition - Détoxification printanière et wellbeing
- **Titre:** "Détox de printemps : compléments et hygiène de vie"
- **Objectifs au comptoir:**
  - Évaluer demandes de détoxification (foie, reins)
  - Recommander plantes (chardon-marie, romarin, fumeterre)
  - Compléments antioxydants (curcuma, resvératrol, spiruline)
  - Éduquer sur concept de détox (crédibilité/preuve)
  - Intégrer hygiène de vie : hydratation, sommeil, exercice

#### Mercredi 12 mars 2026
- **Thème:** Ordonnance et conseil - Traitements saisonniers du printemps
- **Titre:** "Allergie, asthme, sinusite : conseils sur traitements spécifiques"
- **Objectifs au comptoir:**
  - Vérifier et conseiller antihistaminiques (H1, durée)
  - Gérer antihistaminiques + décongestionnants (risques)
  - Conseiller corticoïdes nasaux (technique application)
  - Monitorer asthme (débit-mètre, reconnaissance crise)
  - Adapter traitement selon réponse clinique

#### Jeudi 13 mars 2026
- **Thème:** Techniques de communication - Communication interculturelle et multilinguisme
- **Titre:** "Officine multiculturaliste : adapter communication aux origines"
- **Objectifs au comptoir:**
  - Adapter langage selon compréhension patient
  - Respecter croyances/pratiques culturelles
  - Éviter suppositions sur adhérence thérapeutique
  - Utiliser interprètes ou outils traduction si nécessaire
  - Sensibiliser équipe à diversité

#### Vendredi 14 mars 2026
- **Thème:** Pharmacie vétérinaire - Saisonnalité vétérinaire (printemps)
- **Titre:** "Saison des puces et tiques : prévention et antiparasitaires"
- **Objectifs au comptoir:**
  - Connaître antiparasitaires externes (pipettes, comprimés, colliers)
  - Recommander prévention: quand commencer, fréquence
  - Éduquer sur risques maladies (Lyme, piroplasmose)
  - Conseiller sur traitement de l'habitat
  - Vendre complets antiparasitaires (interne + externe)

#### Mercredi 19 mars 2026
- **Thème:** Rappels Pharmacologie - Antibiotiques et antiviraux
- **Titre:** "Antibiotiques : bon usage et prévention résistance"
- **Objectifs au comptoir:**
  - Comprendre spectre d'action (large vs. étroit)
  - Conseiller posologie et durée correctes
  - Prévenir automédication antibiotiques
  - Reconnaître effets indésirables courants
  - Éduquer sur complète antibiothérapie

#### Jeudi 20 mars 2026
- **Thème:** Dispositifs médicaux - Matériel de rééducation et mobilité
- **Titre:** "Aider à la mobilité : du déambulateur au fauteuil roulant"
- **Objectifs au comptoir:**
  - Évaluer besoins de mobilité du patient
  - Conseiller aides techniques adaptées (canne, déambulateur, béquilles)
  - Démontrer utilisation correcte et sécuritaire
  - Connaître orthèses et maintiens
  - Orienter vers orthoprothésistes si besoin

#### Vendredi 21 mars 2026
- **Thème:** Techniques de vente - Vente consultative avancée
- **Titre:** "Au-delà de vendre : conseiller et accompagner"
- **Objectifs au comptoir:**
  - Poser questions pour identifier vrais besoins
  - Créer relation client long-terme
  - Augmenter panier moyen par vente croisée responsable
  - Gérer objections clients
  - Mesurer satisfaction client

#### Mercredi 26 mars 2026
- **Thème:** Demande spontanée - Troubles digestifs printaniers
- **Titre:** "Nausées, reflux, constipation : diagnose et recommandations"
- **Objectifs au comptoir:**
  - Différencier causes de dyspepsie (stress, aliments, pathologies)
  - Recommander antacides vs. pansements gastriques
  - Conseiller sur constipation (fibres, hydratation, laxatifs)
  - Gérer diarrhées (réhydratation, probiotiques)
  - Alerter sur signes de gravité (hématémèse, méléna)

#### Jeudi 27 mars 2026
- **Thème:** Dermo-cosmétique - Problèmes spécifiques au printemps (acné printanière)
- **Titre:** "Acné printanière : causes, routines et traitements efficaces"
- **Objectifs au comptoir:**
  - Reconnaître acné inflammatoire vs. comédones
  - Conseiller nettoyage 2x/jour sans agresser
  - Recommander actifs (peroxyde, AHA, BHA, niacinamide)
  - Gérer tolérance (rétinoïdes, acides)
  - Orienter dermatologue si sévère

#### Vendredi 28 mars 2026
- **Thème:** Micronutrition - Sports et performance printanière
- **Titre:** "Sportifs printaniers : complémentation et performance"
- **Objectifs au comptoir:**
  - Évaluer niveau d'entraînement et objectifs
  - Recommander protéines (timing, quantité)
  - Consommer BCAA, créatine : preuve et sécurité
  - Hydratation avant/pendant/après efforts
  - Prévention crampes et fatigue musculaire

---\n
### **AVRIL 2026**

#### Mercredi 2 avril 2026
- **Thème:** Ordonnance et conseil - Traitements pascaux et renouvellements
- **Titre:** "Gestion des ordonnances longue durée et renouvellements"
- **Objectifs au comptoir:**
  - Reconnaître ordonnances valides (durée, nombre renouvellements)
  - Renouveler sans prescription supplémentaire (si permis)
  - Contacter prescripteur pour renouvellement
  - Évaluer besoin de réévaluation du traitement
  - Documenter tous renouvellements

#### Jeudi 3 avril 2026
- **Thème:** Techniques de communication - Gestion des plaintes clients
- **Titre:** "Résoudre les plaintes : écouter, valider, corriger"
- **Objectifs au comptoir:**
  - Accueillir plainte sans défense
  - Valider émotion du client ("Je comprends votre frustration")
  - Investiguer cause réelle du problème
  - Proposer solution concrète et rapide
  - Suivre pour assurer satisfaction

#### Vendredi 4 avril 2026
- **Thème:** Pharmacie vétérinaire - Produits saisonniers avril (tiques, allergies animaux)
- **Titre:** "Allergies saisonnières des animaux : identification et traitement"
- **Objectifs au comptoir:**
  - Reconnaître signes allergie chez chien/chat (grattage, inflammation)
  - Différencier allergie parasite vs. allergie environnement
  - Recommander antihistaminiques pour animaux
  - Conseiller prévention parasitaire
  - Referrer vétérinaire pour diagnostic confirmé

#### Mercredi 9 avril 2026
- **Thème:** Rappels Pharmacologie - Antihistaminiques et gestion allergie
- **Titre:** "Histamine et antihistaminiques : mécanismes et usages"
- **Objectifs au comptoir:**
  - Comprendre rôle histamine dans allergie
  - Différencier H1 vs. H2 (usages différents)
  - Sédation vs. non-sédation (activités du patient)
  - Interactions avec autres médicaments
  - Conseiller posologie et durée

#### Jeudi 10 avril 2026
- **Thème:** Dispositifs médicaux - Appareillages respiratoires
- **Titre:** "Inhalateurs et nébuliseurs : démonstration et conseil"
- **Objectifs au comptoir:**
  - Identifier types inhalateurs (poudre, aérosol dosé, nébuliseur)
  - Démontrer technique inhalation correcte
  - Vérifier utilisation par patient
  - Gérer espaceurs pour enfants
  - Assurer nettoyage et stockage corrects

#### Vendredi 11 avril 2026
- **Thème:** Techniques de vente - Conseil en hygiène et prévention
- **Titre:** "Produits d'hygiène : conseiller prévention et qualité"
- **Objectifs au comptoir:**
  - Recommander hygiène mains (savons, gels alcoolisés)
  - Conseiller brosses dents et dentifrice adapté
  - Produits hygiène féminine adaptée
  - Justifier prix produits premium (composition, sécurité)
  - Éduquer sur hygiène générale

#### Mercredi 16 avril 2026
- **Thème:** Demande spontanée - Infections cutanées printanières
- **Titre:** "Mycoses et infections cutanées : diagnostic et conseils"
- **Objectifs au comptoir:**
  - Reconnaître mycoses (pied d'athlète, intertrigo, mycose unguéale)
  - Différencier mycoses bactéries (impétigo, folliculite)
  - Recommander antifongiques adaptées (topique vs. oral)
  - Conseiller prévention (hygiène, séchage)
  - Alerter sur complications (cellulite)

#### Jeudi 17 avril 2026
- **Thème:** Dermo-cosmétique - Soins cheveux printaniers
- **Titre:** "Santé du cheveu : shampoings, traitements, compléments"
- **Objectifs au comptoir:**
  - Évaluer type cheveu (sec, gras, mixte, sensibilisé)
  - Recommander shampoings adaptés sans sulphates agressifs
  - Conseiller masques et traitements fortifiants
  - Expliquer chute cheveux saisonnière (causes, traitement)
  - Proposer compléments (biotine, zinc, fer)

#### Vendredi 18 avril 2026
- **Thème:** Micronutrition - Fatigue printanière et bien-être
- **Titre:** "Vaincre fatigue printanière : énergie et vitalité"
- **Objectifs au comptoir:**
  - Reconnaître fatigue saisonnière vs. fatigue organique
  - Recommander fer (carence courante)
  - Conseil vitamine B12 et acide folique
  - Proposer plantes tonifiantes (ginseng, rhodiola)
  - Intégrer sommeil et lumière naturelle

#### Mercredi 23 avril 2026
- **Thème:** Ordonnance et conseil - Hormonaux et contraception
- **Titre:** "Contraception orale : conseils et surveillance"
- **Objectifs au comptoir:**
  - Vérifier posologie et schéma de prise
  - Expliquer mécanisme d'action et efficacité
  - Identifier oublis et conduites à tenir
  - Connaître interactions avec autres médicaments
  - Évaluer effets indésirables (saignements anormaux, céphalées)

#### Jeudi 24 avril 2026
- **Thème:** Techniques de communication - Communication avec prescripteurs
- **Titre:** "Contacter le médecin : professionnalisme et efficacité"
- **Objectifs au comptoir:**
  - Savoir quand et comment contacter le médecin
  - Préparer question précise et documentée
  - Communiquer sans juger la prescription
  - Documenter discussions
  - Maintenir secrets professionnel et médical

#### Vendredi 25 avril 2026
- **Thème:** Pharmacie vétérinaire - Antiparasitaires internes avril
- **Titre:** "Vers et parasites internes : traitement et prévention"
- **Objectifs au comptoir:**
  - Connaître signes parasites internes (diarrhée, perte poids)
  - Recommander vermifuges adaptés (chiots, adultes, seniors)
  - Fréquence traitements vs. prévention continue
  - Mettre en place calendrier prévention
  - Éduquer propriétaires sur hygiène (fèces, lavage mains)

---\n
### **MAI 2026**

#### Mercredi 30 avril / Mercredi 7 mai 2026
- **Thème:** Rappels Pharmacologie - Anti-inflammatoires et gestion douleur
- **Titre:** "AINS et paracétamol : efficacité, sécurité et bon usage"
- **Objectifs au comptoir:**
  - Comparer AINS (efficacité, durée action, effets indésirables)
  - Gérer contre-indications (âge, reins, cœur, estomac)
  - Alterne paracétamol-AINS judicieusement
  - Prévenir surdosage paracétamol (toxicité hépatique)
  - Conseiller sur analgésiques adjuvants

#### Vendredi 2 mai 2026
- **Thème:** Dispositifs médicaux - Orthopédie et prévention blessures
- **Titre:** "Prévention blessures sportives : maintiens, attelles, exercices"
- **Objectifs au comptoir:**
  - Évaluer besoin support articulaire
  - Conseiller genouillères, chevillères, ceintures lombaires
  - Démontrer port correct et limitation activités
  - Recommander prévention (échauffement, exercices)
  - Orienter kiné si douleur persistante

#### Mercredi 7 mai 2026
- **Thème:** Demande spontanée - Problèmes digestifs post-activité
- **Titre:** "Nausées post-effort, crampes : causes et solutions"
- **Objectifs au comptoir:**
  - Reconnaître nausées liées à intensité/déshydratation
  - Conseiller hydratation adaptée et boissons électrolytes
  - Recommander gingembre ou menthe poivrée
  - Gérer crampes (étirement, minéraux, hydratation)
  - Alerter sur risques hyperthermie

#### Vendredi 9 mai 2026
- **Thème:** Dermo-cosmétique - Protection solaire avancée
- **Titre:** "Crèmes solaires : SPF, UVA, UVB et protection réelle"
- **Objectifs au comptoir:**
  - Expliquer SPF (couverture UVB uniquement)
  - Recommander protection UVA (3-4 étoiles)
  - Conseiller écrans minéraux vs. chimiques
  - Application correcte et fréquence réapplication
  - Sélectionner crèmes pour peaux sensibles/acnéiques

#### Mercredi 14 mai 2026
- **Thème:** Ordonnance et conseil - Traitements de mai (allergie, asthme optimisé)
- **Titre:** "Optimiser traitement allergie : ajustements et contrôle"
- **Objectifs au comptoir:**
  - Évaluer efficacité traitement actuel
  - Augmenter antihistaminique si inefficace
  - Ajouter corticoïde nasal si besoin
  - Monitorer asthme (débit-mètre)
  - Alerter sur symptômes mal contrôlés

#### Jeudi 15 mai 2026
- **Thème:** Techniques de communication - Éducation patient longue durée
- **Titre:** "Éduquer le patient : patience, clarté et répétition"
- **Objectifs au comptoir:**
  - Adapter langage à compréhension du patient
  - Fragmenter l'apprentissage en petits points
  - Utiliser exemples concrets du quotidien
  - Évaluer compréhension ("Pouvez-vous me redire...")
  - Renforcer régulièrement sans culpabiliser

#### Vendredi 16 mai 2026
- **Thème:** Pharmacie vétérinaire - Vaccins animaux et prévention mai
- **Titre:** "Vaccinations animales : protocole et suivi"
- **Objectifs au comptoir:**
  - Connaître vaccins essentiels (rage, maladie cardiaque)
  - Calendrier de vaccination (chatons/chiots, rappels)
  - Effets secondaires possibles
  - Documenter vaccinations
  - Rappeler propriétaires aux dates de rappel

#### Mercredi 21 mai 2026
- **Thème:** Rappels Pharmacologie - Antiallergiques avancés
- **Titre:** "Cascades immunologiques : allergies IgE vs. intolérance"
- **Objectifs au comptoir:**
  - Expliquer cascade IgE et libération histamine
  - Distinguer allergie vraie (IgE) vs. intolérance
  - Comprendre efficacité antihistaminiques
  - Expliquer pourquoi corticoïdes plus efficaces
  - Conseiller sur limitations (temps, dosage)

#### Jeudi 22 mai 2026
- **Thème:** Dispositifs médicaux - Suivi glycémie et diabète
- **Titre:** "Glucomètres et lecteurs: techniques et conseils"
- **Objectifs au comptoir:**
  - Démontrer glucomètres (ponction, maniement)
  - Conseiller lecteurs glucométriques continus (CGM)
  - Gérer carnet suivi glycémie
  - Alerter sur hypo/hyperglycémie
  - Orienter éducateur diabétique

#### Vendredi 23 mai 2026
- **Thème:** Techniques de vente - Conseil en nutrition et régimes
- **Titre:** "Vendre et conseiller en nutrition : preuves et éthique"
- **Objectifs au comptoir:**
  - Évaluer régimes clients (objectifs, risques)
  - Détecter régimes dangereux (restriction extrême)
  - Recommander nutrition équilibrée
  - Proposer compléments de soutien
  - Orienter nutritionniste si besoin

#### Mercredi 28 mai 2026
- **Thème:** Demande spontanée - Piqûres insectes et désensibilisation
- **Titre:** "Piqûres insectes : traitement et prévention allergies"
- **Objectifs au comptoir:**
  - Gérer démangeaisons piqûres (crème, antihistaminique)
  - Différencier allergie locale vs. systémique
  - Alerter sur signes anaphylaxie
  - Conseiller prévention (répulsifs, vêtements)
  - Recommander auto-injecteur adrénéline si antécédents

#### Vendredi 30 mai 2026
- **Thème:** Dermo-cosmétique - Soins après-soleil et réparation
- **Titre:** "Après-soleil: réparer la peau brûlée et récupérer"
- **Objectifs au comptoir:**
  - Identifier coup de soleil (degré gravité)
  - Recommander hydratants après-soleil
  - Proposer aloe vera, panthénol, hyaluronate
  - Prévenir infection si peau endommagée
  - Éduquer sur non-retour des UV

---\n
### **JUIN 2026**

#### Mercredi 3 juin 2026
- **Thème:** Micronutrition - Préparation été et exposition solaire
- **Titre:** "Antioxydants et compléments solaires : préparer la peau"
- **Objectifs au comptoir:**
  - Recommander caroténoïdes (bêta-carotène, lycopène)
  - Proposer compléments antioxydants (curcuma, resvératrol, polyphénols)
  - Conseil sur timing (4-6 semaines avant soleil)
  - Preuves scientifiques vs. marketing
  - Compléter avec filtres solaires obligatoires

#### Jeudi 4 juin 2026
- **Thème:** Ordonnance et conseil - Traitement été et déshydratation
- **Titre:** "Hydratation et médicaments en été : adaptations nécessaires"
- **Objectifs au comptoir:**
  - Alerter patients sur augmentation besoins hydriques
  - Ajuster certains médicaments (diurétiques, lithium, antiépileptiques)
  - Risques déshydratation (sels minéraux)
  - Gestion médicaments thermolabiles
  - Storage correct en vacances

#### Vendredi 5 juin 2026
- **Thème:** Pharmacie vétérinaire - Vacances animaux et prévention été
- **Titre:** "Préparer vacances avec son animal: prévention et kit santé"
- **Objectifs au comptoir:**
  - Prévention coup de chaleur (symptômes, premiers secours)
  - Traitement déshydratation animal
  - Antiparasitaires complets pour vacances
  - Kit pharmacie pour vacances animal
  - Contacts vétérinaires destination

#### Mercredi 10 juin 2026
- **Thème:** Rappels Pharmacologie - Électrolytes et rythme cardiaque
- **Titre:** "Potassium, sodium, magnésium : importances en cas de chaleur"
- **Objectifs au comptoir:**
  - Comprendre rôle électrolytes (Na, K, Ca, Mg)
  - Reconnaître hyponatrémie, hypokaliémie (symptômes)
  - Interactions médicaments-électrolytes (ACE-I, diurétiques)
  - Recommander solutions réhydratation correctes
  - Alerter sur arythmies si déséquilibres

#### Jeudi 11 juin 2026
- **Thème:** Dispositifs médicaux - Équipements vacances et voyage
- **Titre:** "Équiper vacances: du pansement au tensiomètre"
- **Objectifs au comptoir:**
  - Conseiller kit premiers secours voyage
  - Recommander tensiomètres portables si hypertension
  - Glucomètres/bandelettes en quantité suffisante
  - Produits hygiène adapté climat chaud
  - Informer sur réglementation douanière médicaments

#### Vendredi 12 juin 2026
- **Thème:** Techniques de vente - Ventes saisonnières juin et été
- **Titre:** "Vendre été : maillots, lunettes, camping et produits solaires"
- **Objectifs au comptoir:**
  - Analyser tendances vente saisonnière
  - Promouvoir crèmes solaires premium
  - Vendre articles voyage (trousse, électrolytes)
  - Augmenter panier moyen estival
  - Gérer ruptures saisonnières anticipées

#### Mercredi 17 juin 2026
- **Thème:** Demande spontanée - Mal de voyage et troubles estomac voyage
- **Titre:** "Mal de mer, route et avion: prévention et traitement"
- **Objectifs au comptoir:**
  - Reconnaître causes mal de voyage (vestibulaire, visuel, proprioceptif)
  - Recommander antiémétiques naturels vs. pharmacologiques
  - Conseil gingembre, bracelets acupression
  - Timing meclozine/dimenhydrinate (avant départ)
  - Prévention nausées et vomissements

#### Jeudi 18 juin 2026
- **Thème:** Dermo-cosmétique - Santé peau été: acné, mycoses, dermatites
- **Titre:** "Peau moite en été: sebum, transpiration, infections"
- **Objectifs au comptoir:**
  - Adapter routines acné (nettoyage plus fréquent, matifiants)
  - Prévenir mycoses (pieds humides, intertrigo)
  - Traiter dermatites de contact (bijoux, vêtements)
  - Conseiller poudres et formules légères été
  - Hygiène renforcée (nettoyage, séchage)

#### Vendredi 19 juin 2026
- **Thème:** Micronutrition - Électrolytes et hydratation sportive été
- **Titre:** "Sports été: hydratation, électrolytes, caféine"
- **Objectifs au comptoir:**
  - Recommander boissons électrolytes adaptées
  - Conseil protéines post-entraînement chaud
  - Pré-hydratation avant efforts
  - Caféine vs. fatigue chaleur (risques)
  - Suppléments anti-crampes (potassium, magnésium)

#### Mercredi 24 juin 2026
- **Thème:** Ordonnance et conseil - Synthèse gestion traitement estival
- **Titre:** "Traitements chroniques en vacances: adaptations et continuité"
- **Objectifs au comptoir:**
  - Vérifier quantités médicaments pour vacances
  - Adapter posologies si déplacement horaires
  - Conserver médicaments correctement en chaleur
  - Ordonnances valides à destination
  - Préparer dossier médical/pharmacologique

#### Jeudi 25 juin 2026
- **Thème:** Techniques de communication - Bilan année et fidélisation
- **Titre:** "Fidéliser clients en fin d'année: suivi et anticipation"
- **Objectifs au comptoir:**
  - Relancer patients pour renouvellements attendus
  - Anticiper besoins saisonniers
  - Créer événements fidélisation (anniversaire, fidélité)
  - Gérer insatisfactions résiduelles
  - Prévoir besoins septembre

#### Vendredi 26 juin 2026
- **Thème:** Pharmacie vétérinaire - Synthèse année et prévention été
- **Titre:** "Préparer animaux à l'été: antiparasitaires, vaccins, prévention"
- **Objectifs au comptoir:**
  - Calendrier prévention complet pour été
  - Anticipation parasites (puces, tiques, vers)
  - Mise à jour vaccins avant vacances
  - Conseils en cas vacances garderies
  - Kit pharmacie pour vacances animal

---\n

## STATISTIQUES FINALES

**Durée totale:** 7 mois (décembre 2025 - juin 2026)
**Nombre de wébinaires:** 60 sessions
**Heures totales:** 60 heures de formation
**Horaire:** 18h00
**Plateforme:** À définir (Zoom, Teams, Typebot, etc.)

**Thèmes couverts:**
- Demande spontanée (6 sessions)
- Ordonnance & Conseil (7 sessions)
- Dermo-cosmétique (7 sessions)
- Micronutrition (6 sessions)
- Techniques Communication (6 sessions)
- Pharmacologie (6 sessions)
- Dispositifs Médicaux (6 sessions)
- Techniques Vente (4 sessions)
- Pharmacie Vétérinaire (4 sessions)

**Saisonnalité intégrée:** Hiver → Printemps → Été
**Journées mondiales:** 2 (Malades 11 fév, Maladies rares 28 fév)
**Congés inclus:** Noël, Pâques, Ascension, Pentecôte

---\n

*Planning complet créé pour PharmaConseil*
*Période: 18 décembre 2025 - 26 juin 2026*
`;

interface ParsedMasterClass {
    date: Date;
    title: string;
    description: string;
}

const parseMasterClassMarkdown = (markdown: string): ParsedMasterClass[] => {
    const masterClasses: ParsedMasterClass[] = [];
    const lines = markdown.split('\n');
    
    let currentYear: number | null = null;
    let currentMonth: number | null = null; // 0-indexed month
    let currentDay: number | null = null;
    let currentDate: Date | null = null;
    let currentTitle: string | null = null;
    let currentDescriptionLines: string[] = [];

    const monthMap: { [key: string]: number } = {
        'JANVIER': 0, 'FÉVRIER': 1, 'MARS': 2, 'AVRIL': 3, 'MAI': 4, 'JUIN': 5,
        'JUILLET': 6, 'AOÛT': 7, 'SEPTEMBRE': 8, 'OCTOBRE': 9, 'NOVEMBRE': 10, 'DÉCEMBRE': 11
    };

    const flushCurrentMasterClass = () => {
        if (currentDate && currentTitle) {
            masterClasses.push({
                date: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()), // Ensure no time component
                title: currentTitle,
                description: currentDescriptionLines.join('\n').trim(),
            });
        }
        currentDate = null;
        currentTitle = null;
        currentDescriptionLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Month heading: ### **DÉCEMBRE 2025**
        const monthMatch = line.match(/^### \*\*(JANVIER|FÉVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOÛT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DÉCEMBRE) (\d{4})\*\*$/i);
        if (monthMatch) {
            flushCurrentMasterClass(); // Flush previous MC before new month
            currentMonth = monthMap[monthMatch[1].toUpperCase()];
            currentYear = parseInt(monthMatch[2], 10);
            continue;
        }

        // Date heading: #### Mercredi 18 décembre 2025
        const dateMatch = line.match(/^#### (Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) (\d{1,2}) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) (\d{4})( \(Reprise\))?$/i);
        if (dateMatch) {
            flushCurrentMasterClass(); // Flush previous MC before new date
            currentDay = parseInt(dateMatch[2], 10);
            const monthName = dateMatch[3].toUpperCase(); 
            const year = parseInt(dateMatch[4], 10);
            
            // Adjust year if month is December and currentYear is for the next year (e.g., Dec 2025 in a block for 2026)
            // This logic is simplified; a more robust date parser would be better.
            // For this specific data set (Dec 2025 - Jun 2026), this is sufficient.
            currentDate = new Date(year, monthMap[monthName], currentDay);
            
            // Handle cases like "Mercredi 30 avril / Mercredi 7 mai 2026"
            // This parser assumes one date per entry, if multiple dates are present in the heading
            // only the last one will be used. The given markdown uses single dates for each MC.
            continue;
        }

        // Title line: - **Titre:** "Rhume, grippe, Sinusite, Angines..."
        const titleMatch = line.match(/^- \*\*Titre:\*\* "(.*?)"$/);
        if (titleMatch) {
            currentTitle = titleMatch[1];
            // Clear description lines for new MC, but keep description from previous line (Theme)
            currentDescriptionLines = [];
            continue;
        }

        // Description lines: capture anything after title until next MC/month/horizontal rule
        if (currentTitle && line !== '---' && !line.startsWith('####') && !line.startsWith('###') && !line.startsWith('**⚠️ CONGÉS')) {
            currentDescriptionLines.push(line);
        }
    }
    flushCurrentMasterClass(); // Flush the very last master class

    return masterClasses;
};

const updateMasterClassDescriptions = async () => {
    let client: MongoClient | undefined;
    try {
        console.log('Connecting to MongoDB...');
        client = await MongoClient.connect(MONGO_URL);
        const db = client.db();
        const webinarsCollection = db.collection<Webinar>('webinars');

        console.log('Parsing Markdown content...');
        const parsedMasterClasses = parseMasterClassMarkdown(masterClassMarkdown);
        console.log(`Found ${parsedMasterClasses.length} MasterClasses in Markdown.`);

        const existingWebinars = await webinarsCollection.find({}).project({ title: 1, date: 1, group: 1 }).toArray();
        console.log(`Found ${existingWebinars.length} existing webinars in DB.`);
        existingWebinars.forEach(w => console.log(`  - ${w.title} (${w.date.toLocaleDateString()}) [Group: ${w.group || 'N/A'}]`));

        console.log('Fetching all existing MasterClass webinars...');
        const existingMasterClassWebinars = await webinarsCollection.find({
            group: WebinarGroup.MASTER_CLASS
        }).toArray();
        console.log(`Found ${existingMasterClassWebinars.length} existing MasterClass webinars in DB.`);

        for (const parsedMc of parsedMasterClasses) {
            // Find a matching webinar in memory
            const matchedWebinar = existingMasterClassWebinars.find(webinar => {
                const dbDate = new Date(webinar.date);
                const parsedDate = parsedMc.date;

                // Compare year, month, and day
                const dateMatches = dbDate.getFullYear() === parsedDate.getFullYear() &&
                                   dbDate.getMonth() === parsedDate.getMonth() &&
                                   dbDate.getDate() === parsedDate.getDate();

                // Compare title (case-insensitive and trim whitespace for robustness)
                const titleMatches = webinar.title.trim().toLowerCase() === parsedMc.title.trim().toLowerCase();
                
                return dateMatches && titleMatches;
            });

            if (matchedWebinar) {
                const result = await webinarsCollection.updateOne(
                    { _id: matchedWebinar._id },
                    { $set: { description: parsedMc.description } }
                );

                if (result.matchedCount > 0) {
                    console.log(`Updated description for: "${parsedMc.title}" (${parsedMc.date.toLocaleDateString()})`);
                } else {
                    console.warn(`Failed to update (matched but not modified) for: "${parsedMc.title}" (${parsedMc.date.toLocaleDateString()})`);
                }
            } else {
                console.warn(`No matching MasterClass found for: "${parsedMc.title}" (${parsedMc.date.toLocaleDateString()}).`);
                // Optional: log details of parsedMc and existing webinars for debugging
                // console.warn('Parsed MC details:', parsedMc);
                // console.warn('Existing MC webinars for comparison:', existingMasterClassWebinars.map(w => ({ title: w.title, date: w.date })));
            }
        }
        console.log('MasterClass descriptions update complete.');

    } catch (error) {
        console.error('Error updating MasterClass descriptions:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed.');
        }
    }
};

const listUniqueWebinarGroups = async () => {
    let client: MongoClient | undefined;
    try {
        console.log('Connecting to MongoDB to list unique groups...');
        client = await MongoClient.connect(MONGO_URL);
        const db = client.db();
        const webinarsCollection = db.collection<Webinar>('webinars');

        const uniqueGroups = await webinarsCollection.distinct('group', {}); // Get all unique group names
        console.log('All unique webinar groups found in database:', uniqueGroups);
    } catch (error) {
        console.error('Error listing unique webinar groups:', error);
    } finally {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed after listing groups.');
        }
    }
};

// Call both functions
(async () => {
    await listUniqueWebinarGroups();
    await updateMasterClassDescriptions();
})();
