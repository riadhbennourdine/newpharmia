# Les Mémofiches dans PharmIA : Création, Gestion et Visualisation

Les mémofiches sont au cœur du système d'apprentissage de PharmIA, offrant un moyen structuré et interactif de présenter des études de cas, des concepts de pharmacologie, des informations sur les dispositifs médicaux, et plus encore. Ce document détaille comment ces mémofiches sont générées, affichées, éditées et gérées au sein de l'application.

## Structure d'une Mémofiche

Une mémofiche dans PharmIA est représentée par l'objet `CaseStudy` (aliasé en `MemoFiche`), une structure de données riche et flexible capable de s'adapter à différents types de contenu pédagogique.

Les champs principaux incluent :

- **`_id`**: Identifiant unique de la mémofiche dans la base de données.
- **`id`**: Identifiant public de la mémofiche.
- **`type`**: Définit la catégorie principale de la mémofiche (ex: `maladie`, `pharmacologie`, `dermocosmetique`, `dispositifs-medicaux`, `ordonnances`, `communication`, `savoir`, `le-medicament`). Ce type influence les sections disponibles.
- **`title`**: Le titre de la mémofiche.
- **`shortDescription`**: Une brève description ou introduction.
- **`theme`**: Le thème pédagogique auquel elle est rattachée.
- **`system`**: Le système ou organe du corps humain concerné (si applicable).
- **`level`**: Le niveau de difficulté (`Facile`, `Moyen`, `Difficile`).
- **`isFree`**: Indique si la mémofiche est accessible gratuitement.
- **`coverImageUrl`**: URL de l'image de couverture.
- **`coverImagePosition`**: Positionnement de l'image de couverture (`top`, `middle`, `bottom`).
- **`youtubeLinks`**: Tableau de liens YouTube associés, chacun avec un `url` et un `title`.
- **`kahootUrl`**: Lien vers un quiz Kahoot associé.
- **`status`**: Statut de la mémofiche (`Draft` pour brouillon, `Published` pour publiée).

Les mémofiches sont composées de **sections dynamiques**, qui peuvent être de différents types :

- **Sections à Contenu Enrichi (`MemoFicheSection`)**: Elles contiennent un `title` et un tableau de `content` où chaque élément de contenu est un objet `{ type: 'text' | 'image' | 'video', value: string }`.
  - Exemples de ces sections : `patientSituation` (Cas comptoir), `pathologyOverview` (Aperçu pathologie), `casComptoir`, `objectifsConseil`, `pathologiesConcernees`, `interetDispositif`, `beneficesSante`, `dispositifsAConseiller`, `reponsesObjections`, `pagesSponsorisees`.
- **Sections sous forme de Listes/Tableaux (`string[]`)**: Elles contiennent des listes de chaînes de caractères.
  - Exemples : `keyQuestions` (Questions clés à poser), `redFlags` (Signaux d'alerte), `mainTreatment` (Traitement Principal), `associatedProducts` (Produits Associés), `lifestyleAdvice` (Conseils Hygiène de vie), `dietaryAdvice` (Conseils alimentaires), `keyPoints` (Points Clés), `references` (Références bibliographiques).
- **Structures Spécifiques pour certains types (`ordonnances`)**:
  - `conseilsTraitement`: Tableau d'objets `{ medicament: string; conseils: string[] }`.
  - `ventesAdditionnelles`: Objet avec des catégories (`complementsAlimentaires`, `accessoires`, `dispositifs`, `cosmetiques`) contenant des listes de `string`.
- **`customSections`**: Les utilisateurs peuvent ajouter leurs propres sections personnalisées, structurées comme les sections à contenu enrichi.
- **`sectionOrder`**: Permet de définir l'ordre d'affichage des sections.

### Outils Pédagogiques Intégrés

Chaque mémofiche peut inclure des outils d'apprentissage interactifs :

- **`flashcards`**: Tableau d'objets `{ question: string; answer: string }`.
- **`quiz`**: Tableau d'objets `{ question: string; options: string[]; correctAnswerIndex: number; explanation: string }`. Les questions peuvent être de type QCM ou VRAI/FAUX.
- **`glossary`**: Tableau d'objets `{ term: string; definition: string }`.

## Génération des Mémofiches dans PharmIA

La création de mémofiches peut se faire de deux manières principales : manuellement via l'éditeur, ou de manière assistée par l'intelligence artificielle (IA) Gemini.

### 1. Création Manuelle et Édition (via l'Éditeur de Mémofiches)

L'éditeur de mémofiches est l'interface principale pour créer et modifier le contenu des mémofiches.

- **Accès et Interface**: Accessible via la page `/edit-memofiche/:id` (pour l'édition) ou `/edit-memofiche/new` (pour la création), l'interface (`components/MemoFicheEditor.tsx`) offre un formulaire complet pour gérer tous les aspects d'une mémofiche.
- **Champs Généraux**: Remplissage des informations de base (titre, description, type, thème, niveau, etc.).
- **Gestion des Sections**:
  - Les sections prédéfinies apparaissent dynamiquement en fonction du `type` de mémofiche choisi.
  - Chaque section peut être modifiée :
    - Les sections à contenu enrichi permettent d'ajouter des blocs de **texte**, des **images** et des **vidéos** (liens YouTube).
    - Les sections de type liste sont éditées via des zones de texte multilignes, où chaque ligne représente un élément.
  - **Sections Personnalisées**: Possibilité d'ajouter des sections entièrement nouvelles avec un titre et un contenu enrichi.
  - **Réorganisation des Sections**: Des boutons haut/bas permettent de modifier l'ordre d'affichage des sections.
  - **Suppression de Sections**: Des boutons permettent de retirer des sections personnalisées ou des sections principales.
- **Gestion des Flashcards**: Ajouter, modifier et supprimer des cartes (question/réponse).
- **Gestion des Quiz**: Créer des questions, définir les options, la bonne réponse et une explication pour chaque question.
- **Téléchargement d'Images**: L'intégration d'images dans les sections se fait via un `ImageUploadModal`. Ce modal permet de téléverser des images qui sont ensuite stockées sur le serveur (`/data/uploads/`) via l'API `/api/upload/image`. Les métadonnées de l'image (nom, thème, URL) sont enregistrées en base de données. L'URL de l'image est ensuite insérée dans le contenu de la mémofiche.
- **Statut**: Les utilisateurs ayant les rôles `ADMIN` ou `FORMATEUR` peuvent définir le statut d'une mémofiche comme `Draft` ou `Published`.
- **Sauvegarde**: Toutes les modifications sont enregistrées via l'API `/api/memofiches` (méthodes `POST` pour la création, `PUT` pour la mise à jour).

### 2. Génération Assistée par IA (Gemini)

PharmIA tire parti de l'API Gemini pour faciliter la création de contenu et d'outils pédagogiques. Le service (`server/geminiService.js`) interagit avec le modèle `gemini-1.5-flash`.

- **Génération de Brouillons de Mémofiches (`/api/gemini/generate-draft`)**:
  - **Processus**: Un utilisateur fournit un `prompt` (description du sujet désiré) et un `memoFicheType`.
  - **Fonctionnement**: L'IA Gemini est sollicitée pour générer un brouillon de `CaseStudy` en format JSON. La structure JSON attendue est dynamiquement définie en fonction du `memoFicheType` fourni, assurant que le contenu généré correspond précisément aux champs de la mémofiche. Cela inclut le `texte d'origine` pour chaque section pertinente.
  - **Exemple**: Pour un `memoFicheType` 'maladie', Gemini pourrait générer un `title`, `patientSituation`, `keyQuestions`, `pathologyOverview`, etc.
- **Génération d'Outils Pédagogiques (`/api/gemini/generate-learning-tools`)**:
  - **Processus**: À partir d'une mémofiche existante, l'IA peut générer automatiquement des flashcards, des termes de glossaire et des questions de quiz.
  - **Flashcards**: 10 flashcards pertinentes (question/réponse) sont générées.
  - **Glossaire**: 10 termes techniques importants de la mémofiche sont extraits et définis.
  - **Quiz**: Des questions de type QCM ou VRAI/FAUX sont créées, avec leurs options, la bonne réponse et des explications.

## Affichage des Mémofiches

Les mémofiches peuvent être consultées de différentes manières dans PharmIA.

- **Liste des Mémofiches**:
  - Accessible via `/api/memofiches`, permettant la pagination, la recherche, le filtrage par thème, système, et statut.
  - Les mémofiches peuvent être "verrouillées" (`isLocked`) si l'utilisateur n'a pas les droits d'accès.
- **Vue Détaillée d'une Mémofiche**:
  - Accessible via `/api/memofiches/:id`.
  - Présente le contenu complet de la mémofiche, y compris les sections, flashcards, quiz et glossaire.
- **Contrôle d'Accès**:
  - Les mémofiches `isFree` sont accessibles à tous.
  - Pour les mémofiches payantes, l'accès dépend du rôle de l'utilisateur et de son statut d'abonnement :
    - **ADMIN** et **FORMATEUR** ont un accès complet à toutes les mémofiches.
    - **APPRENANT** et **PREPARATEUR** nécessitent un abonnement actif ou que la mémofiche ait été spécifiquement assignée à leur groupe par leur pharmacien.
  - **QR Code de Partage**: Les `ADMINs` peuvent générer un QR code pour chaque mémofiche, permettant de partager un lien public direct vers la mémofiche.

## Backend et Persistance

Toutes les mémofiches sont stockées dans une base de données **MongoDB**, au sein de la collection `memofiches`.
Les interactions avec les mémofiches (création, lecture, mise à jour, suppression) sont gérées par des API REST dédiées exposées par le serveur (`server.ts`) :

- `GET /api/memofiches`: Récupère une liste paginée et filtrée de mémofiches.
- `GET /api/memofiches/all`: Récupère toutes les mémofiches.
- `GET /api/memofiches/:id`: Récupère une mémofiche spécifique par son ID.
- `POST /api/memofiches`: Crée une nouvelle mémofiche.
- `PUT /api/memofiches/:id`: Met à jour une mémofiche existante.
- `DELETE /api/memofiches/:id`: Supprime une mémofiche.

Ce système offre une gestion complète et flexible des contenus pédagogiques, intégrant à la fois des outils d'édition manuels et des capacités de génération avancées par IA.

# BASE DE CONNAISSANCE DES MÉMOFICHES PHARMIA

Ce document contient l'ensemble des fiches validées. Utilisez ces informations pour répondre aux questions.

---

# Rhume: MémoFiche Conseil à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** ORL & Respiration | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un patient âgé de 45 ans se présente à la pharmacie en déclarant : « Je suis enrhumé. Que me conseillez-vous?»

![Image](https://pharmaconseilbmb.com/photos/site/orl-respiration/6.jpg)

### Aperçu Pathologie

• - **Définition** :
**-**Le rhume, ou rhinopharyngite, est une infection **virale** bénigne des voies respiratoires supérieures, principalement causée par des rhinovirus mais aussi certains coronavirus, des myxovirus et des adénovirus. Il se caractérise par une inflammation de la muqueuse nasale et du pharynx.
**-**C'est une infection contagieuse; La contagion se fait par voie aérienne (postillons, toux) ou par contact direct avec des objets contaminés.
**-**Le rhume est une infection bénigne qui guérit spontanément en 7 à 10 jours
• - **Symptômes** : Fièvre modérée (< 38-38,5°C), mal de gorge léger, nez qui coule (clair puis épais) et bouché.
• - **Autres symptômes** : Fatigue modérée, maux de tête légers, légère toux sèche.
• - **Facteurs favorisants** :
**-**Baisse d'immunité (fatigue, stress),
**-**Carence en fer
**-**Froid
**-**Tabagisme...
• - **Complications possibles** : plus fréquentes chez les enfants, les personnes âgées, les immunodéprimés:
**-**Sinusite
**-**Otite moyenne aiguë
**-**Bronchite

### Questions Clés

- **-**Est-ce pour vous ? et s'il s'agit d'un enfant, quel âge a-t-il?
- **-**Quels sont vos symptômes précis ? (Nez qui coule, mal de gorge, toux, fièvre, éternuements, maux de tête, nez bouché ?)
- **-**Depuis combien de temps avez-vous ces symptômes ?
- **-**Vos sécrétions nasales sont-elles claires ou purulentes ?
- **-**Avez-vous de la fièvre ou des maux de tête ?
- **-**Avez-vous déjà commencé un traitement et, si oui, lequel ?
- **-**Avez-vous des antécédents médicaux ou prenez-vous des médicaments actuellement ?
- **-**Êtes-vous enceinte ?

### Signaux d'Alerte (Red Flags)

- **-**Température > 38,5°C persistant plus de **48**h.
- **-**Douleur ou écoulement auriculaire : Risque d'otite moyenne aiguë.
- **-**Douleur à la déglutition intense et persistante.
- **-**Difficultés respiratoires ou douleurs thoraciques.
- **-**Terrain à risque : Patient asthmatique, atteint de BPCO, diabétique, ou immunodéprimé.
- **-**Altération de l'état général
- **-**Aggravation des symptômes ou absence d'amélioration après 2 à 3 jours d'automédication.
- **-**Douleur ou écoulement purulent des sinus, amplifiés si tête penchée en avant.

### Traitement Principal

- **Lavage nasal** :
- **-Objectifs**
- **.**Il aide à éliminer les sécrétions nasales, ce qui facilite la respiration⁠.
- **.**Il permet de nettoyer la muqueuse nasale des virus et des autres agents irritants.
- **.**Il hydrate la muqueuse nasale, réduisant ainsi l'inflammation et l'inconfort.
- **.**Il aide à prévenir les complications comme la sinusite ou l'otite.
- **-Posologie**: **2** à **6** fois par jour, une narine après l'autre.
- **-Nez qui coule**: Sérum physiologique ou solutions d'eau de mer isotoniques.
- Ex: Medimar isotonique®.
- **-Nez bouché** : Solutions hypertoniques pour un effet décongestionnant osmotique.
- Ex: Physiomer hypertonique®
- **-Conseil**: Rincer l'embout à l'eau chaude et au savon après chaque utilisation.
- **-Remarque**: Le rhume est d'origine **virale**, les **antibiotiques** sont **inutiles**.

### Produits Associés

- - **-Paracétamol :**
-     * **.Usage :** Fièvre et maux de tête, en première intention.
-     * **.Posologie :** **500** mg - **1000** mg  3 fois/jour.
-     * **.Attention :** Ne pas dépasser 4 g/jour et respecter un intervalle de 4 à 6 h entre les prises.
- - **-Antihistaminiques (Anti-H1) :**
-     * **.Usage :** Rhume, éternuements, larmoiements.
-     * **.Effet secondaire :** Peuvent causer de la **somnolence**.
-     * **.Contre-indications (CI) :** Âge <6 ans, glaucome, troubles urétro-prostatiques, grossesse/allaitement.
- - **-Vasoconstricteurs (Pseudoéphédrine) :**
-     * **.Usage :** Décongestion nasale, traitement du nez bouché
-     * **.Durée max. :** 5  jours.
-     * **.CI absolues :** Âge <15 ans, grossesse/allaitement, AVC, HTA sévère, maladies cardiovasculaires, glaucome, IMAO, maladies rénales.
-     * **.Alerte médicale :** Consulter en cas de maux de tête soudains et sévères, nausées, vomissements, confusion, convulsions, ou troubles visuels.
- **-Autres Soins et Suppléments**
- - **.Crèmes apaisantes :** Soulagent l'irritation des narines (Ex: Homéoplasmine®).
- - **.Inhalations chaudes :** Effet décongestionnant/antiseptique (huiles essentielles/dérivés terpéniques).
- - **.Inhalations sèches/Sprays :** HE (eucalyptus, menthe) sur mouchoir ou vaporisées.
- - **.Zinc :** Antioxydant, booste l'immunité, réduit durée/sévérité des symptômes. **Posologie** :**25** mg/j pendant **7** jours si symptômes ; **15** mg/j en prévention.
- - **.Vitamine C :** Antioxydante, renforce l'immunité, réduit la fatigue. **Posologie** :** 1000** à **2000** mg/j si symptômes.
- - **.Vitamine D :** Régule l'immunité, réduit le risque d'infections respiratoires. **Posologie**: Jusqu'à **4000** UI/j si symptômes ; **800** à **1200** UI/j en prévention.
- - **.Échinacée :** Stimule le système immunitaire. **CI :** Maladies auto-immunes, allergies.
- - **.Sureau noir :** Réduit la durée et l'intensité des symptômes du rhume. **CI :** Diabète. **Interaction :** Diurétiques.

### Conseils Hygiène de Vie

- **-**Se laver les mains régulièrement (eau/savon ou SHA), surtout après s'être mouché/toussé/éternué.
- **-**Utiliser des mouchoirs à usage unique et les jeter immédiatement dans une poubelle fermée.
- **-**Se couvrir la bouche et le nez (de préférence dans le pli du coude) lors d'un éternuement ou d'une toux.
- **-**Aérer régulièrement les pièces. Maintenir une atmosphère fraîche (18-20°C). Éviter de surchauffer et les climatiseurs.
- **-**Éviter le tabac et les atmosphères enfumées, qui aggravent les symptômes et favorisent les récidives.
- **-**Porter un masque jetable si nécessaire pour limiter la contagion.
- **-**Ne pas partager les objets personnels (verre, sprays d'eau de mer).
- **-**Proscrire les changements de température brutaux.

### Conseils Alimentaires

- **-**Boire abondamment (eau, tisanes, bouillons chauds) pour rester hydraté et fluidifier les sécrétions.
- **-**Consommer des aliments riches en vitamine C (agrumes, kiwi, poivrons) pour soutenir l'immunité.

### Traitement Principal (Rec)

- **Lavage nasal** :
- **-Objectifs**
- **.**Il aide à éliminer les sécrétions nasales, ce qui facilite la respiration⁠.
- **.**Il permet de nettoyer la muqueuse nasale des virus et des autres agents irritants.
- **.**Il hydrate la muqueuse nasale, réduisant ainsi l'inflammation et l'inconfort.
- **.**Il aide à prévenir les complications comme la sinusite ou l'otite.
- **-Posologie**: **2** à **6** fois par jour, une narine après l'autre.
- **-Nez qui coule**: Sérum physiologique ou solutions d'eau de mer isotoniques.
- Ex: Medimar isotonique®.
- **-Nez bouché** : Solutions hypertoniques pour un effet décongestionnant osmotique.
- Ex: Physiomer hypertonique®
- **-Conseil**: Rincer l'embout à l'eau chaude et au savon après chaque utilisation.
- **-Remarque**: Le rhume est d'origine **virale**, les **antibiotiques** sont **inutiles**.

### Produits Associés (Rec)

- - **-Paracétamol :**
-     * **.Usage :** Fièvre et maux de tête, en première intention.
-     * **.Posologie :** **500** mg - **1000** mg  3 fois/jour.
-     * **.Attention :** Ne pas dépasser 4 g/jour et respecter un intervalle de 4 à 6 h entre les prises.
- - **-Antihistaminiques (Anti-H1) :**
-     * **.Usage :** Rhume, éternuements, larmoiements.
-     * **.Effet secondaire :** Peuvent causer de la **somnolence**.
-     * **.Contre-indications (CI) :** Âge <6 ans, glaucome, troubles urétro-prostatiques, grossesse/allaitement.
- - **-Vasoconstricteurs (Pseudoéphédrine) :**
-     * **.Usage :** Décongestion nasale, traitement du nez bouché
-     * **.Durée max. :** 5  jours.
-     * **.CI absolues :** Âge <15 ans, grossesse/allaitement, AVC, HTA sévère, maladies cardiovasculaires, glaucome, IMAO, maladies rénales.
-     * **.Alerte médicale :** Consulter en cas de maux de tête soudains et sévères, nausées, vomissements, confusion, convulsions, ou troubles visuels.
- **-Autres Soins et Suppléments**
- - **.Crèmes apaisantes :** Soulagent l'irritation des narines (Ex: Homéoplasmine®).
- - **.Inhalations chaudes :** Effet décongestionnant/antiseptique (huiles essentielles/dérivés terpéniques).
- - **.Inhalations sèches/Sprays :** HE (eucalyptus, menthe) sur mouchoir ou vaporisées.
- - **.Zinc :** Antioxydant, booste l'immunité, réduit durée/sévérité des symptômes. **Posologie** :**25** mg/j pendant **7** jours si symptômes ; **15** mg/j en prévention.
- - **.Vitamine C :** Antioxydante, renforce l'immunité, réduit la fatigue. **Posologie** :** 1000** à **2000** mg/j si symptômes.
- - **.Vitamine D :** Régule l'immunité, réduit le risque d'infections respiratoires. **Posologie**: Jusqu'à **4000** UI/j si symptômes ; **800** à **1200** UI/j en prévention.
- - **.Échinacée :** Stimule le système immunitaire. **CI :** Maladies auto-immunes, allergies.
- - **.Sureau noir :** Réduit la durée et l'intensité des symptômes du rhume. **CI :** Diabète. **Interaction :** Diurétiques.

### Conseils Hygiène de Vie (Rec)

- **-**Se laver les mains régulièrement (eau/savon ou SHA), surtout après s'être mouché/toussé/éternué.
- **-**Utiliser des mouchoirs à usage unique et les jeter immédiatement dans une poubelle fermée.
- **-**Se couvrir la bouche et le nez (de préférence dans le pli du coude) lors d'un éternuement ou d'une toux.
- **-**Aérer régulièrement les pièces. Maintenir une atmosphère fraîche (18-20°C). Éviter de surchauffer et les climatiseurs.
- **-**Éviter le tabac et les atmosphères enfumées, qui aggravent les symptômes et favorisent les récidives.
- **-**Porter un masque jetable si nécessaire pour limiter la contagion.
- **-**Ne pas partager les objets personnels (verre, sprays d'eau de mer).
- **-**Proscrire les changements de température brutaux.

### Conseils Alimentaires (Rec)

- **-**Boire abondamment (eau, tisanes, bouillons chauds) pour rester hydraté et fluidifier les sécrétions.
- **-**Consommer des aliments riches en vitamine C (agrumes, kiwi, poivrons) pour soutenir l'immunité.

### Diagnostic Différentiel & Orientation

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition du rhume ?
  R: Le rhume est une infection virale bénigne des voies respiratoires supérieures, également appelée rhinopharyngite.
- Q: Quels sont les principaux agents causaux du rhume ?
  R: Les rhinovirus, mais aussi les coronavirus, myxovirus et adénovirus.
- Q: Citez deux facteurs favorisant l'apparition du rhume.
  R: La baisse d'immunité (fatigue, stress), la carence en fer, le froid ou le tabagisme.
- Q: Quel est le traitement principal à instaurer dès les premiers signes d'un rhume ?
  R: Le lavage nasal.
- Q: Et les antibiotiques, quel est leur rôle dans le traitement du rhume?
  R: Le rhume est d'origine virale, et les antibiotiques sont inefficaces contre les virus.
- Q: Citez deux bénéfices du lavage nasal.
  R: Il évacue les sécrétions, humidifie la muqueuse, améliore l'efficacité des traitements et prévient les complications.
- Q: Quels types de produits sont recommandés pour le lavage nasal courant ?
  R: Le **sérum physiologique** ou les solutions d'eau de mer **isotoniques**.
- Q: Dans quel cas les solutions nasales hypertoniques sont-elles spécifiquement recommandées ?
  R: Pour un nez particulièrement bouché, grâce à leur effet décongestionnant osmotique.
- Q: En combien de temps un rhume guérit-il spontanément ?
  R: Un rhume guérit spontanément en 7 à 10 jours.
- Q: Citez un signal d'alerte nécessitant une consultation médicale pour un rhume.
  R: Fièvre élevée (> 38,5°C persistant plus de 48h), Symptômes prolongés (> 10 jours), Douleur auriculaire, Difficultés respiratoires, Terrain à risque (asthmatique, diabétique, immunodéprimé).

---

# Angine: Virale ou Bactérienne ? Conseil à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** ORL & Respiration | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une patiente âgée de 28 ans se présente au comptoir et dit : « J’ai besoin d’une boîte d’amoxicilline s'il vous plaît ».

### Aperçu Pathologie

**-L'angine** : est une inflammation aiguë infectieuse des amygdales ou du pharynx.
**-Origine** : Majoritairement virale (**75-90%** chez l'adulte), moins souvent bactérienne, causée par une bactérie: Streptocoque Bêta-hémolytique du Groupe A, **SGA**( **10-25%** chez l'adulte). L'angine bactérienne est plus fréquente chez les enfants âgés de 5 à 15 ans (peut atteindre 40% des cas).
**-Symptômes clés** : **Mal de gorge** (odynophagie) et **fièvre** (38-39°C).,
**-Autres symptômes** : Toux, rhume, fatigue, maux de tête, adénopathies cervicales ( gonflement et douleur des ganglions du cou) possibles.
**-Aspect** : Le plus souvent on parle d'angine rouge dite érythémateuse ou d'angine blanche dite érythémato-pultacée. D'autres aspects sont possibles mais sont beaucoup plus rares.
**-Diagnostic** : Distinction entre angine **virale** et **bactérienne** est cruciale pour le traitement.
**TROD** : Test Rapide d'Orientation Diagnostique **(Non encore disponible en Tunisie)** pour confirmer l'angine bactérienne à SGA.

![Image](https://pharmaconseilbmb.com/photos/site/orl-respiration/infographie%20de%20Angine%20virale%20%20Angine%20bact%C3%A9rienne.png)

### Questions Clés

- **-**Depuis combien de temps avez-vous ces symptômes ? Comment la maladie a-t-elle commencé?
- **-**Avez-vous de la fièvre ? Si oui, quelle température ?
- **-**Avez-vous des douleurs importantes à la gorge lors de la déglutition ? Quelle est l'intensité de votre douleur ?
- **-**Avez-vous d'autres symptômes comme de la toux, de la fatigue ou un écoulement nasal ?
- **-**Avez-vous déjà essayé un traitement ?
- **-**Êtes-vous déjà traité pour d'autres maladies (immunodéficience, diabète, etc.) ?

### Signaux d'Alerte (Red Flags)

- **-**Fièvre supérieure à 38,5°C
- **-**Douleurs importantes à la déglutition.
- **-**Symptômes persistants au-delà de 7 jours.
- **-**Difficultés respiratoires
- **-**Patients à risque: Asthmatique, immunodéprimé, diabétique, etc.

### Traitement Principal

- **Pastilles ou sprays antiseptiques et/ou anesthésiques locaux**:
- **-**Ex: Pastilles: Cantalène® (anesthésique, antiseptique, anti-œdème): Risque de fausse route (éviter avant repas), Contre Indiqué si Age < 6 ans.
- **-**Ex: Spray: Hexaspray® antiseptique
- **Antalgiques/antipyrétiques** : paracétamol
- **Alpha-amylase** : Enzyme à visée anti-décongestionnante, dès 6 mois.
- - Ex: Maxilase®
- **Traitement antibiotique** : Uniquement pour **angine bactérienne** , sur prescription médicale.
- **-\*\***Amoxicilline** : Antibiotique de 1ère intention (**6\*\* jours).
- **-**Alternatives ATB : Céphalosporines (cefpodoxime, céfuroxime) ou macrolides (clarithromycine, azithromycine) si allergies.
- **Remarque**: L'utilisation des **AINS** n'est pas recommandée pour soulager la douleur de la gorge, car ils peuvent masquer l'évolution de l'angine et exposent au risque de complications infectieuses graves.

### Produits Associés

- **Lavage nasal** :
- **-**Sérum physiologique ou eau de mer si rhinite associée.
- **-**Aide à éliminer les sécrétions nasales, ce qui facilite la respiration⁠.
- **-**Hydrate la muqueuse nasale, réduisant ainsi l'inflammation et l'inconfort.
- **-**Aide à prévenir les complications comme la sinusite ou l'otite.
- **Zinc** :
- **-**Antioxydant, il booste l'immunité et aide à réduire la durée et la sévérité symptômes.
- **-**Posologie en présence des symptômes: **25-50mg**/j pendant **7 **jours
- **-**Posologie en absence des symptômes: **15mg**/j
- **Vitamine C** :
- **-**Antioxydante, elle renforce l'immunité et aide à réduire la fatigue.
- **-**Posologie: **1000**-**2000**mg/j durant l'infection.
- **Échinacée** :
- **-**Aide à stimuler le système immunitaire.
- **-**Posologie: **300**mg (poudre) **3**x/j ou **200**mg extrait sec/j.
- **-**Contre-indications: maladies auto-immunes, allergies.
- **Propolis/Gelée royale** :
- - Aide à stimuler les défenses immunitaires
- **Anti-tussifs** :
- **-**Soulage la toux sèche irritative
- **-**Ex: Toumix®

### Conseils Hygiène de Vie

- **-**Lavage fréquent des mains au savon (30 secondes).
- **-**Tousser/éternuer dans un mouchoir ou le pli du coude.
- **-**Éviter de fumer et l'exposition au tabagisme passif.
- **-**Aérer les pièces régulièrement.
- **-**Maintenir la température 18-20°C, humidifier l'air si nécessaire.
- **-**Éviter de forcer sur la voix pendant quelques jours.
- **-**Éviter les contacts directs et porter un masque près des personnes fragiles.
- **-**Ne pas partager les objets: verres, couverts

### Conseils Alimentaires

- **-**Boire abondamment (eau, tisanes, bouillons). Les boissons froides ou la glace peuvent avoir un effet anesthésiant.
- **-**Privilégier les purées, les soupes, les compotes en cas de douleurs à la déglutition.
- **-**Éviter certains aliments: Acides, épicés ou trop salés.

### Traitement Principal (Rec)

- **Pastilles ou sprays antiseptiques et/ou anesthésiques locaux**:
- **-**Ex: Pastilles: Cantalène® (anesthésique, antiseptique, anti-œdème): Risque de fausse route (éviter avant repas), Contre Indiqué si Age < 6 ans.
- **-**Ex: Spray: Hexaspray® antiseptique
- **Antalgiques/antipyrétiques** : paracétamol
- **Alpha-amylase** : Enzyme à visée anti-décongestionnante, dès 6 mois.
- - Ex: Maxilase®
- **Traitement antibiotique** : Uniquement pour **angine bactérienne** , sur prescription médicale.
- **-\*\***Amoxicilline** : Antibiotique de 1ère intention (**6\*\* jours).
- **-**Alternatives ATB : Céphalosporines (cefpodoxime, céfuroxime) ou macrolides (clarithromycine, azithromycine) si allergies.
- **Remarque**: L'utilisation des **AINS** n'est pas recommandée pour soulager la douleur de la gorge, car ils peuvent masquer l'évolution de l'angine et exposent au risque de complications infectieuses graves.

### Produits Associés (Rec)

- **Lavage nasal** :
- **-**Sérum physiologique ou eau de mer si rhinite associée.
- **-**Aide à éliminer les sécrétions nasales, ce qui facilite la respiration⁠.
- **-**Hydrate la muqueuse nasale, réduisant ainsi l'inflammation et l'inconfort.
- **-**Aide à prévenir les complications comme la sinusite ou l'otite.
- **Zinc** :
- **-**Antioxydant, il booste l'immunité et aide à réduire la durée et la sévérité symptômes.
- **-**Posologie en présence des symptômes: **25-50mg**/j pendant **7 **jours
- **-**Posologie en absence des symptômes: **15mg**/j
- **Vitamine C** :
- **-**Antioxydante, elle renforce l'immunité et aide à réduire la fatigue.
- **-**Posologie: **1000**-**2000**mg/j durant l'infection.
- **Échinacée** :
- **-**Aide à stimuler le système immunitaire.
- **-**Posologie: **300**mg (poudre) **3**x/j ou **200**mg extrait sec/j.
- **-**Contre-indications: maladies auto-immunes, allergies.
- **Propolis/Gelée royale** :
- - Aide à stimuler les défenses immunitaires
- **Anti-tussifs** :
- **-**Soulage la toux sèche irritative
- **-**Ex: Toumix®

### Conseils Hygiène de Vie (Rec)

- **-**Lavage fréquent des mains au savon (30 secondes).
- **-**Tousser/éternuer dans un mouchoir ou le pli du coude.
- **-**Éviter de fumer et l'exposition au tabagisme passif.
- **-**Aérer les pièces régulièrement.
- **-**Maintenir la température 18-20°C, humidifier l'air si nécessaire.
- **-**Éviter de forcer sur la voix pendant quelques jours.
- **-**Éviter les contacts directs et porter un masque près des personnes fragiles.
- **-**Ne pas partager les objets: verres, couverts

### Conseils Alimentaires (Rec)

- **-**Boire abondamment (eau, tisanes, bouillons). Les boissons froides ou la glace peuvent avoir un effet anesthésiant.
- **-**Privilégier les purées, les soupes, les compotes en cas de douleurs à la déglutition.
- **-**Éviter certains aliments: Acides, épicés ou trop salés.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition d'une angine?
  R: Une inflammation aiguë infectieuse des amygdales ou du pharynx.
- Q: Quel type d'angine est plus fréquent chez l'adulte?
  R: L'angine est majoritairement virale (75-90%).
- Q: Quels sont les deux symptômes clés d'une angine ?
  R: Mal de gorge, Fièvre (38-39°C).
- Q: Quel est l'objectif du Test Rapide d'Orientation Diagnostique (TROD)?
  R: Confirmer une angine bactérienne à Streptocoque Bêta-hémolytique du Groupe A (SGA).
- Q: Une douleur de gorge associées à une toux et un rhume est une angine d'origine
  R: Virale
- Q: Citez deux signaux d'alerte qui nécessitent une consultation médicale pour un mal de gorge
  R: Fièvre persistante (> 38,5°C > 48h), douleurs intenses à la déglutition, difficultés respiratoires, symptômes persistants (> 7 jours), ou patient à risque (asthme, immunodépression, diabète).
- Q: Pourquoi les AINS sont-ils à éviter en cas de maux de gorge?
  R: En raison des risques de complications graves et de masquage de l'infection.
- Q: Quel antibiotique est de première intention pour une angine bactérienne et quelle est la durée du traitement?
  R: L'Amoxicilline, pour 6 jours.
- Q: Quel est le traitement symptomatique de première intention pour les maux de gorge?
  R: Les produits locaux antiseptiques et/ou anesthésiques, le Paracétamol si douleur ou fièvre
- Q: Quelles mesures hygiéniques conseiller au patient?
  R: Boire abondamment (eau, tisanes, bouillons), Privilégier les purées, les soupes, les compotes en cas de douleurs à la déglutition.

---

# Reflux Gastro-Œsophagien: conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Digestion | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un patient âgé de 28 ans se présente au comptoir en demandant un médicament: "J'ai des remontées acides, Je veux une boîte de GavisconⓇ.”

### Aperçu Pathologie

• - **Définition** :
• Remontée anormale du contenu acide de l'estomac dans l'œsophage.
• - **Symptômes typiques** :
• **Pyrosis**: Sensation de brûlure qui part de l'épigastre et remonte l'œsophage
• **Régurgitations acides**: Remontée de liquide acide dans l'œsophage
• - **Autres symptômes** : Éructations, hoquet, nausées.
• - **Cause principale** :
• Incompétence du sphincter inférieur de l'œsophage entraînant une mauvaise vidange gastrique.
• - **Facteurs favorisants** :
• Repas copieux/gras, chocolat, menthe, café, alcool, boissons gazeuses, aliments épicés ou acides.
• Tabac, stress, obésité, constipation.
• Grossesse.
• Prise de certains **médicaments**: Théophylline, bêtabloquants, anticholinergiques, inhibiteurs calciques, progestérone et dérivés nitrés.

### Questions Clés

- -Que ressentez-vous exactement (brûlures, remontées acides, douleur) ?
- -Quand et à quelle fréquence ressentez-vous cette gêne ? Est-ce après les repas ?
- -Depuis quand ressentez-vous ces symptômes ?
- -D'autres symptômes associés (toux, difficulté à avaler, perte de poids, fatigue, enrouement, douleurs thoraciques) ?
- -Avez-vous déjà essayé un traitement auparavant ? Si oui, lequel ?
- -Prenez-vous des médicaments ? Lesquels ?
- -Avez-vous perdu du poids récemment ?
- -Êtes-vous enceinte ?
- -Fumez-vous ?

### Signaux d'Alerte (Red Flags)

- -Douleurs **fortes**, **vomissements** avec **sang**, **sang** dans les **selles**, **anémie**.
- -Perte de poids **inexpliquée**, **difficulté** à **avaler**, fatigue **importante**.
- -Symptômes persistants après **7** jours de traitement ou **récidives fréquentes**.
- -Toux chronique, difficultés respiratoires, douleurs thoraciques, douleur irradiante vers le bras gauche.
- -Patient de plus de **50** ans avec des symptômes récurrents.

### Traitement Principal

- **Antiacides** :
- -Sels d’aluminium, de magnésium ou de calcium
- -Neutralisent l'acidité.
- -Effet rapide: 30-60 min mais de courte durée
- -Conseiller de décaler les prises d’au moins **2h** avec un autre médicament.
- -Ex: CalmacideⓇ
- **Alginates** :
- -Forment un gel visqueux protecteur de la muqueuse œsophagienne.
- -Posologie: 1 à 2 sachets 3 fois/jour après repas et avant coucher, à distance **2h** des autres médicaments.
- -Ex: ApyrosisⓇ
- **Anti-Histaminiques H2: Anti-H2** : Famotidine (sous prescription médicale)
- -Réduisent la sécrétion de l'acide gastrique.
- -Efficacité modérée et de courte durée.
- -Posologie: au moment de la crise ou avant le repas sans dépasser 2 cp/j
- -Ex: Famodine 40Ⓡ
- **Inhibiteurs de Pompes à Protons: IPP ** (sous prescription médicale)
- -Bloquent la production de l'acide gastrique.
- -Posologie: 1 prise par jour, de préférence à jeun le matin.
- -Peuvent être associés aux antiacides/alginates en début de traitement.
- -Utilisation prolongée peut entraîner une carence en vitamine **B12**.
- -Ex: Esoméprazole : MesopralⓇ

### Produits Associés

- **Phytothérapie** : Extraits de plantes protectrices, anti-acides, cicatrisantes ou anti-inflammatoires en complément.
- **Gel d'aloe vera** :
- -2 cuillères à café à 2 cuillères à soupe au coucher.
- **Tisane de mélisse** :
- -2 tasses par jour en dehors des repas.
- **Décoction de réglisse** :
- -1 à 2 tasses par jour en dehors des repas.
- **Huile essentielle de camomille** :
- -2 gouttes 3 fois par jour sur support pendant 5 jours.

### Conseils Hygiène de Vie

- - Eviter de s'allonger directement après les repas.
- - Éviter de se pencher en avant, surélever la tête du lit (10-15cm).
- - Éviter le port de vêtements ou d'accessoires comprimant l'abdomen (ceintures, corsets).
- - Éviter les activités nécessitant une antéflexion prolongée, pratiquer une activité physique régulière.
- - Éviter de fumer.
- - Gérer le stress, maintenir un poids santé.

### Conseils Alimentaires

- -**Éviter** : les repas copieux (surtout le soir), les aliments gras/en sauce ou épicés, le chocolat, la menthe, les aliments acides (tomates).
- -Éviter le café, les boissons gazeuses et alcoolisées, le vinaigre, les jus de fruits acides.
- -Privilégier des repas légers et fréquents.
- -Manger lentement, bien mâcher, à heures fixes, dans le calme.
- -Boire beaucoup d’eau (entre les repas), préférer des eaux plates ou bicarbonatées.

### Traitement Principal (Rec)

- **Antiacides** :
- -Sels d’aluminium, de magnésium ou de calcium
- -Ils neutralisent l'acidité.
- -Leur effet est rapide (30-60 min) mais de courte durée: Nécessitent donc plusieurs prises par jour.
- -Conseiller de décaler les prises d’au moins **2h** avec un autre médicament.
- -Ex: CalmacideⓇ
- **Alginates** :
- -Ils forment un gel visqueux protecteur de la muqueuse œsophagienne.
- -Conseiller de bien malaxer le sachet.
- -Posologie: 1 à 2 sachets trois fois/jour après repas et avant coucher, à distance (**2h**) des autres médicaments.
- -Ex: ApyrosisⓇ
- **Anti-Histaminiques H2: Anti-H2** : Famotidine
- -Produits délivrés sous prescription médicale.
- -Ils réduisent la sécrétion de l'acide gastrique.
- -Leur efficacité est modérée et de courte durée.
- -Posologie: À prendre en fonction des symptômes, au moment de la crise ou avant le repas sans dépasser 2 comprimés par jour.
- -Ex: Famodine 40Ⓡ
- **Inhibiteurs de Pompes à Protons: IPP ** :
- -Produits délivrés sous prescription médicale.
- -Ils bloquent la production de l'acide gastrique.
- -Posologie: 1 prise par jour, de préférence à jeun le matin.
- -Ils peuvent être associés aux antiacides/alginates en début de traitement.
- -Ne pas associer deux IPP entre eux ou un IPP avec un anti-H2.
- -Une utilisation prolongée peut entraîner une carence en vitamine **B12**.
- -Ex: Esoméprazole : MesopralⓇ , Oméprazole: GastralⓇ.

### Produits Associés (Rec)

- **Phytothérapie** : Extraits de plantes protectrices, anti-acides, cicatrisantes ou anti-inflammatoires en complément.
- **Gel d'aloe vera** :
- -2 cuillères à café à 2 cuillères à soupe au coucher.
- **Tisane de mélisse** :
- -2 tasses par jour en dehors des repas.
- **Décoction de réglisse** :
- -1 à 2 tasses par jour en dehors des repas.
- **Huile essentielle de camomille** :
- -2 gouttes 3 fois par jour sur support pendant 5 jours.

### Conseils Hygiène de Vie (Rec)

- - Eviter de s'allonger directement après les repas.
- - Éviter de se pencher en avant, surélever la tête du lit (10-15cm).
- - Éviter le port de vêtements ou d'accessoires comprimant l'abdomen (ceintures, corsets).
- - Éviter les activités nécessitant une antéflexion prolongée, pratiquer une activité physique régulière.
- - Éviter de fumer.
- - Gérer le stress, maintenir un poids santé.

### Conseils Alimentaires (Rec)

- -**Éviter** : les repas copieux (surtout le soir), les aliments gras/en sauce ou épicés, le chocolat, la menthe, les aliments acides (tomates).
- -Éviter le café, les boissons gazeuses et alcoolisées, le vinaigre, les jus de fruits acides.
- -Privilégier des repas légers et fréquents.
- -Manger lentement, bien mâcher, à heures fixes, dans le calme.
- -Boire beaucoup d’eau (entre les repas), préférer des eaux plates ou bicarbonatées.

### Cas comptoir complémentaire (Custom)

Un patient âgé de 35 ans se présente chaque mois à la pharmacie pour de l'oméprazole 20 mg.
Réponse suggérée : "Je comprends que vous cherchiez un soulagement rapide avec l'oméprazole, mais il est important de ne pas l'utiliser en continu sans avis médical. Une utilisation prolongée peut masquer d'autres problèmes de santé et entraîner des effets secondaires tels la diminution de l’absorption de la vitamine B12.
Je peux vous proposer un anti-acide pour soulager votre douleur en ce moment mais je vous conseille vivement de consulter votre médecin pour discuter vos symptômes et trouver une solution adaptée à long terme."

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition du Reflux Gastro-Œsophagien (RGO)?
  R: C'est la remontée anormale du contenu acide de l'estomac dans l'œsophage.
- Q: Citez deux symptômes typiques du RGO.
  R: Les brûlures d'estomac (pyrosis) et les régurgitations acides.
- Q: Quelles sont les facteurs favorisant la survenue des épisodes de RGO?
  R: Mauvaises habitudes alimentaires, Grossesse, Obésité, Tabac, Prise de certains médicaments.
- Q: Quels sont les signaux d'alerte indiquant une urgence dans le cadre du RGO?
  R: Douleurs fortes, vomissements avec sang, sang dans les selles, anémie.
  Récidives fréquentes. Symptômes persistants après 7 jours de traitement.
- Q: Quels sont les conseils de prise pour les alginates?
  R: À prendre après les repas et avant le coucher, à distance (2h) des autres médicaments. Il faut bien malaxer le sachet.
- Q: Comment doivent être pris les IPP pour une efficacité optimale?
  R: Une fois par jour, de préférence à jeun le matin.
- Q: Un patient de 35 ans demande de l'oméprazole chaque mois. Quel conseil clé doit-on lui donner?
  R: Ne pas l'utiliser en continu sans avis médical, car cela peut masquer d'autres problèmes et entraîner des effets secondaires comme la diminution de l’absorption de la vitamine B12. Il est conseillé de consulter un médecin.
- Q: Quel est le mécanisme d'action des anti-H2?
  R: Les anti-H2 réduisent le sécrétion de l'acide gastrique.
- Q: Quelle est la posologie des anti-H2?
  R: A prendre au moment de la crise ou avant le repas sans dépasser 2 comprimés par jour.
- Q: Quels conseils d'hygiène de vie donner au patient souffrant de RGO ?
  R: Eviter de s'allonger directement après les repas, éviter de se pencher en avant, surélever la tête du lit.

---

# Diarrhée virale aiguë: conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Digestion | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un adulte de 45 ans se présente à la pharmacie en demandant conseil: Je souffre d’une diarrhée depuis quelques jours, je veux une boite de Normix 200?

### Aperçu Pathologie

• - **Définition**
• - Diminution consistance selles et/ou > 3 selles liquides/24h
• - La diarrhée aigue ne dépasse pas 14 jours
• - **Causes virales** Rotavirus, norovirus (fréquentes).
• - **Causes bactériennes** E. coli, Salmonella, Campylobacter (aliments/eau contaminés).
• - **Causes parasitaires** Giardia lamblia.
• - **Intolérances** Lactose (déficience en lactase).
• - **Troubles digestifs** Syndrome de l'Intestin Irritable (SII), Maladies Inflammatoires de l'Intestin (MII).
• - **Médicaments** Antibiotiques, AINS, colchicine, antiacides contenant du magnésium.

### Questions Clés

- -Depuis quand avez-vous la diarrhée ?
- -Quelle est la fréquence et la consistance des selles ?
- -Avez-vous d'autres symptômes tels que : douleurs abdominales, vomissements, fièvre ?
- -Y a-t-il du sang ou des glaires dans les selles ?
- -Avez-vous récemment pris des antibiotiques ou un nouveau médicament ?
- -Avez-vous déjà mangé des aliments suspects ou voyagé récemment ?
- -D'autres personnes de votre entourage sont-elles atteintes des mêmes symptômes ?
- -Êtes-vous suivi pour une maladie particulière ?

### Signaux d'Alerte (Red Flags)

- -Douleurs abdominales importantes ou vomissements répétés (empêchant l'hydratation).
- -Persistance de la diarrhée > 2 jours.
- -Fièvre élevée > 38,5°C.
- -Présence de sang ou de glaires dans les selles
- -Personnes à risque: personnes âgées, nourrissons ou immunodéprimées
- -Diarrhée au retour d'un voyage en zone tropicale.
- -Alternance diarrhée et constipation.
- -Intoxication: Suspicion alimentaire.
- -Diarrhée d'origine médicamenteuse.

### Traitement Principal

- La prise en charge repose sur une réhydratation et un traitement symptomatique.
- **SRO** Solution de Réhydratation Orale
- -Prévenir la déshydratation.
- -Elle permet de compenser les pertes en eau et électrolytes.
- -Les SRO sont à prendre avant tout autre liquide, le plus précocement possible.
- -Ex: Hydratec®, (sachets) à diluer dans 200 ml d'eau

### Produits Associés

- ** Ralentisseur du transit** : Lopéramide
- -Posologie: 2 gélules en début, puis 1 après chaque selle non moulée (max 6/jour, max 2 jours).
- -CI: Diarrhée sanglante, glaireuse, fébrile. (risque de ralentissement de l'élimination du germe)
- -Conseil: Usage ponctuel
- -Ex: Diaretyl®, Diarestop flash®.
- **Adsorbant intestinal** :Diosmectite
- -Posologie: 3 sachets/jour (jusqu'à 6 en début de traitement).
- -Conseil: À prendre à distance des autres médicaments.
- -Ex: Smecta®
- **Racécadotril** (sur ordonnance) Antisécrétoire intestinal.
- -Diminue sécrétion eau/électrolytes.
- -Posologie: 1 gélule aux premiers signes, puis 1 avant chaque repas.
- -Précautions: Non recommandé femmes enceintes et personnes sous IEC (risque d'angio-œdème).
- -Ex: Tiorfan®, Tiortec®
- **Probiotiques** (Saccharomyces boulardii, Lactobacillus rhamnosus GG) :
- -Aident à restaurer la flore intestinale.
- -À éviter: Personnes immunodéprimées.

### Conseils Hygiène de Vie

- -Se laver fréquemment les mains surtout avant les repas et après être allé aux toilettes.
- -Utiliser des solutions hydroalcooliques si nécessaire.
- -Nettoyer et désinfecter les toilettes après chaque utilisation.
- -Éviter les contacts rapprochés avec l'entourage, surtout les personnes fragiles.
- -Boire de l'eau en bouteille, éviter les aliments crus, les glaçons et les glaces artisanales.

### Conseils Alimentaires

- -Boire au moins 1,5 litre de liquide par jour (eau, bouillon, thé).
- -Privilégier: Riz, pommes de terre, volaille, poisson, banane, compote de pommes ou coing cuite.
- -Éviter les boissons caféinées, alcool, plats gras, épicés ou trop sucrés.
- -En cas de diarrhée infectieuse, éviter les produits riches en lactose.

### Traitement Principal (Rec)

- La prise en charge repose sur une réhydratation et un traitement symptomatique.
- **SRO** Solution de Réhydratation Orale
- -Prévenir la déshydratation.
- -Elle permet de compenser les pertes en eau et électrolytes.
- -Les SRO sont à prendre avant tout autre liquide, le plus précocement possible.
- -Ex: Hydratec®, (sachets) à diluer dans 200 ml d'eau

### Produits Associés (Rec)

- ** Ralentisseur du transit** : Lopéramide
- -Posologie: 2 gélules en début, puis 1 après chaque selle non moulée (max 6/jour, max 2 jours).
- -CI: Diarrhée sanglante, glaireuse, fébrile. (risque de ralentissement de l'élimination du germe)
- -Conseil: Usage ponctuel
- -Ex: Diaretyl®, Diarestop flash®.
- **Adsorbant intestinal** :Diosmectite
- -Posologie: 3 sachets/jour (jusqu'à 6 en début de traitement).
- -Conseil: À prendre à distance des autres médicaments.
- -Ex: Smecta®
- **Racécadotril** (sur ordonnance) Antisécrétoire intestinal.
- -Diminue sécrétion eau/électrolytes.
- -Posologie: 1 gélule aux premiers signes, puis 1 avant chaque repas.
- -Précautions: Non recommandé femmes enceintes et personnes sous IEC (risque d'angio-œdème).
- -Ex: Tiorfan®, Tiortec®
- **Probiotiques** (Saccharomyces boulardii, Lactobacillus rhamnosus GG) :
- -Aident à restaurer la flore intestinale.
- -À éviter: Personnes immunodéprimées.

### Conseils Hygiène de Vie (Rec)

- -Se laver fréquemment les mains surtout avant les repas et après être allé aux toilettes.
- -Utiliser des solutions hydroalcooliques si nécessaire.
- -Nettoyer et désinfecter les toilettes après chaque utilisation.
- -Éviter les contacts rapprochés avec l'entourage, surtout les personnes fragiles.
- -Boire de l'eau en bouteille, éviter les aliments crus, les glaçons et les glaces artisanales.

### Conseils Alimentaires (Rec)

- -Boire au moins 1,5 litre de liquide par jour (eau, bouillon, thé).
- -Privilégier: Riz, pommes de terre, volaille, poisson, banane, compote de pommes ou coing cuite.
- -Éviter les boissons caféinées, alcool, plats gras, épicés ou trop sucrés.
- -En cas de diarrhée infectieuse, éviter les produits riches en lactose.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition de la diarrhée aiguë selon la mémofiche ?
  R: Diminution de la consistance des selles et/ou plus de 3 selles liquides par 24h et/ou plus de 300g par jour.
- Q: Citez deux causes virales fréquentes de diarrhée aiguë mentionnées dans le document.
  R: Rotavirus et Norovirus.
- Q: Quels types de médicaments peuvent provoquer une diarrhée comme effet secondaire ?
  R: Antibiotiques, AINS, colchicine, et antiacides contenant du magnésium.
- Q: Quel est l'objectif principal de l'administration d'une Solution de Réhydratation Orale (SRO) ?
  R: Prévenir la déshydratation.
- Q: Quelle est la posologie initiale du Lopéramide en cas de diarrhée aiguë, et sa posologie maximale quotidienne en automédication ?
  R: 2 gélules en début de traitement, puis 1 gélule après chaque selle non moulée (max 6/jour).
- Q: Quelles sont les contre-indications majeures à l'utilisation du Lopéramide ?
  R: Diarrhée sanglante, glaireuse ou fébrile.
- Q: Quelle est la précaution importante à prendre lors de l'administration de Diosmectite ?
  R: À prendre à distance des autres médicaments.
- Q: Quel est le mécanisme d'action du Racécadotril ?
  R: C'est un antisécrétoire intestinal qui diminue la sécrétion d'eau et d'électrolytes.
- Q: Pour combien de jours le Lopéramide est-il conseillé au maximum en automédication pour la diarrhée aiguë ?
  R: Maximum 2 jours.
- Q: Citez deux signaux d'alerte nécessitant un avis médical urgent pour une diarrhée.
  R: Douleurs abdominales importantes, vomissements répétés, diarrhée persistant > 2 jours, fièvre > 38,5°C, présence de sang ou glaires dans les selles, signes de déshydratation, diarrhée après voyage en zone tropicale, etc.

---

# Constipation occasionnelle: conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Digestion | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une femme âgée de 38 ans s’est présentée à la pharmacie: “Je suis constipée depuis 3 jours. Que me conseillez-vous?”

### Aperçu Pathologie

• **Définition**
• - Émission de **moins** de **3** selles/semaine ou **difficulté d'évacuation**.,
• - Elle peut être **occasionnelle** ou **chronique** (plus de **2** semaines)
• **Causes possibles**:
• - Manque de fibres/eau, sédentarité, grossesse, âge, stress, alitement
• - **Médicaments inducteurs**: Opiacés, anticholinergiques, sels de fer/calcium, antitussifs codéinés.,-
• - **Rétention volontaire** des selles, **abus** de laxatifs.

### Questions Clés

- - Est-ce une constipation récente ou chronique ?
- - Avez-vous des symptômes associés (douleurs abdominales, ballonnements, sang dans les selles, amaigrissement) ?
- - Y a-t-il une alternance entre la diarrhée et la constipation ?
- - Prenez-vous des médicaments actuellement ?
- - Y a-t-il eu un changement dans vos habitudes de vie récemment ?
- - Êtes-vous enceinte ?

### Signaux d'Alerte (Red Flags)

- -Constipation > **15** jours ou **aggravation** récente.
- -Douleurs abdominales **importantes**, vomissements, **sang** dans les selles.
- -**Alternance** entre constipation et diarrhée.
- -Constipation liée à la **prise d'un médicament** (nécessite avis médical).
- -**Persistance** ou **récidive** après la prise de médicaments.
- -Patient âgé de plus de **40** ans avec douleurs coliques, sang, diarrhées, irritation anale, altération état général, amaigrissement, antécédents familiaux de cancer colique.

### Traitement Principal

- **Laxatifs osmotiques**:
- -Augmentent l'hydratation des selles en 24 à 48h
- - **Les sucrés**: polyols (lactulose, sorbitol)
- -EI: douleurs abdominales et des flatulences
- -Ex: Duphalac®
- - **Les osmotiques **: les macrogols
- -Efficacité supérieure aux polyols
- -Ex: Ilax®
- **Laxatifs lubrifiants**:
- -Ramollissent et facilitent l'exonération en 24h
- -Éviter chez alités (risque d’inhalation bronchique et de pneumonie).
- -Utilisation prolongée: réduction de l’absorption des Vit liposolubles A, D, E et K.
- -Ex: Laxafine®
- **Laxatifs de lest** (Psyllium)
- -Augmentent le volume et hydratent les selles: 2-3j
- -Nécessitent un apport hydrique suffisant.
- -Ex: Biofibres®
- - **Laxatifs stimulants** (Dérivés anthracéniques).
- -Stimulent l'intestin: en 5-10h
- -Utilisation: 3-5 jours max
- -CI: colopathies inflammatoires, troubles du rythme.
- -Ex: Purgatif®
- - **Laxatifs rectaux** (Lavements, suppositoires)
- -Agissent localement en quelques min à 1h
- -CI: poussée hémorroïdaire, fissure anale.
- -Utilisation prolongée: peut entraver le réflexe normal d’exonération
- -Ex: Laxagel®
- -**Attention!!!**: Ne pas associer les salins et les stimulants du fait de leur effet hypokaliémiant aux antiarythmiques, neuroleptiques, diurétiques hypokaliémiants, corticoïdes, digitaliques, cisapride…

### Produits Associés

- - **Antispasmodiques**:
- -Aident à réduire les douleurs abdominales.
- -Ex: Spasmocalm®, Nospasm®
- - **Tisanes laxatives**: Séné, Rhubarbe
- -Contiennent des dérivés anthracéniques, agissent comme des laxatifs stimulants à utiliser avec précaution.
- -Ex: Laxative®
- - **Tisanes digestives**: Fenouil, Anis
- -Aident à éliminer les ballonnements et améliorer le transit.
- -Ex: Phytokad digestion®
- - **Probiotiques** :
- -Modulent le microbiote pour un transit amélioré à long terme.
- -Ex: Lactibiane référence®

### Conseils Hygiène de Vie

- -Pratiquer **régulièrement** une **activité physique**
- -Aller à heures régulières, **ne pas se retenir**.
- -Prendre son temps, adopter une position **favorable** aux toilettes.
- -Gérer par des techniques de **relaxation**.
- -Éviter l'usage **prolongé** de laxatif

### Conseils Alimentaires

- -**Augmenter** l'apport en **fibres** (fruits, légumes, céréales complètes).
- -Boire **au moins 1,5L** d'eau par jour.
- -Consommer des aliments riches en **probiotiques** (yaourts).
- -**Éviter** certains aliments: Riz blanc, viandes rouges, pomme de terre.

### Traitement Principal (Rec)

- **Laxatifs osmotiques**:
- -Ils augmentent l'hydratation des selles en attirant l'eau dans la lumière intestinale.
- -Leur action débute 24 à 48 heures après la première prise.
- - **Les osmotiques sucrés**: polyols (lactulose, sorbitol)
- -Ils peuvent provoquer des douleurs abdominales et des flatulences du fait de leur fermentation par la flore intestinale.
- -Ex: Duphalac®
- - **Les osmotiques salins**: les macrogols (PEG):
- -Ils ont une efficacité supérieure aux polyols et provoquent moins de douleurs abdominales car ils n'induisent pas de fermentation colique.
- -CI: occlusion intestinale.
- -Ex: Ilax®
- **Laxatifs lubrifiants**: Huile de paraffine
- -Ils ramollissent et facilitent l'exonération (action 24h).
- -Éviter chez alités/reflux (risque d’inhalation bronchique et de pneumonie).
- -Ne pas se coucher dans les 2h après prise
- -Au long cours, ils exposent à une réduction de l’absorption des vitamines liposolubles A, D, E et K.
- -Ex: Laxafine®
- **Laxatifs de lest** (Psyllium, Ispaghul)
- -Augmentent le volume et hydratent les selles (action 2-3 jours).
- -Nécessitent un apport hydrique suffisant.
- -CI: occlusion, fécalome.
- -Ex: Biofibres®
- - **Laxatifs stimulants** (Dérivés anthracéniques).
- -Stimulent l'intestin (action 5-10h).
- -Utilisation ponctuel (3-5 jours max)\*\*.
- -CI: colopathies inflammatoires, occlusion, troubles du rythme.
- -Ex: Purgatif®
- - **Laxatifs rectaux** (Lavements, suppositoires)
- -Agissent localement par effet osmotique ou en stimulant le réflexe de défécation,
- -Délai d'action de quelques minutes à 1 heure
- -CI: poussée hémorroïdaire, fissure anale.
- -En cas d’utilisation prolongée, ils sont irritants et peuvent entraver le réflexe normal d’exonération, notamment chez l’enfant.
- -Ex: Laxagel®
- -**Attention!!!**: Ne pas associer les salins et les stimulants du fait de leur effet hypokaliémiant aux antiarythmiques, neuroleptiques, diurétiques hypokaliémiants, corticoïdes, digitaliques, cisapride…

### Produits Associés (Rec)

- - **Antispasmodiques**:
- -Aident à réduire les douleurs abdominales.
- -Ex: Spasmocalm®, Nospasm®
- - **Tisanes laxatives**: Séné, Rhubarbe
- -Contiennent des dérivés anthracéniques, agissent comme des laxatifs stimulants à utiliser avec précaution.
- -Ex: Laxative®
- - **Tisanes digestives**: Fenouil, Anis
- -Aident à éliminer les ballonnements et améliorer le transit.
- -Ex: Phytokad digestion®
- - **Probiotiques** :
- -Modulent le microbiote pour un transit amélioré à long terme.
- -Ex: Lactibiane référence®

### Conseils Hygiène de Vie (Rec)

- -Pratiquer régulièrement une activité physique
- -Aller à heures régulières, ne pas se retenir.
- -Prendre son temps, adopter une position favorable aux toilettes.
- -Gérer par des techniques de relaxation.
- -Éviter l'usage prolongé de laxatif

### Conseils Alimentaires (Rec)

- -Augmenter l'apport en fibres (fruits, légumes, céréales complètes).
- -Boire au moins 1,5L d'eau par jour.
- -Consommer des aliments riches en probiotiques (yaourts).
- -Éviter certains aliments: Riz blanc, viandes rouges, pomme de terre.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition de la constipation selon la mémofiche ?
  R: Émission de moins de 3 selles par semaine ou difficulté d'évacuation.
- Q: À partir de quelle durée une constipation est-elle considérée comme chronique ?
  R: Plus de 2 semaines.
- Q: Citez au moins trois médicaments connus pour induire la constipation.
  R: Opiacés, anticholinergiques, sels de fer/calcium, pansements alumineux, antitussifs codéinés.
- Q: Quels sont les trois principaux facteurs de risque comportementaux de la constipation ?
  R: Manque de fibres/eau, sédentarité, rétention volontaire des selles, abus de laxatifs.
- Q: Quel est le mécanisme d'action des laxatifs osmotiques et quel est leur délai d'action ?
  R: Ils augmentent la quantité d'eau dans les selles. Leur action est de 24 à 48 heures.
- Q: Pourquoi les laxatifs lubrifiants (ex: huile de paraffine) doivent-ils être utilisés avec précaution chez les patients alités ou souffrant de reflux ?
  R: En raison du risque d'inhalation.
- Q: Quelle est la durée maximale d'utilisation recommandée pour les laxatifs stimulants ?
  R: Usage ponctuel de 3 à 5 jours maximum.
- Q: Citez une contre-indication majeure à l'utilisation des laxatifs de lest.
  R: Occlusion intestinale ou fécalome.
- Q: Donnez deux exemples de situations considérées comme des signaux d'alerte nécessitant un avis médical pour la constipation.
  R: Constipation > 15 jours, douleurs abdominales importantes, vomissements, sang dans les selles, alternance constipation/diarrhée, échec du traitement.
- Q: Chez un patient de plus de 40 ans, quels sont les signes associés à la constipation qui constituent un signal d'alerte grave ?
  R: Douleurs coliques, sang, diarrhées, irritation anale, altération de l'état général, amaigrissement, antécédents familiaux de cancer colique.

---

# Hémorroïdes: Mémofiche conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Digestion | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une patiente de 28 ans se présente à la pharmacie: " Je veux une boîte de Neo Healar® crème.

### Aperçu Pathologie

• - **Définition**
Réseau de vaisseaux artériels et veineux normalement présents dans le canal anal
• - **Maladie**
Survient lorsque ces vaisseaux se dilatent ou s'enflamment
• - **Types**
Hémorroïdes internes (canal anal) et externes (autour de l'anus)
• - **Symptômes**
Saignements de sang rouge vif après la défécation, démangeaisons, gonflement, sensation de pesanteur.,
• - **Douleur**
Moins douloureuse qu'une fissure anale (déchirure), sauf en cas de thrombose (douleur intense)

### Questions Clés

- -Depuis quand ressentez-vous ces symptômes ?
- -Avez-vous des saignements lors des selles ? Si oui, quelle couleur, quelle abondance ?
- -Ressentez-vous des douleurs ou des démangeaisons ?
- -Avez-vous remarqué une grosseur à l'anus ?
- -Êtes-vous constipée ou avez-vous des problèmes de transit ?
- -Êtes-vous enceinte ou avez-vous récemment accouché ?

### Signaux d'Alerte (Red Flags)

- -Symptômes persistants après 48 heures de traitement.
- -Saignements abondants ou sang noir dans les selles (sang digéré).
- -Douleur Intense ou persistante toute la journée (risque de thrombose).
- -Fièvre associée aux symptômes.
- -Patient de plus de 50 ans (nécessite exploration médicale).

### Traitement Principal

- **Topiques locaux** Crèmes, pommades, suppositoires:
- -Propriétés anti-inflammatoires, décongestionnantes, lubrifiantes et/ou veinotoniques.
- -Utilisation courte : 1 à 2 semaines maximum
- -Enrober le suppositoire d'une crème pour faciliter son introduction.
- -Ex: Neo-Healar®, Hémorroix®

### Produits Associés

- - **Veinotoniques oraux** :
- -Soulager les symptômes aigus de la maladie hémorroïdaire, incluant la douleur et les saignements (rectorragies)
- -Les veinotoniques agissent par leur effet vasculotrope et anti-inflammatoire, limitant la dilatation veineuse et diminuant la perméabilité capillaire
- -Posologie Daflon 500(crise) : 2 comprimés 3 fois par jour pendant 5 jours.
- - **Antalgiques** :
- -Paracétamol: 1g trois fois par jour, max 4g/j
- - **AINS** :
- -Ibuprofène: 200 mg, 600 à 1200 mg par jour
- - **Laxatifs doux (constipation)** :
- -Laxatifs osmotiques : Macrogol ou laxatifs de lest (ispaghul, psyllium).
- - **Compléments Veinotoniques (prévention)** : Vigne rouge, Marronnier d’Inde, Ginkgo biloba.
- -Réduit le risque de récurrence des symptômes à six mois.
- -Envisager une cure de 10 jours par mois pour réduire la fréquence et l'intensité des crises.
- -Ex: Keravel Forvein®

### Conseils Hygiène de Vie

- -Toilette anale douce après chaque selle avec un savon surgras ou un gel intime doux (ex: Saforelle®). Séchage soigneux.
- -Éviter la sédentarité, la station assise ou debout prolongée. Pratiquer une activité physique régulière (marche, natation).
- -Ne pas forcer lors des selles.
- -Porter des vêtements en coton amples.

### Conseils Alimentaires

- -Privilégier une alimentation riche en fibres (légumes verts, fruits, céréales complètes) pour régulariser le transit.
- -Boire suffisamment d'eau (1,5 à 2 litres par jour).
- -Éviter les aliments épicés, l'alcool, le café et les excitants.

### Traitement Principal (Rec)

- **Topiques locaux** Crèmes, pommades, suppositoires:
- -Propriétés anti-inflammatoires, décongestionnantes, lubrifiantes et/ou veinotoniques.
- -Utilisation courte : 1 à 2 semaines maximum
- -Enrober le suppositoire d'une crème pour faciliter son introduction.
- -Ex: Neo-Healar®, Hémorroix®

### Produits Associés (Rec)

- - **Veinotoniques oraux** :
- -Soulager les symptômes aigus de la maladie hémorroïdaire, incluant la douleur et les saignements (rectorragies)
- -Les veinotoniques agissent par leur effet vasculotrope et anti-inflammatoire, limitant la dilatation veineuse et diminuant la perméabilité capillaire
- -Posologie Daflon 500(crise) : 2 comprimés 3 fois par jour pendant 5 jours.
- - **Antalgiques** :
- -Paracétamol: 1g trois fois par jour, max 4g/j
- - **AINS** :
- -Ibuprofène: 200 mg, 600 à 1200 mg par jour
- - **Laxatifs doux (constipation)** :
- -Laxatifs osmotiques : Macrogol ou laxatifs de lest (ispaghul, psyllium).
- - **Compléments Veinotoniques (prévention)** : Vigne rouge, Marronnier d’Inde, Ginkgo biloba.
- -Réduit le risque de récurrence des symptômes à six mois.
- -Envisager une cure de 10 jours par mois pour réduire la fréquence et l'intensité des crises.
- -Ex: Keravel Forvein®

### Conseils Hygiène de Vie (Rec)

- -Toilette anale douce après chaque selle avec un savon surgras ou un gel intime doux (ex: Saforelle®). Séchage soigneux.
- -Éviter la sédentarité, la station assise ou debout prolongée. Pratiquer une activité physique régulière (marche, natation).
- -Ne pas forcer lors des selles.
- -Porter des vêtements en coton amples.

### Conseils Alimentaires (Rec)

- -Privilégier une alimentation riche en fibres (légumes verts, fruits, céréales complètes) pour régulariser le transit.
- -Boire suffisamment d'eau (1,5 à 2 litres par jour).
- -Éviter les aliments épicés, l'alcool, le café et les excitants.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition des hémorroïdes en tant que structure anatomique normale?
  R: Les hémorroïdes sont un réseau de vaisseaux artériels et veineux normalement présents dans le canal anal.
- Q: Quand parle-t-on de 'maladie hémorroïdaire'?
  R: La maladie hémorroïdaire survient lorsque ces vaisseaux se dilatent ou s'enflamment.
- Q: Quels sont les deux types d'hémorroïdes selon leur localisation?
  R: Il existe les hémorroïdes internes (situées dans le canal anal) et les hémorroïdes externes (situées autour de l'anus).
- Q: Citez au moins trois symptômes courants des hémorroïdes.
  R: Les symptômes courants incluent les saignements de sang rouge vif après la défécation, les démangeaisons, le gonflement et une sensation de pesanteur.
- Q: Quelle est la différence de perception de la douleur entre les hémorroïdes et une fissure anale?
  R: Les hémorroïdes sont généralement moins douloureuses qu'une fissure anale, sauf en cas de thrombose où la douleur peut être intense.
- Q: Qu'est-ce que le 'prolapsus' dans le contexte des hémorroïdes?
  R: Le prolapsus est l'extériorisation des hémorroïdes internes hors du canal anal.
- Q: Comment se caractérise un Stade 2 de prolapsus hémorroïdaire?
  R: Le prolapsus survient lors de la défécation mais se réintègre spontanément.
- Q: Quelle est la durée maximale recommandée pour l'utilisation de traitements topiques locaux pour les hémorroïdes, en particulier ceux contenant des anesthésiques locaux?
  R: L'utilisation est courte, 1 à 2 semaines maximum, et spécifiquement 8 jours pour les anesthésiques locaux.
- Q: Quel est un conseil pratique pour faciliter l'introduction d'un suppositoire?
  R: Il est conseillé d'enrober le suppositoire d'une crème pour faciliter son introduction.
- Q: Citez deux signaux d'alerte qui nécessitent une exploration médicale pour un patient souffrant d'hémorroïdes.
  R: Des signaux d'alerte incluent des symptômes persistants après 48 heures de traitement, des saignements abondants ou du sang noir dans les selles, une douleur intense ou persistante, de la fièvre associée, ou un patient de plus de 50 ans.

---

# Dyspepsie: Mémofiche conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Digestion | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une femme de 35 ans s'est présentée à la pharmacie: “Je digère mal. Que me conseillez-vous?”.

### Aperçu Pathologie

**Définition**:
-Ensemble de troubles digestifs post-repas (pesanteur gastrique, douleurs abdominales, ballonnements, rots fréquents)
**Causes aiguës**:
-Excès alimentaires, aliments irritants (épicés, gras), alcool, certains médicaments (ex: AINS)
**Causes chroniques**:
-RGO, ulcères (gastrique/duodénal), gastrite, SII, maladies chroniques (diabète, thyroïde), stress/anxiété
**Rôle hépatique**:
-Le foie produit la bile, essentielle à l’absorption des graisses et l’élimination des toxines.
**Foie surchargé**:
-Peut diminuer la production ou la qualité de la bile, rendant la digestion des graisses plus difficile
-Sensation de malaise digestif après un excès alimentaire

### Questions Clés

- -Depuis quand ressentez-vous ces symptômes ?
- -Quels sont les symptômes précis que vous ressentez (pesanteur, douleurs, ballonnements) ?
- -Ces symptômes sont-ils liés aux repas ?
- -Avez-vous fait des excès alimentaires récemment ? Avez-vous modifié récemment votre alimentation ?
- -Êtes-vous stressé(e) ou anxieux(se) ?
- -Prenez-vous des médicaments ?

### Signaux d'Alerte (Red Flags)

- -Symptômes persistent > 2 semaines malgré mesures hygiéno-diététiques.
- -Douleurs abdominales intenses ou persistantes.
- -Perte de poids inexpliquée.
- -Difficultés à avaler.
- -Vomissements fréquents ou répétés.
- -Présence de sang dans les selles.
- -Fièvre associée.
- -Jaunisse (Ictère).
- -Perte d'appétit prolongée.

### Traitement Principal

- **Boldine **:
- -Cholérétique: stimule sécrétion de bile
- -Cholagogue: facilite évacuation de la bile
- -Posologie: 1 comprimé avant les 3 principaux repas.
- -Contre-indications: Maladie du foie, obstruction des voies biliaires
- -Ex: Oxyboldine®

### Produits Associés

- **Antispasmodiques**: Phloroglucinol
- -Réduire les douleurs abdominales
- -Ex: Spasmocalm®
- **Pansements gastro-intestinaux**
- -Neutralisent l'acidité
- -Ex: Apyrosis®
- **Probiotiques**:
- -Équilibrer la flore intestinale.
- **Phytothérapie**:
- **Plantes digestives, carminatives**: fenouil, menthe, gingembre ou angélique
- -Favoriser la digestion ; limiter la formation de gaz dans le tractus digestif
- -Ex: Phytokad digestion®
- **Plantes détoxifiantes**: Artichaut, radis noir, desmodium, chardon marie
- -Stimulent la production et/ou l'évacuation de la bile
- -Ex: Keravel Hepator®
- **Homéopathie**:
- -Nux vomica 9CH 1 Dose avant tout repas copieux

### Conseils Hygiène de Vie

- -Gérer le stress par des techniques de relaxation.
- -Pratiquer une activité physique régulière.
- -Éviter de s'allonger juste après les repas.
- -Porter des vêtements amples au niveau abdominal.
- -Arrêter le tabac.

### Conseils Alimentaires

- -Manger lentement et bien mastiquer les aliments.
- -Prendre des repas légers et fractionnés.
- -Éviter les aliments gras, épicés, acides ou fermentescibles.
- -Limiter la consommation de café, thé, alcool et boissons gazeuses.
- -Boire suffisamment d'eau en dehors des repas.

### Traitement Principal (Rec)

- **Boldine **:
- -Cholérétique: stimule sécrétion de bile
- -Cholagogue: facilite évacuation de la bile
- -Posologie: 1 comprimé avant les 3 principaux repas.
- -Contre-indications: Maladie du foie, obstruction des voies biliaires
- -Ex: Oxyboldine®

### Produits Associés (Rec)

- **Antispasmodiques**: Phloroglucinol
- -Réduire les douleurs abdominales
- -Ex: Spasmocalm®
- **Pansements gastro-intestinaux**
- -Neutralisent l'acidité
- -Ex: Apyrosis®
- **Probiotiques**:
- -Équilibrer la flore intestinale.
- **Phytothérapie**:
- **Plantes digestives, carminatives**: fenouil, menthe, gingembre ou angélique
- -Favoriser la digestion ; limiter la formation de gaz dans le tractus digestif
- -Ex: Phytokad digestion®
- **Plantes détoxifiantes**: Artichaut, radis noir, desmodium, chardon marie
- -Stimulent la production et/ou l'évacuation de la bile
- -Ex: Keravel Hepator®
- **Homéopathie**:
- -Nux vomica 9CH 1 Dose avant tout repas copieux

### Conseils Hygiène de Vie (Rec)

- -Gérer le stress par des techniques de relaxation.
- -Pratiquer une activité physique régulière.
- -Éviter de s'allonger juste après les repas.
- -Porter des vêtements amples au niveau abdominal.
- -Arrêter le tabac.

### Conseils Alimentaires (Rec)

- -Manger lentement et bien mastiquer les aliments.
- -Prendre des repas légers et fractionnés.
- -Éviter les aliments gras, épicés, acides ou fermentescibles.
- -Limiter la consommation de café, thé, alcool et boissons gazeuses.
- -Boire suffisamment d'eau en dehors des repas.

### Conseils Traitement

### Flashcards (Révision)

- Q: Définissez la dyspepsie.
  R: C'est un ensemble de troubles digestifs post-repas incluant pesanteur gastrique, douleurs abdominales, ballonnements et rots fréquents.
- Q: Citez deux causes aiguës de la dyspepsie.
  R: Excès alimentaires, aliments irritants (épicés, gras), alcool ou certains médicaments (ex: AINS).
- Q: Quel est le rôle du foie dans la digestion des graisses?
  R: Le foie produit la bile, essentielle à l'absorption des graisses et à l'élimination des toxines.
- Q: Qu'est-ce qu'un 'foie encrassé'?
  R: C'est une sensation de malaise digestif après un excès alimentaire, indiquant une surcharge hépatique et biliaire temporaire.
- Q: Quel est l'impact d'un foie surchargé sur la production de bile?
  R: Un foie surchargé peut diminuer la production ou la qualité de la bile, rendant la digestion des graisses plus difficile.
- Q: Quel est le nom commercial de la Boldine mentionnée dans la mémofiche?
  R: Oxyboldine.
- Q: Expliquez l'action cholérétique de la Boldine.
  R: La Boldine stimule la sécrétion de bile.
- Q: Quelle est la posologie recommandée pour l'Oxyboldine?
  R: 1 comprimé avant les 3 principaux repas.
- Q: Citez une contre-indication à la prise de Boldine (Oxyboldine).
  R: Maladie du foie ou obstruction des voies biliaires.
- Q: Donnez un exemple de signal d'alerte en cas de dyspepsie nécessitant une consultation médicale.
  R: Symptômes persistant > 2 semaines, douleurs abdominales intenses, perte de poids inexpliquée, dysphagie, vomissements fréquents, sang dans les selles, fièvre, ictère ou anorexie.

---

# Candidose vaginale: Mémofiche conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé Féminine | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une femme âgée de 26 ans s’est présentée à la pharmacie “J’ai des brûlures et des démangeaisons vaginales. Que me conseillez-vous?”

### Aperçu Pathologie

• **Définition**
Infection fréquente du vagin ou de la vulve par la levure Candida albicans.
• **Cause**
Déséquilibre du microbiote vaginal où Candida albicans devient pathogène.
• **Symptôme**
Prurit vulvaire intense (démangeaisons), pertes blanchâtres, épaisses, d'aspect 'lait caillé' (leucorrhées), sensation de brûlure vulvo-vaginale, parfois en fin de miction.
• **Facteurs de risque**
Grossesse, diabète, antibiotiques à large spectre, contraceptifs oraux riches en œstrogènes, corticostéroïdes, immunosuppresseurs, vêtements serrés/synthétiques, hygiène intime excessive.
• **Récidives**
Définies par ≥ 4 épisodes/an, touchent environ 15% des femmes.
• **Complication**
Peut être associée à une infection bactérienne.
• **Transmission**
N'est PAS une maladie sexuellement transmissible (MST).

### Questions Clés

- -Depuis combien de temps avez-vous ces symptômes ?
- -Avez-vous des pertes vaginales ? Si oui, quelle est leur apparence et leur odeur ?
- -Ressentez-vous des démangeaisons ou des brûlures mictionnelles ?
- -Êtes-vous enceinte ou utilisez-vous une contraception hormonale ?
- -Avez-vous de la fièvre, des frissons ou des douleurs pelviennes ?
- -Est-ce la première fois que vous avez ces symptômes ?
- -Prenez-vous des médicaments en ce moment, comme des antibiotiques ou des corticoïdes ?
- -Avez-vous déjà utilisé un traitement antifongique ? Si oui, lequel ?

### Signaux d'Alerte (Red Flags)

- -Grossesse
- -Symptômes persistent ou s'aggravent malgré le traitement.
- -Récidives (plus de 4 fois par an).
- -Présence de fièvre, frissons ou douleurs pelviennes.
- -Présence de pertes jaunes malodorantes (peut indiquer une autre infection).

### Traitement Principal

- **Antifongiques locaux**:
- **Ovules ou capsules vaginales** à base d'imidazolés (ex: éconazole).
- -Un ovule le soir pendant 3 à 6 jours (sauf jeunes filles)
- -Exp: Ecorex® ovule
- **Crème ou lait antifongique** pour application externe (ex: éconazole)
- -Une application deux fois par jour pendant 8 jours
- -Exp: Ecorex® lait
- **Partenaire**
- -Traitement uniquement si le partenaire présente des symptômes (antifongique externe, non systématique).
- **Attention**
- -Ne pas interrompre le traitement pendant les règles.

### Produits Associés

- **Gel lavant intime**
- - À pH alcalin (pH 8) durant le traitement (14 jours max afin de protéger l'équilibre naturel de la flore vaginale.)
- - Ex: Mycolin®
- **Hygiène quotidienne**
- - Utiliser ensuite des savons ou gels à pH physiologique pour l'entretien.
- - Exp: Saforelle®
- **Probiotiques vaginaux**
- - Pour restaurer la flore vaginale saine (ex: Lactibiane CND®, Vagigermina®).
- **Ovules hydratantes/cicatrisantes**
- - Après guérison pour apaiser tissus irrités
- - Ex: Ialugyn®, Santes®
- **Protège-slips**
- - À changer fréquemment en cas d'écoulements.

### Conseils Hygiène de Vie

- -Porter des sous-vêtements en coton et les changer quotidiennement.
- -Éviter les vêtements trop serrés ou synthétiques.
- -Ne pas utiliser de savons parfumés ou de douches vaginales.
- -S'essuyer d'avant en arrière après être allé aux toilettes.
- -Éviter les bains prolongés et les jacuzzis.
- -Ne pas garder de maillot de bain mouillé.
- -Utiliser des préservatifs pendant le traitement.
- -Bien sécher la vulve après la toilette.
- -Laver le linge à haute température (70°C).

### Conseils Alimentaires

- -Boire suffisamment d'eau.

### Traitement Principal (Rec)

- **Antifongiques locaux**:
- **Ovules ou capsules vaginales** à base d'imidazolés (ex: éconazole).
- -Un ovule le soir pendant 3 à 6 jours (sauf jeunes filles)
- -Exp: Ecorex® ovule
- **Crème ou lait antifongique** pour application externe (ex: éconazole)
- -Une application deux fois par jour pendant 8 jours
- -Exp: Ecorex® lait
- **Partenaire**
- -Traitement uniquement si le partenaire présente des symptômes (antifongique externe, non systématique).
- **Attention**
- -Ne pas interrompre le traitement pendant les règles.

### Produits Associés (Rec)

- **Gel lavant intime**
- - À pH alcalin (pH 8) durant le traitement (14 jours max afin de protéger l'équilibre naturel de la flore vaginale.)
- - Ex: Mycolin®
- **Hygiène quotidienne**
- - Utiliser ensuite des savons ou gels à pH physiologique pour l'entretien.
- - Exp: Saforelle®
- **Probiotiques vaginaux**
- - Pour restaurer la flore vaginale saine (ex: Lactibiane CND®, Vagigermina®).
- **Ovules hydratantes/cicatrisantes**
- - Après guérison pour apaiser tissus irrités
- - Ex: Ialugyn®, Santes®
- **Protège-slips**
- - À changer fréquemment en cas d'écoulements.

### Conseils Hygiène de Vie (Rec)

- -Porter des sous-vêtements en coton et les changer quotidiennement.
- -Éviter les vêtements trop serrés ou synthétiques.
- -Ne pas utiliser de savons parfumés ou de douches vaginales.
- -S'essuyer d'avant en arrière après être allé aux toilettes.
- -Éviter les bains prolongés et les jacuzzis.
- -Ne pas garder de maillot de bain mouillé.
- -Utiliser des préservatifs pendant le traitement.
- -Bien sécher la vulve après la toilette.
- -Laver le linge à haute température (70°C).

### Conseils Alimentaires (Rec)

- -Boire suffisamment d'eau.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la cause principale de la candidose vaginale?
  R: Un déséquilibre du microbiote vaginal où Candida albicans devient pathogène.
- Q: La candidose vaginale est-elle une maladie sexuellement transmissible (MST)?
  R: Non, elle n'est PAS une maladie sexuellement transmissible (MST).
- Q: Quels sont les principaux symptômes de la candidose vaginale?
  R: Prurit vulvaire intense (démangeaisons), pertes blanchâtres, épaisses, d'aspect 'lait caillé' (leucorrhées), et sensation de brûlure vulvo-vaginale.
- Q: Citez au moins trois facteurs de risque pour la candidose vaginale.
  R: Grossesse, diabète, prise d'antibiotiques à large spectre, contraceptifs oraux riches en œstrogènes, corticostéroïdes, immunosuppresseurs, vêtements serrés/synthétiques, hygiène intime excessive.
- Q: Comment sont définies les récidives de candidose vaginale?
  R: Elles sont définies par ≥ 4 épisodes par an.
- Q: Quelle est la catégorie principale de médicaments utilisée pour le traitement local de la candidose vaginale?
  R: Les antifongiques locaux, souvent à base d'imidazolés (ex: éconazole).
- Q: Quelle est la posologie typique pour un ovule antifongique dans le traitement de la candidose vaginale?
  R: Un ovule le soir pendant 3 à 6 jours (sauf pour les jeunes filles).
- Q: Quand faut-il envisager de traiter le partenaire d'une femme atteinte de candidose vaginale?
  R: Uniquement si le partenaire présente des symptômes (avec un antifongique externe, ce n'est pas systématique).
- Q: Faut-il interrompre le traitement antifongique local pendant les règles?
  R: Non, il ne faut pas interrompre le traitement pendant les règles.
- Q: Citez deux signaux d'alerte qui nécessitent une consultation médicale ou un avis médical approfondi.
  R: Grossesse, persistance ou aggravation des symptômes malgré le traitement, récidives fréquentes, présence de fièvre/frissons/douleurs pelviennes, pertes jaunes malodorantes.

---

# Cystite non récidivante: Mémofiche conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé Féminine | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une patiente de 32 ans se présente à la pharmacie : « J’ai des brûlures quand j’urine, je veux une boîte de Fosfomycine ».

### Aperçu Pathologie

• **Définition** :
• La cystite est une inflammation de la vessie, généralement due à une infection bactérienne (Escherichia coli dans 70-95% des cas)
• **Types** :
• On distingue 2 types d’infection urinaire :
• Une infection basse : cystite : fréquente mais banale pouvant être prise en charge en officine en début de la maladie sans terrain à risque
• Une infection haute : pyélonéphrite (colonisation bactérienne des reins et des voies urinaires hautes) rare mais plus grave
• **Symptômes** :
• Brûlures mictionnelles, douleurs bas-ventre, pollakiurie (fréquence excessive des mictions), impériosité, les urines peuvent être troubles, malodorantes, parfois hématurie.
• **Incidence** :
• Majoritairement chez la femme (20-50 ans) dû à l'anatomie: Urètre court, proximité anus/vagin, activité sexuelle.
• **Facteurs hormonaux** :
• Grossesse, ménopause (hypo-œstrogénie), utilisation de spermicides.

### Questions Clés

- -Depuis quand ressentez-vous ces symptômes ?
- -Avez-vous de la fièvre, des frissons ou des douleurs lombaires ?
- -Est-ce la première fois ou est-ce récurrent (plus de 4 épisodes par an) ?
- -Êtes-vous enceinte ou allaitante ?
- -Prenez-vous actuellement des médicaments ?
- -Souffrez-vous d’un diabète ou d’une pathologie rénale ?
- -Y a-t-il du sang dans vos urines ?

### Signaux d'Alerte (Red Flags)

- -Fièvre, frissons ou douleurs lombaires (pyélonéphrite).
- -Persistance des symptômes > 24-48h malgré traitement.
- -Récidives: Plus de 4 épisodes par an.
- -Hématurie (sang dans les urines).
- -Terrain à risque: Diabète ou pathologie rénale (facteurs de complications), grossesse
- -Cystite chez l'enfant ou l'homme (risque de complications prostatiques ou épididymaires).

### Traitement Principal

- **Canneberge (PACs)** :
- -Prévient et aide à traiter les infections urinaires.
- -Minimum 36 mg de Proanthocyanidines de type A (PAC A) par jour.
- -Empêche l'adhérence des bactéries (notamment E. coli) aux parois de la vessie.
- -Ex: Bio health Cann-Cyst®, Aktiv Uricalm®
- **Fosfomycine-trométamol** :
- -Médicament prescrit
- -Cet antibiotique est le traitement de première intention en prise unique pour cystite aiguë simple.

### Produits Associés

- **Antispasmodiques** :
- -Paracétamol, phloroglucinol en cas de douleurs légères.
- -Ex: Nospasm®, Spasmocalm®
- **AINS** :
- -À éviter pendant les cystites (risque d’allongement symptômes et effets indésirables).
- **Plantes antiseptiques diurétiques** :
- -Bruyère, busserole, piloselle, orthosiphon
- -Favorisent l'élimination
- -Ex: 3chenes Cystinat®
- **Probiotiques** :
- -Lactobacillus (L. rhamnosus, L. reuteri)
- -Rééquilibrer la flore
- -Ex: Feminabiane CBU®
- **D-mannose** :
- -Prévention des récidives (2g/jour).
- -Inhibe l'adhérence d'E. coli
- -Ex: D-mannosa®

### Conseils Hygiène de Vie

- -Adopter une bonne hygiène avec un savon gynécologique adapté respectant le pH vaginal
- -Effectuer la toilette d'avant en arrière pour éviter la contamination
- -Uriner après les rapports sexuels
- -Porter des sous-vêtements en coton, éviter les vêtements trop serrés
- -Ne pas se retenir d'uriner

### Conseils Alimentaires

- -Boire au moins 1,5L d'eau par jour pour favoriser le rinçage urinaire.
- -Préférer une alimentation riche en fibres pour prévenir la constipation.

### Traitement Principal (Rec)

- **Canneberge (PACs)** :
- -Prévient et aide à traiter les infections urinaires.
- -Minimum 36 mg de Proanthocyanidines de type A (PAC A) par jour.
- -Empêche l'adhérence des bactéries (notamment E. coli) aux parois de la vessie.
- -Ex: Bio health Cann-Cyst.
- **Fosfomycine-trométamol** :
- -Médicament prescrit
- -Cet antibiotique est le traitement de première intention en prise unique pour cystite aiguë simple.

### Produits Associés (Rec)

- **Antispasmodiques** :
- -Paracétamol, phloroglucinol en cas de douleurs légères.
- -Ex: Nospasm®, Spasmocalm®
- **AINS** :
- -À éviter pendant les cystites (risque d’allongement symptômes et effets indésirables).
- **Plantes antiseptiques diurétiques** :
- -Bruyère, busserole, piloselle, orthosiphon
- -Favorisent l'élimination
- -Ex: 3chenes Cystinat®
- **Probiotiques** :
- -Lactobacillus (L. rhamnosus, L. reuteri)
- -Rééquilibrer la flore
- -Ex: Feminabiane CBU®
- **D-mannose** :
- -Prévention des récidives (2g/jour).
- -Inhibe l'adhérence d'E. coli
- -Ex: D-mannosa®

### Conseils Hygiène de Vie (Rec)

- -Adopter une bonne hygiène avec un savon gynécologique adapté respectant le pH vaginal
- -Effectuer la toilette d'avant en arrière pour éviter la contamination
- -Uriner après les rapports sexuels
- -Porter des sous-vêtements en coton, éviter les vêtements trop serrés
- -Ne pas se retenir d'uriner

### Conseils Alimentaires (Rec)

- -Boire au moins 1,5L d'eau par jour pour favoriser le rinçage urinaire.
- -Préférer une alimentation riche en fibres pour prévenir la constipation.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition de la cystite ?
  R: La cystite est une inflammation bactérienne de la vessie, souvent causée par E. coli (70-95%).
- Q: Quels sont les quatre symptômes typiques de la cystite ?
  R: Les symptômes typiques sont les brûlures mictionnelles, les douleurs dans le bas-ventre, la pollakiurie et l'impériosité.
- Q: Pourquoi les femmes sont-elles plus sujettes aux cystites que les hommes ?
  R: Les femmes sont plus sujettes aux cystites en raison de leur anatomie : un urètre plus court et la proximité de l'anus et du vagin.
- Q: Quels sont les principaux facteurs hormonaux ou liés au mode de vie qui peuvent favoriser les cystites chez la femme ?
  R: La grossesse, la ménopause (due à l'hypo-œstrogénie) et l'utilisation de spermicides sont des facteurs favorisants.
- Q: Quel est l'ingrédient actif de la canneberge recommandé pour la prévention des infections urinaires ?
  R: Les Proanthocyanidines de type A (PAC A).
- Q: Quelle est la dose minimale journalière de PAC A recommandée pour l'efficacité de la canneberge ?
  R: Un minimum de 36 mg de PAC A par jour.
- Q: Quel est le mécanisme d'action principal de la canneberge dans la prévention des cystites ?
  R: La canneberge empêche l'adhérence des bactéries (notamment E. coli) aux parois de la vessie.
- Q: Quels sont les signes d'alerte indiquant une possible complication grave comme la pyélonéphrite ?
  R: La fièvre, les frissons et les douleurs lombaires sont des signes de gravité pouvant indiquer une pyélonéphrite.
- Q: Dans quels cas une cystite chez l'homme ou l'enfant doit-elle être considérée comme un signal d'alerte ?
  R: Chez l'homme ou l'enfant, une cystite est un signal d'alerte en raison du risque de complications prostatiques ou épididymaires (chez l'homme) et de complications générales (chez l'enfant).
- Q: Quand considère-t-on un échec thérapeutique pour une cystite traitée ?
  R: Un échec thérapeutique est avéré si les symptômes persistent plus de 24 à 48 heures malgré le traitement.

---

# Vers intestinaux: Mémofiche Conseils à l'offcine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Pédiatrie | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une maman s’est présentée à la pharmacie demandant un conseil pour son fils âgé de 8 ans: “Mon enfant a des vers, que me conseillez-vous ?"

### Aperçu Pathologie

• - **Définition**
• Oxyurose : parasitose intestinale très fréquente chez l'enfant.
• - **Cause**
• Petit ver blanc (_Enterobius vermicularis_), femelles pondent des œufs autour de l'anus la nuit.
• - **Contamination**
• Ingestion ou inhalation d'œufs présents sur les mains, objets ou dans l'air.
• - **Cycle**
• Œufs éclosent dans l'estomac, larves migrent vers l'intestin grêle, deviennent adultes en 5-6 semaines dans le côlon.
• - **Transmission**
• Très contagieux, favorisée par auto-réinfestation (grattage), vie en collectivité, œufs aéroportés.
• - **Symptôme majeur**
• Démangeaisons anales intenses, surtout la nuit, pouvant causer troubles du sommeil et irritabilité.
• - **Autres symptômes**
• Douleurs abdominales légères, perte d'appétit.
• - **Observation**
• Petits vers blancs mobiles parfois visibles dans les selles ou autour de l'anus.

### Questions Clés

- - Depuis quand pensez-vous que votre enfant a des vers ?
- - Avez-vous vu des vers dans les selles de votre enfant ou autour de son anus ?
- - Quels sont les symptômes que vous avez observés chez votre enfant ?
- - Votre enfant se plaint-il de démangeaisons anales, surtout la nuit ?
- - Y a-t-il d'autres symptômes associés, comme des douleurs abdominales, des diarrhées, une irritabilité ou des troubles du sommeil ?
- - Y a-t-il d'autres membres de la famille ou des personnes vivant en collectivité (crèche, école...) qui présentent des symptômes similaires ?
- - Avez-vous déjà essayé un traitement auparavant pour des vers ?

### Signaux d'Alerte (Red Flags)

- - Présence de fièvre
- - Amaigrissement
- - Diarrhées persistantes
- - Échec d'un traitement précédent bien conduit
- - Retour d'un voyage à l'étranger

### Traitement Principal

- - **Albendazole** (ex: Zzole, Nemacest, Zendis) : Enfant 1-2 ans: 200 mg (1/2 flacon) en 1 prise. Adulte et enfant > 2 ans: 400 mg en 1 prise. À renouveler après 1 semaine. Effets secondaires: troubles digestifs, céphalées, vertiges.
- - **Mebendazole** (ex: Vermozol) : Enfant > 2 ans et adulte: 100 mg dose unique. À renouveler après 2 à 4 semaines. Effets secondaires: troubles digestifs, céphalées, vertiges.
- - **Pyrantel** (ex: Helmintox) : 10-12 mg/kg en 1 prise unique. À renouveler après 2-3 semaines. Effets secondaires: troubles digestifs (anorexie, nausées, vomissements, douleurs abdominales, diarrhée), céphalées, somnolence, vertiges.
- - **Renouvellement** Indispensable car la première prise n'élimine que les vers adultes, pas les œufs. Une seconde prise cible les larves écloses.
- - **Famille** Traiter toute la famille vivant sous le même toit pour briser le cycle de transmission et éviter les réinfestations.

### Conseils Hygiène de Vie

- - Couper les ongles courts et les brosser régulièrement.
- - Lavage des mains systématique après les toilettes et avant les repas.
- - Changer quotidiennement sous-vêtements et pyjamas.
- - Porter des pyjamas fermés la nuit pour limiter les démangeaisons et la dissémination des œufs.
- - Laver draps et linge à 60°C (la chaleur est plus efficace que les désinfectants contre les œufs).
- - Nettoyer/aspirer régulièrement les sols et tapis.
- - Passer l’aspirateur fréquemment.
- - Éviter de secouer les draps et vêtements pour ne pas disperser les œufs aéroportés.

### Conseils Alimentaires

- - Maintenir une alimentation équilibrée pendant le traitement.
- - Bien laver les légumes et les fruits avant consommation pour éliminer d'éventuels œufs.
- - L'absorption de l'albendazole est améliorée par les aliments riches en lipides.

### Traitement Principal (Rec)

- - **Albendazole** (ex: Zzole, Nemacest, Zendis) : Enfant 1-2 ans: 200 mg (1/2 flacon) en 1 prise. Adulte et enfant > 2 ans: 400 mg en 1 prise. À renouveler après 1 semaine. Effets secondaires: troubles digestifs, céphalées, vertiges.
- - **Mebendazole** (ex: Vermozol) : Enfant > 2 ans et adulte: 100 mg dose unique. À renouveler après 2 à 4 semaines. Effets secondaires: troubles digestifs, céphalées, vertiges.
- - **Pyrantel** (ex: Helmintox) : 10-12 mg/kg en 1 prise unique. À renouveler après 2-3 semaines. Effets secondaires: troubles digestifs (anorexie, nausées, vomissements, douleurs abdominales, diarrhée), céphalées, somnolence, vertiges.
- - **Renouvellement** Indispensable car la première prise n'élimine que les vers adultes, pas les œufs. Une seconde prise cible les larves écloses.
- - **Famille** Traiter toute la famille vivant sous le même toit pour briser le cycle de transmission et éviter les réinfestations.

### Conseils Hygiène de Vie (Rec)

- - Couper les ongles courts et les brosser régulièrement.
- - Lavage des mains systématique après les toilettes et avant les repas.
- - Changer quotidiennement sous-vêtements et pyjamas.
- - Porter des pyjamas fermés la nuit pour limiter les démangeaisons et la dissémination des œufs.
- - Laver draps et linge à 60°C (la chaleur est plus efficace que les désinfectants contre les œufs).
- - Nettoyer/aspirer régulièrement les sols et tapis.
- - Passer l’aspirateur fréquemment.
- - Éviter de secouer les draps et vêtements pour ne pas disperser les œufs aéroportés.

### Conseils Alimentaires (Rec)

- - Maintenir une alimentation équilibrée pendant le traitement.
- - Bien laver les légumes et les fruits avant consommation pour éliminer d'éventuels œufs.
- - L'absorption de l'albendazole est améliorée par les aliments riches en lipides.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que l'oxyurose?
  R: L'oxyurose est une parasitose intestinale très fréquente chez l'enfant.
- Q: Quelle est la cause de l'oxyurose?
  R: Elle est causée par un petit ver blanc appelé Enterobius vermicularis.
- Q: Comment se fait la contamination par les oxyures?
  R: La contamination se fait par ingestion ou inhalation d'œufs présents sur les mains, objets ou dans l'air.
- Q: Quel est le symptôme majeur de l'oxyurose?
  R: Le symptôme majeur est des démangeaisons anales intenses, surtout la nuit.
- Q: Pourquoi est-il indispensable de renouveler le traitement contre les oxyures?
  R: Le renouvellement est indispensable car la première prise n'élimine que les vers adultes, pas les œufs. La seconde prise cible les larves écloses.
- Q: Qui doit être traité en cas d'oxyurose dans une famille?
  R: Toute la famille vivant sous le même toit doit être traitée pour briser le cycle de transmission et éviter les réinfestations.
- Q: Citez deux médicaments utilisés pour traiter l'oxyurose.
  R: L'Albendazole (ex: Zzole) et le Mebendazole (ex: Vermozol) sont couramment utilisés.
- Q: Quel est le cycle de développement des oxyures dans l'organisme?
  R: Les œufs éclosent dans l'estomac, les larves migrent vers l'intestin grêle et deviennent adultes en 5-6 semaines dans le côlon.
- Q: Quels sont les signes d'alerte qui nécessitent une consultation médicale en cas de suspicion de vers?
  R: La fièvre, l'amaigrissement, les diarrhées persistantes, l'échec d'un traitement précédent ou un retour de voyage à l'étranger.
- Q: À quel moment peut-on observer les vers adultes?
  R: De petits vers blancs mobiles sont parfois visibles dans les selles ou autour de l'anus, surtout la nuit.

---

# Dysménorrhée: MémoFiche Conseil à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé Féminine | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une jeune femme âgée de 24 ans se présente au comptoir: "Puis-je avoir une boite d’Antafen®?"

### Aperçu Pathologie

• **Définition**
• Douleurs abdominales (crampes) survenant avant ou pendant les menstruations.,
• - **Primaire**:
• Absence de maladie pelvienne identifiable, liée à l'hypersécrétion de prostaglandines.,
• La douleur est maximale au début des règles (24-36h), peut irradier vers le bas du dos et les cuisses.,
• Symptômes associés: Nausées, vomissements, maux de tête, fatigue, irritabilité, vertiges fréquents.,
• - **Secondaire**
• Causée par une pathologie pelvienne sous-jacente: endométriose, fibromes, syndrome des Ovaires Polykystiques (SOPK).
• Apparaît généralement vers la trentaine.,
• La douleur peut apparaître jusqu'à une semaine avant les règles et persister plus longtemps.

### Questions Clés

- -Depuis quand souffrez-vous de ces douleurs ?
- -Quelle est l'intensité de vos douleurs (légère, modérée, intense) ?
- -Ces douleurs sont-elles habituelles ou plus fortes que d'habitude ?
- -Ces douleurs perturbent-elles vos activités quotidiennes ?
- -Où précisément ressentez-vous la douleur ? Irradie-t-elle vers le dos ou les cuisses ?
- -Que prenez-vous pour les soulager ? Est-ce efficace ?
- -Avez-vous des règles abondantes?
- -Avez-vous d'autres symptômes associés (nausées, vomissements, diarrhée, fatigue, vertige) ?
- -Êtes-vous suivie régulièrement par un gynécologue ?
- -Avez-vous des antécédents médicaux particuliers (ulcères gastriques ou duodénaux, insuffisance hépatique ou rénale sévère, asthme, sensibilité aux AINS) ?

### Signaux d'Alerte (Red Flags)

- -Douleurs intenses ou persistantes malgré un traitement symptomatique (suspicion d'endométriose).
- -Saignements anormalement abondants ou présence de caillots.
- -Saignements en dehors des menstruations.
- -Douleurs s'intensifiant cycle après cycle.
- -Douleur non améliorée après deux cycles de traitement.
- -Douleurs accompagnées de fièvre.

### Traitement Principal

- **Paracétamol**
- -500 mg à 1g par prise, trois fois par jour, à renouveler au bout de 4h min, sans dépasser 4g/jour.
- **AINS**
- -Inhibent la synthèse des prostaglandines, responsables des contractions utérines douloureuses.
- -Conseillé dès le premier jour des règles ou dès le début des douleurs.
- -Dose la plus faible possible, durée la plus courte possible (max 5 jours).
- -De préférence au cours des repas pour limiter les troubles gastro-intestinaux.
- -Ibuprofène: 200 mg par prise, à renouveler toutes les 6 heures sans dépasser 1200 mg par jour.
- -Ex: Dolven® 200

### Produits Associés

- **Antispasmodiques** Phloroglucinol
- -160 mg/prise, si besoin 3x/jour, espacer d'au moins 2h
- -Privilégier les comprimés effervescents ou lyoc.
- -Ex: Nospasm®
- **Magnésium**
- -Aide à la relaxation musculaire, réduit les crampes et prévient les signes prémenstruels.
- -300-400 mg/jour, en cure de 1 à 3 mois, à débuter 7 à 10 jours avant les règles.
- -Préférer les sels organiques (citrate, malate) ou bisglycinate/glycinate pour une meilleure assimilation.
- -Ex: Kela Mag®
- **Vitamine B6**
- -Réduit les symptômes émotionnels du SPM,
- -Augmente l’absorption du magnésium (1.5-2mg/jour).
- **Gattilier**
- -Aide à réguler le cycle menstruel et réduit les symptômes du SPM
- -Conseillé du 8e au 21e jour du cycle, pendant 3 cycles
- -Contre-indiqué chez les -18 ans, femmes enceintes et allaitantes.
- -Ex: Bioherbs Gattilier®
- **Huile d'Onagre**
- -Riche en acides gras essentiels, aide à réduire l'inflammation
- -Conseillée 10 derniers jours du cycle, à renouveler 3 mois
- -Ex: 3chênes Onagre bourrache®
- **Mélisse**
- -Antispasmodique, relaxante
- -300 à 600 mg/jour d'extrait sec
- -Ex: Thérapia Mélisse®

### Conseils Hygiène de Vie

- -Se reposer et dormir suffisamment.
- -Placer un coussin chauffant ou une bouillotte sur le ventre (effet relaxant sur l'utérus).
- -Prendre un bain ou une douche chaude.
- -Pratiquer une activité physique légère à modérée
- -Éviter le tabac.
- -Réduire le stress.
- -Éviter les produits d'hygiène intime agressifs, privilégier savons sans parfum à pH neutre.

### Conseils Alimentaires

- -Adopter une alimentation équilibrée.
- -Privilégier une alimentation riche en oméga-3 (saumon, thon, maquereau).
- -Limiter la caféine, l'alcool et le tabac.
- -Boire suffisamment d'eau.

### Traitement Principal (Rec)

- **Paracétamol**
- -500 mg à 1g par prise, trois fois par jour, à renouveler au bout de 4h min, sans dépasser 4g/jour.
- **AINS**
- -Inhibent la synthèse des prostaglandines, responsables des contractions utérines douloureuses.
- -Conseillé dès le premier jour des règles ou dès le début des douleurs.
- -Dose la plus faible possible, durée la plus courte possible (max 5 jours).
- -De préférence au cours des repas pour limiter les troubles gastro-intestinaux.
- -Ibuprofène: 200 mg par prise, à renouveler toutes les 6 heures sans dépasser 1200 mg par jour.
- -Ex: Dolven® 200

### Produits Associés (Rec)

- **Antispasmodiques** Phloroglucinol
- -160 mg/prise, si besoin 3x/jour, espacer d'au moins 2h
- -Privilégier les comprimés effervescents ou lyoc.
- -Ex: Nospasm®
- **Magnésium**
- -Aide à la relaxation musculaire, réduit les crampes et prévient les signes prémenstruels.
- -300-400 mg/jour, en cure de 1 à 3 mois, à débuter 7 à 10 jours avant les règles.
- -Préférer les sels organiques (citrate, malate) ou bisglycinate/glycinate pour une meilleure assimilation.
- -Ex: Kela Mag®
- **Vitamine B6**
- -Réduit les symptômes émotionnels du SPM,
- -Augmente l’absorption du magnésium (1.5-2mg/jour).
- **Gattilier**
- -Aide à réguler le cycle menstruel et réduit les symptômes du SPM
- -Conseillé du 8e au 21e jour du cycle, pendant 3 cycles
- -Contre-indiqué chez les -18 ans, femmes enceintes et allaitantes.
- -Ex: Bioherbs Gattilier®
- **Huile d'Onagre**
- -Riche en acides gras essentiels, aide à réduire l'inflammation
- -Conseillée 10 derniers jours du cycle, à renouveler 3 mois
- -Ex: 3chênes Onagre bourrache®
- **Mélisse**
- -Antispasmodique, relaxante
- -300 à 600 mg/jour d'extrait sec
- -Ex: Thérapia Mélisse®

### Conseils Hygiène de Vie (Rec)

- -Se reposer et dormir suffisamment.
- -Placer un coussin chauffant ou une bouillotte sur le ventre (effet relaxant sur l'utérus).
- -Prendre un bain ou une douche chaude.
- -Pratiquer une activité physique légère à modérée
- -Éviter le tabac.
- -Réduire le stress.
- -Éviter les produits d'hygiène intime agressifs, privilégier savons sans parfum à pH neutre.

### Conseils Alimentaires (Rec)

- -Adopter une alimentation équilibrée.
- -Privilégier une alimentation riche en oméga-3 (saumon, thon, maquereau).
- -Limiter la caféine, l'alcool et le tabac.
- -Boire suffisamment d'eau.

### Conseils Traitement

### Flashcards (Révision)

- Q: Comment définit-on la dysménorrhée?
  R: Douleurs abdominales (crampes) survenant avant ou pendant les menstruations.
- Q: Quelle est la caractéristique principale de la dysménorrhée primaire ?
  R: Absence de maladie pelvienne identifiable, liée à l'hypersécrétion de prostaglandines.
- Q: Quand la douleur de la dysménorrhée primaire est-elle maximale et où peut-elle irradier ?
  R: Maximale au début des règles (24-36h), peut irradier vers le bas du dos et les cuisses.
- Q: Citez deux symptômes associés fréquents de la dysménorrhée.
  R: Nausées, vomissements, maux de tête, fatigue, irritabilité, vertiges.
- Q: Quelles sont les causes de la dysménorrhée secondaire ?
  R: Endométriose, fibromes, Syndrome des Ovaires Polykystiques (SOPK).
- Q: Quel est le mécanisme d'action des AINS pour soulager la dysménorrhée ?
  R: Ils inhibent la synthèse des prostaglandines, responsables des contractions utérines douloureuses.
- Q: Quelle est la posologie maximale journalière du Paracétamol et la fréquence de renouvellement ?
  R: 4g/jour maximum, à renouveler au bout de 4h minimum (500mg à 1g par prise).
- Q: Quand est-il conseillé de prendre les AINS pour la dysménorrhée ?
  R: Dès le premier jour des règles ou dès le début des douleurs.
- Q: Quelle est la posologie par prise de l'Ibuprofène et la dose maximale journalière ?
  R: 200 mg par prise, sans dépasser 1200 mg par jour.
- Q: Citez un signal d'alerte important nécessitant une consultation médicale pour des douleurs menstruelles.
  R: Douleurs intenses ou persistantes malgré un traitement, saignements anormalement abondants, saignements intercycliques, aggravation des douleurs cycle après cycle, échec de traitement après deux cycles, douleurs accompagnées de fièvre.

---

# Pied d’athlète: MémoFiche Conseil à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé cutanée | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un patient de 25 ans se présente à la pharmacie: « Bonjour, j’ai des fissures, c’est blanchâtre et ça me démange entre les deux derniers orteils. Que me conseillez-vous?»

### Aperçu Pathologie

**Définition:**
-Le pied d'athlète, ou mycose interdigitale, est une **infection de la peau** causée par des champignons **dermatophytes**, le plus souvent Trichophyton rubrum.
**Symptômes typiques:**
-Démangeaisons, rougeurs, fissures, squames, aspect blanchâtre, macération.
**Localisation**
-Généralement entre le **4**ème et **5**ème orteil.
-Peut s'étendre aux autres orteils, plante du pied, ou ongles.
**Facteurs de risque**
-Humidité, chaleur, transpiration, chaussures fermées, lieux publics, mauvaise hygiène.

### Questions Clés

- **-**Depuis quand avez-vous ces symptômes ?
- **-**Les lésions, où sont-elles localisées précisément ?
- **-**Avez-vous des démangeaisons ? Avez-vous des fissures, des suintements ou un aspect blanchâtre entre les orteils ?
- **-**Avez-vous déjà eu ce genre de problème auparavant ?
- **-**Fréquentez-vous des lieux publics (piscines, salles de sport) ?
- **-**Portez-vous des chaussures fermées régulièrement ?
- **-**Avez-vous des lésions similaires sur d'autres parties du corps (mains, ongles) ?
- **-**Avez-vous d'autres problèmes de santé (diabète, immunité) ?
- **-**Avez-vous utilisé un traitement auparavant ?

### Signaux d'Alerte (Red Flags)

- -Lésions **étendues** ou **atypiques**.
- -Lésions **récidivantes**.
- -Atteinte des **ongles**.
- -Diabète, maladie neurologique, artérite des membres inférieurs.
- -Suspicion de surinfection **bactérienne**.
- -**Persistance** ou **aggravation** sous traitement.
- -Gêne importante ou **douleur**.
- - Femme enceinte, enfant < 12 ans.

### Traitement Principal

- -**Antifongique locaux**: les imidazolés
- -Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- -Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- -Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- -**Galénique**
- -Préférer les formes poudre/lotion pour les lésions suintantes et les crèmes pour les lésions sèches.
- -**Important**:
- -Respecter la durée complète même après amélioration pour éviter les rechutes.

### Produits Associés

- -**Poudre antifongique**
- -Traiter les chaussures pour limiter les récidives
- -Ex: Perozyl® poudre
- -**Gel pH alcalin**
- -Pour le lavage des pieds
- -Ex: Mycolin®
- -**Bain de pied**
- -Avec HE de lavande (antifongique) et bicarbonate de soude (alcalinisant).

### Conseils Hygiène de Vie

- -**Bien sécher** les pieds, surtout entre les orteils.
- -Éviter l'**humidité** prolongée et la macération.
- -Porter des chaussettes **en coton**, les changer **quotidiennement**.
- -Préférer des **chaussures aérées**, éviter les fermées longtemps.
- -**Ne pas partager** serviettes, chaussures, articles de toilette.
- -Laver linge et vêtements à **60°**C.
- -**Lieux publics** Éviter de marcher pieds nus.

### Conseils Alimentaires

- - Adopter une alimentation équilibrée pour soutenir le système immunitaire.

### Traitement Principal (Rec)

- **Antifongique locaux**: les imidazolés
- - Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- - Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- - Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- **Galénique**
- - Préférer les formes poudre/lotion pour les lésions suintantes et les crèmes pour les lésions sèches.
- **Important**:
- - Respecter la durée complète même après amélioration pour éviter les rechutes.

### Produits Associés (Rec)

- **Poudre antifongique**
- - Traiter les chaussures pour limiter les récidives
- - Ex: Perozyl® poudre
- **Gel pH alcalin**
- - Pour le lavage des pieds
- - Ex: Mycolin®
- **Bain de pied**
- - Avec HE de lavande (antifongique) et bicarbonate de soude (alcalinisant).

### Conseils Hygiène de Vie (Rec)

- - Bien sécher les pieds, surtout entre les orteils.
- - Éviter l'humidité prolongée et la macération.
- - Porter des chaussettes en coton, les changer quotidiennement.
- - Préférer des chaussures aérées, éviter les fermées longtemps.
- - Ne pas partager serviettes, chaussures, articles de toilette.
- - Laver linge et vêtements à 60°C.
- **Lieux publics** Éviter de marcher pieds nus.

### Conseils Alimentaires (Rec)

- - Adopter une alimentation équilibrée pour soutenir le système immunitaire.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que le 'Pied d'athlète' ou mycose interdigitale?
  R: C'est une infection cutanée causée par des champignons dermatophytes.
- Q: Quel est l'agent pathogène le plus souvent responsable du pied d'athlète?
  R: Trichophyton rubrum.
- Q: Citez trois symptômes courants du pied d'athlète.
  R: Démangeaisons, rougeurs, fissures, squames, aspect blanchâtre, macération.
- Q: Quelle est la localisation la plus fréquente du pied d'athlète?
  R: Généralement entre le 4ème et le 5ème orteil.
- Q: Donnez deux facteurs favorisant le développement du pied d'athlète.
  R: Humidité, chaleur, transpiration, chaussures fermées, lieux publics, mauvaise hygiène.
- Q: Quel est le principal mode de diagnostic du pied d'athlète?
  R: Le diagnostic est principalement clinique.
- Q: Quel type de traitement est recommandé pour le pied d'athlète?
  R: Une application locale d'antifongique (crème, gel, solution, poudre).
- Q: Citez deux classes de molécules antifongiques utilisées pour le pied d'athlète.
  R: Les imidazolés (éconazole, miconazole) et les allylamines (terbinafine), ou le ciclopirox.
- Q: Quelle est la durée de traitement recommandée pour l'éconazole en cas de pied d'athlète?
  R: 1 application 2 fois par jour pendant 2 à 3 semaines.
- Q: Dans quelles situations un professionnel de santé doit-il alerter ou référer un patient atteint de pied d'athlète?
  R: Lésions étendues/atypiques, récidives, onychomycose, diabète, surinfection suspectée, échec du traitement, femme enceinte, enfant < 12 ans.

---

# Mémofiche Mycose des Mains

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé cutanée | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un patient de 40 ans se présente au comptoir : « Bonjour, j'ai des plaques rouges qui démangent sur les mains, avec des petites fissures et la peau qui pèle. Que me conseillez-vous? »

### Aperçu Pathologie

-**Définition**
-Infection **cutanée** des mains causée par des **champignons** (dermatophytes ou levures)., -**Dermatophytes** (filamenteux, transmission par contact) ou **Candida albicans** (levure, infection opportuniste)., -**Symptômes**
-Rougeurs, démangeaisons intenses, desquamation, fissures, épaississement cutané.,
-Parfois vésicules, pustules, lésions entre les doigts, paume, dos de la main ; extension aux ongles possible., -**Facteurs risque**
-Humidité, port de gants, transpiration excessive, diabète, baisse de l'immunité, mauvaise hygiène., -**Voies de contamination** -**Auto-contamination** (souvent des pieds), contact **direct** interhumain, **objet souillés** (serviettes, tapis de salle de bain..)

### Questions Clés

- -Depuis quand avez-vous ces symptômes ?
- -Où sont localisées précisément les lésions ? Sont-elles sur une seule main ou les deux ?
- -Avez-vous des démangeaisons ? Sont-elles constantes ou intermittentes ?
- -Avez-vous des fissures, des suintements ou un aspect blanchâtre sur les zones atteintes ?
- -Avez-vous déjà eu ce genre de problème auparavant ?
- -Avez-vous des lésions similaires sur d'autres parties du corps, notamment les pieds ou les ongles ?
- -Exercez-vous une profession qui nécessite le port de gants ou un contact fréquent avec l'eau ?
- -Avez-vous d'autres problèmes de santé comme le diabète ou une baisse de l'immunité ?
- -Avez-vous utilisé un traitement auparavant ?

### Signaux d'Alerte (Red Flags)

- -Lésions **récidivantes**.
- -Mycose s'étendant aux **ongles** (onychomycose).
- -**Personne à risque**: femme enceinte, diabétique.
- -Suspicion de surinfection **bactérienne**.
- -Symptômes **persistent** ou **s'aggravent** sous traitement.
- -**Douleur** ou **gêne** perturbant la qualité de vie.
- -Apparition de **nouvelles lésions** pendant le traitement

### Traitement Principal

- -**Antifongique locaux**: les imidazolés
- -Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- -Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- -Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- -**Galénique**
- -Préférer les formes poudre/lotion pour les lésions suintantes et les crèmes pour les lésions sèches.
- -**Important**:
- -Respecter la durée complète même après amélioration pour éviter les rechutes.

### Produits Associés

- -**Nettoyant**
- -Gel à pH alcalin pour le lavage des mains.
- -Ex: Mycolin®
- -**Crème barrière**
- -Crème mains isolante cicatrisante
- -pour protéger la peau de l'eau et des irritants pour limiter le risque de rechutes
- -Ex: Uriage Bariederm®, Excipial P®

### Conseils Hygiène de Vie

- -Éviter l'humidité et la transpiration excessive.
- -Bien sécher les mains après la toilette ou le contact avec l'eau.
- -Utiliser des gants de protection lors de travaux manuels ou de contact avec l'eau/irritants ; les changer régulièrement.
- -Éviter de se gratter les lésions pour ne pas étendre l'infection.
- -Ne pas partager les serviettes et articles de toilette.
- -Laver régulièrement le linge de toilette et les vêtements à 60°C.

### Conseils Alimentaires

- -Adopter une alimentation équilibrée pour soutenir le système immunitaire.

### Traitement Principal (Rec)

- **Antifongique locaux**: les imidazolés
- - Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- - Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- - Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- **Galénique**
- - Préférer les formes poudre/lotion pour les lésions suintantes et les crèmes pour les lésions sèches.
- **Important**:
- - Respecter la durée complète même après amélioration pour éviter les rechutes.

### Produits Associés (Rec)

- **Nettoyant**
- Gel à pH alcalin pour le lavage des mains.
- Ex: Mycolin®
- **Crème barrière**
- - Crème mains isolante cicatrisante
- - pour protéger la peau de l'eau et des irritants pour limiter le risque de rechutes
- - Ex: Uriage Bariederm®, Excipial P®

### Conseils Hygiène de Vie (Rec)

- - Éviter l'humidité et la transpiration excessive.
- - Bien sécher les mains après la toilette ou le contact avec l'eau.
- - Utiliser des gants de protection lors de travaux manuels ou de contact avec l'eau/irritants ; les changer régulièrement.
- - Éviter de se gratter les lésions pour ne pas étendre l'infection.
- - Ne pas partager les serviettes et articles de toilette.
- Laver régulièrement le linge de toilette et les vêtements à 60°C.

### Conseils Alimentaires (Rec)

- - Adopter une alimentation équilibrée pour soutenir le système immunitaire.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quels sont les agents pathogènes les plus courants responsables de la mycose des mains ?
  R: Les dermatophytes (champignons filamenteux) et Candida albicans (levure).
- Q: Citez au moins trois facteurs favorisant une mycose des mains due à Candida albicans.
  R: Humidité, contact fréquent avec l'eau, et des facteurs locaux ou généraux comme le diabète ou une baisse de l'immunité.
- Q: Quels sont les symptômes typiques d'une mycose des mains mentionnés dans la mémofiche ?
  R: Rougeurs, démangeaisons intenses, desquamation, fissures, et épaississement cutané.
- Q: Comment peut se transmettre une mycose des mains ?
  R: Par auto-contamination (souvent depuis les pieds) ou par contact direct interhumain.
- Q: Quand un prélèvement mycologique est-il nécessaire pour le diagnostic d'une mycose des mains ?
  R: En cas de doute diagnostique, d'échec thérapeutique ou si une identification précise de l'agent pathogène est nécessaire.
- Q: Quelles sont les principales familles de molécules antifongiques locales utilisées pour traiter la mycose des mains ?
  R: Les imidazolés (éconazole), les allylamines (terbinafine) et les dérivés de pyridone (ciclopirox).
- Q: Quelle est la durée de traitement recommandée pour l'éconazole dans le cadre d'une mycose des mains ?
  R: Une application deux fois par jour pendant 2 à 3 semaines.
- Q: Pourquoi est-il crucial de respecter la durée totale du traitement antifongique, même après l'amélioration des symptômes ?
  R: Pour éviter les rechutes.
- Q: Dans quels cas un traitement antifongique oral est-il envisagé pour une mycose des mains ?
  R: En cas d'échec des traitements locaux ou de lésions étendues, et toujours sur prescription médicale.
- Q: Citez au moins trois signaux d'alerte qui nécessitent une consultation médicale pour une mycose des mains.
  R: Lésions récidivantes, extension aux ongles (onychomycose), patient diabétique, suspicion de surinfection bactérienne, ou persistance/aggravation des symptômes sous traitement.

---

# Mycose des Grands Plis: Mémofiche conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé cutanée | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une patiente de 50 ans s'est présentée à la pharmacie: "Bonjour, j’ai des rougeurs et ça me démange sous les seins. C’est très irritant et humide. Que me conseillez-vous?"

### Aperçu Pathologie

• - **Définition** Intertrigo:
• infection cutanée des grands plis (sous les seins, aine, aisselles, orteils).
• - **Mécanisme** Inflammation favorisée par macération, chaleur, humidité.
• - **Agents** Prolifération de champignons (Candida, dermatophytes) ou bactéries.
• - **Symptômes** Rougeurs, démangeaisons, sensations de brûlure.
• - **Signes associés** Fissures, suintements, dépôt blanchâtre malodorant, desquamation fine en périphérie.
• - **Facteurs de risque** Transpiration excessive, obésité, diabète.
• - **Autres facteurs** Mauvaise hygiène, immunosuppresseurs, antibiotiques.

### Questions Clés

- - Depuis quand ressentez-vous ces symptômes ?
- - Avez-vous déjà eu ce type de problème auparavant ?
- - Avez-vous remarqué des facteurs qui semblent aggraver la situation (chaleur, transpiration, activité physique) ?
- - Avez-vous d'autres symptômes, comme des fissures ou des suintements ?
- - Êtes-vous enceinte ou allaitez-vous ?
- - Prenez-vous des médicaments en ce moment ?
- - Avez-vous des problèmes de santé particuliers (diabète, immunodépression) ?

### Signaux d'Alerte (Red Flags)

- - Lésions étendues.
- - Lésions récidivantes.
- - Patient diabétique.
- - Suspicion de surinfection bactérienne.
- - Symptômes persistent ou s'aggravent sous traitement.
- - Femme enceinte.

### Traitement Principal

- **Antifongique locaux**: les imidazolés
- - Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- - Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- - Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- **Galénique**
- - Préférer les formes poudre/lotion pur limiter la macération
- **Important**:
- - Respecter la durée complète même après amélioration pour éviter les rechutes
- - Éviter l'utilisation de l'éosine aqueuse qui peut masquer l'évolution des lésions.

### Produits Associés

- **Gel nettoyant** pH alcalin
- - Ex: Mycolin
- **Lotion asséchante**
- - Appliquer pour absorber l'humidité, limiter la prolifération des champignons et favoriser la cicatrisation
- - Ex: Avène Cicalfate Lotion®

### Conseils Hygiène de Vie

- - Bien sécher la peau après la toilette, en particulier dans les plis.
- - Éviter les vêtements trop serrés ou synthétiques; préférer amples et en coton.
- - Maintenir une bonne hygiène corporelle, notamment au niveau des plis.
- - Utiliser une serviette propre et douce, et la changer quotidiennement.
- - Éviter l'humidité et la macération.
- - Laver les vêtements et le linge de toilette à 60°C.

### Conseils Alimentaires

- - Adopter une alimentation équilibrée pour renforcer le système immunitaire.

### Traitement Principal (Rec)

- **Antifongique locaux**: les imidazolés
- - Econazole\*\* 1 application 2x/jour pendant 2-3 semaines, ex: Ecorex®
- - Ciclopirox\*\* 1 application 2x/jour pendant 3 semaines, ex: Mycoster®
- - Appliquer le médicament sur les zones atteintes et leur périphérie, après avoir bien lavé et séché les pieds
- **Galénique**
- - Préférer les formes poudre/lotion pur limiter la macération
- **Important**:
- - Respecter la durée complète même après amélioration pour éviter les rechutes
- - Éviter l'utilisation de l'éosine aqueuse qui peut masquer l'évolution des lésions.

### Produits Associés (Rec)

- **Gel nettoyant** pH alcalin
- - Ex: Mycolin
- **Lotion asséchante**
- - Appliquer pour absorber l'humidité, limiter la prolifération des champignons et favoriser la cicatrisation
- - Ex: Avène Cicalfate Lotion®

### Conseils Hygiène de Vie (Rec)

- - Bien sécher la peau après la toilette, en particulier dans les plis.
- - Éviter les vêtements trop serrés ou synthétiques; préférer amples et en coton.
- - Maintenir une bonne hygiène corporelle, notamment au niveau des plis.
- - Utiliser une serviette propre et douce, et la changer quotidiennement.
- - Éviter l'humidité et la macération.
- - Laver les vêtements et le linge de toilette à 60°C.

### Conseils Alimentaires (Rec)

- - Adopter une alimentation équilibrée pour renforcer le système immunitaire.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que l'intertrigo?
  R: C'est une infection cutanée des grands plis du corps (sous les seins, aine, aisselles, orteils).
- Q: Quels sont les principaux agents pathogènes responsables de l'intertrigo mycosique?
  R: Des champignons, notamment Candida et dermatophytes. Des bactéries peuvent aussi être impliquées.
- Q: Quels sont les symptômes courants de l'intertrigo?
  R: Rougeurs, démangeaisons, sensations de brûlure.
- Q: Citez trois signes associés à l'intertrigo.
  R: Fissures, suintements, dépôt blanchâtre malodorant, desquamation fine en périphérie.
- Q: Quels sont les principaux facteurs de risque favorisant l'intertrigo?
  R: Transpiration excessive, obésité, diabète.
- Q: Quelles formes galéniques sont recommandées pour les lésions suintantes d'intertrigo?
  R: Les poudres ou lotions antifongiques locales.
- Q: Quelles formes galéniques sont recommandées pour les lésions sèches d'intertrigo?
  R: Les crèmes ou pommades antifongiques locales.
- Q: Citez deux classes de molécules antifongiques locales utilisées pour l'intertrigo.
  R: Les imidazolés (ex: éconazole) et les allylamines (ex: terbinafine).
- Q: Pourquoi est-il important de respecter la durée du traitement antifongique même si les symptômes s'améliorent?
  R: Pour éviter les récidives et assurer l'éradication complète de l'infection.
- Q: Dans quelles situations doit-on orienter un patient souffrant d'intertrigo vers un médecin pour un traitement oral?
  R: En cas d'échec du traitement local ou de lésions étendues.

---

# Mémofiche CAO : Rhinite Allergique

**Type:** ordonnances | **Thème:** Ordonnances | **Système:** ORL & Respiration | **Niveau:** Facile

### Ordonnance

- **Patient** Mme Fatma H., 28 ans.
- **Pathologie** Rhinite allergique saisonnière.
- **Prescription**
- - Fluticasone (spray nasal) : 1 pulvérisation dans chaque narine, 2 fois par jour.
- - Desloratadine 5 mg : 1 comprimé par jour.
- **Durée** Pendant toute la période d'exposition aux pollens.

### Analyse de l'Ordonnance

- **Analyse**
- La prescription est typique et efficace pour une rhinite allergique modérée à sévère, combinant un **corticostéroïde nasal** (Fluticasone) pour maîtriser l'inflammation sous-jacente et un **antihistaminique oral** (Desloratadine) pour un soulagement rapide des manifestations aiguës de l'allergie.
- **Profil patient**
- Mme H. est une jeune adulte pour qui la rhinite saisonnière peut fortement impacter la qualité de vie, notamment en causant des troubles du sommeil (ronflements, micro-réveils), menant à une fatigue diurne, une baisse de la concentration et de la productivité.
- **Découverte du patient**
- Il est pertinent de vérifier s'il s'agit:
- **première prescription**: afin d'expliquer la technique d'administration du spray et l'importance de l'observance
- **Un renouvellement**: pour évaluer l'efficacité et la tolérance du traitement précédent.

### Conseils Traitement

**Fluticasone: Corticostéroïde en spray nasal**:

- **Posologie**: 1 pulvérisation dans chaque narine, 2 fois par jour.
- **Technique**: Expliquer la technique d'administration correcte du spray nasal, surtout s'il s'agit d'une première prescription, pour garantir l'efficacité du traitement.
- **Observance**: Insister sur l'importance de l'observance pour maîtriser l'inflammation sous-jacente et prévenir la réapparition des symptômes, contrôlant ainsi la maladie sur le long terme. Informer le patient que l'effet du médicament apparaît au bout de 3 à 4 jours de traitement.
- **Évaluation**: Lors des renouvellements, évaluer l'efficacité du traitement et la tolérance pour ajuster si nécessaire.
  **Desloratadine 5 mg cp: Antihistaminique H1 de deuxième génération**:
- **Posologie**: 1 comprimé par jour.
- **Action rapide**: Ce traitement symptomatique vise un soulagement rapide des manifestations aiguës de l'allergie.
- **Observance**: Rappeler l'importance de la prise régulière pour un soulagement continu des symptômes.
- **Évaluation**: Lors des renouvellements, évaluer l'efficacité et la tolérance du traitement.

### Flashcards (Révision)

- Q: Qu'est-ce que la rhinite allergique?
  R: C'est une inflammation de la muqueuse nasale causée par une réaction immunitaire excessive à des allergènes inoffensifs pour la plupart des gens.
- Q: Quels sont les principaux symptômes de la rhinite allergique?
  R: Éternuements fréquents, écoulement nasal clair (rhinorrhée), démangeaisons nasales et oculaires, et congestion nasale.
- Q: Quelle est la différence entre rhinite saisonnière et perannuelle?
  R: La rhinite saisonnière est déclenchée par des allergènes saisonniers (ex: pollens), tandis que la rhinite perannuelle est causée par des allergènes présents toute l'année (ex: acariens, poils d'animaux).
- Q: Quels sont les traitements de première ligne pour la rhinite allergique modérée à sévère?
  R: Les corticostéroïdes nasaux sont généralement recommandés comme traitement de première ligne.
- Q: Comment agissent les antihistaminiques H1 de deuxième génération?
  R: Ils bloquent les récepteurs histaminiques, réduisant les symptômes comme les éternuements, les démangeaisons et la rhinorrhée, avec un risque de sédation réduit par rapport à la première génération.
- Q: Quels conseils donner à un patient pour réduire l'exposition aux allergènes?
  R: Éviter les allergènes connus, nettoyer régulièrement l'environnement, utiliser des housses anti-acariens, et maintenir les fenêtres fermées pendant les pics de pollen.
- Q: Quand faut-il orienter un patient vers un médecin pour sa rhinite allergique?
  R: Lorsque les symptômes sont persistants malgré les traitements en vente libre, en cas de suspicion d'asthme, d'otites fréquentes, pour les enfants de moins de 6 ans, ou en cas de grossesse.
- Q: Quels sont les effets secondaires courants des corticostéroïdes nasaux?
  R: Sécheresse nasale, irritation, et parfois des saignements de nez (épistaxis).
- Q: Quelle est l'importance de l'observance du traitement pour les corticostéroïdes nasaux?
  R: Ils nécessitent une utilisation régulière et peuvent prendre plusieurs jours pour atteindre leur plein effet thérapeutique, d'où l'importance de la persévérance du patient.
- Q: Quels compléments alimentaires peut-on conseiller chez un asthmatique?
  R: La Quercétine, la Vitamine C, Les Probiotiques et le Magnésium sont les complémentas alimentaires de choix à conseiller chez un asthmatique.

---

# Mémofiche CAO : (ITA) ImmunoThérapie Allergénique

**Type:** ordonnances | **Thème:** Ordonnances | **Système:** ORL & Respiration | **Niveau:** Facile

### Ordonnance

- - **Patient** : Mme Fatma H., 28 ans.
- - **Pathologie** : Rhinite allergique saisonnière.
- - **Prescription 1** : STALORAL DPT/DF ® (Montée de doses) - 1 Coffret 10-100-300 IR.
- - **Prescription 2** : STALORAL DPT/DF 300 IR ® - 4 pressions par jour - 7 Flacons (3 mois).

### Analyse de l'Ordonnance

- - **-Profil patient** : Vérifier les médicaments prescrits et les antécédents médicaux (pathologies, traitements en cours, automédication) pour identifier d'éventuelles contre-indications ou interactions médicamenteuses.
- - **-Première prescription** : Clarifier s'il s'agit d'une initiation de traitement ou d'un renouvellement pour adapter les conseils.
- - **-Motif de consultation** : Comprendre pourquoi le médecin a prescrit ce traitement afin de personnaliser les conseils.
- - **-Objectifs du traitement** : L'Immunothérapie Allergénique (ITA) cible la cause sous-jacente de l'allergie, contrairement aux traitements symptomatiques.
- - **-Indication** : L'ITA est prescrite lorsque les traitements classiques ne sont pas suffisamment efficaces ou entraînent des effets indésirables inacceptables.
- - **.STALORAL DPT/DF® 10-100-300 IR** : Ce coffret est destiné à la phase d'initiation avec des doses progressives.
- - **.STALORAL DPT/DF® 300 IR** : Ce flacon est utilisé pour la phase d'entretien, à dose constante (4 pressions par jour).
- - **-Durée du traitement** : La durée recommandée est d'environ 3 ans, sous réserve d'efficacité observée.

### Conseils Traitement

**STALORAL DPT/DF 10-100-300 IR**:

- - **Phase d'initiation** : Le coffret contient des flacons à doses croissantes (10, 100, 300 IR). Suivre rigoureusement le schéma posologique indiqué par le médecin pour une augmentation progressive des doses.
- - **Administration** : Déposer la solution directement sous la langue et la maintenir pendant 2 minutes avant de l'avaler.
- - **Moment de prise** : Prendre le traitement de préférence pendant la journée, en dehors des repas et boissons.
- - **Conservation** : Conserver le flacon au réfrigérateur, de préférence dans la partie la plus froide.
- - **Effets indésirables** : Des démangeaisons importantes (paumes des mains, plantes des pieds), une urticaire, un gonflement de la bouche et/ou de la muqueuse, une sensation d'étouffement, une gêne respiratoire, une difficulté à avaler ou une modification de la voix peuvent survenir.
- - **Conduite à tenir** : Ces symptômes peuvent apparaître dans les heures suivant l'administration. En cas de survenue, contacter immédiatement un médecin.
- - **Dose oubliée** : Ne jamais prendre une dose double pour compenser un oubli.
    **STALORAL DPT/DF 300 IR**:
- - **Phase d'entretien** : La dose quotidienne recommandée est de 300 IR, correspondant à 4 pressions par jour.
- - **Durée du traitement** : La durée recommandée est en moyenne de 3 ans, si une efficacité est observée.
- - **Préparation de la pompe** : Retirer la partie en plastique colorée, tirer la languette métallique pour enlever la capsule en aluminium, puis le bouchon gris. Encliqueter fermement la pompe sur le flacon.
- - **Amorçage de la pompe** : Retirer l'anneau de sécurité violet et amorcer la pompe en appuyant à fond 4 à 5 fois avant la première utilisation.
- - **Administration** : Positionner l'embout sous la langue. Appuyer à fond sur la pompe pour chaque pression prescrite. Garder la solution sous la langue pendant 2 minutes avant d'avaler.
- - **Hygiène** : Essuyer l'embout après chaque utilisation et remettre l'anneau de sécurité.
- - **Moment de prise** : Prendre le traitement de préférence pendant la journée, en dehors des repas et boissons.
- - **Conservation** : Conserver le flacon au réfrigérateur. Le produit est stable à température ambiante pendant 72 heures, mais la conservation au froid est préférable pour une efficacité optimale.
- - **Effets indésirables** : Des démangeaisons importantes (paumes des mains, plantes des pieds), une urticaire, un gonflement de la bouche et/ou de la muqueuse, une sensation d'étouffement, une gêne respiratoire, une difficulté à avaler ou une modification de la voix peuvent survenir.
- - **Conduite à tenir** : En cas de survenue de ces symptômes, contacter immédiatement un médecin.
- - **Dose oubliée** : Ne jamais prendre une dose double pour compenser un oubli.
- - **Asthme non contrôlé** : L'asthme non contrôlé est une contre-indication à l'ITA. L'ITA ne doit jamais être prise pendant une crise d'asthme.
- - **Observance** : L'administration quotidienne et le respect du traitement sont essentiels pour son succès.

### Flashcards (Révision)

- Q: Quel est le principe de l'Immunothérapie Allergénique (ITA) ?
  R: L'ITA vise à modifier la réponse immunitaire du patient face à un allergène en administrant des doses croissantes de cet allergène, afin de réduire les symptômes allergiques et la nécessité de médicaments.
- Q: Quels sont les principaux types d'allergènes ciblés par l'ITA ?
  R: Les allergènes les plus couramment ciblés par l'ITA sont les pollens (graminées, arbres), les acariens, les venins d'hyménoptères et les phanères d'animaux.
- Q: Quelles sont les deux principales voies d'administration de l'ITA ?
  R: Les deux principales voies sont la voie sous-cutanée (ITA-SC ou SCIT) et la voie sublinguale (ITA-SL ou SLIT).
- Q: Quelle est la durée moyenne d'un traitement par ITA ?
  R: La durée habituelle d'un traitement par ITA est de 3 à 5 ans, afin d'induire une tolérance immunologique durable.
- Q: Quels sont les effets indésirables les plus fréquents de l'ITA sous-cutanée (SCIT) ?
  R: Les effets indésirables les plus fréquents sont des réactions locales au site d'injection (rougeur, gonflement, démangeaisons). Des réactions systémiques (urticaire, rhinite, asthme, voire anaphylaxie) sont possibles mais plus rares.
- Q: Quel est l'objectif principal de l'ITA ?
  R: L'objectif principal est d'induire une tolérance immunologique spécifique à l'allergène, réduisant ainsi la sévérité des symptômes allergiques et l'utilisation de traitements symptomatiques.
- Q: Quand l'ITA est-elle généralement indiquée ?
  R: L'ITA est indiquée pour les patients souffrant de rhinite, conjonctivite ou asthme allergiques (IgE-médiés) pour lesquels les traitements symptomatiques ne sont pas suffisants ou pour les allergies aux venins d'hyménoptères.
- Q: Un pharmacien peut-il initier une ITA ?
  R: Non, l'ITA doit être prescrite et initiée par un médecin, souvent un allergologue, après un diagnostic précis de l'allergie.
- Q: Quelles sont les contre-indications majeures à l'ITA ?
  R: Les contre-indications incluent l'asthme sévère et non contrôlé, certaines maladies auto-immunes, les néoplasies évolutives et les maladies cardiovasculaires sous bétabloquants.
- Q: Quelle est l'importance de la compliance du patient durant l'ITA ?
  R: La compliance est cruciale pour le succès du traitement. Une interruption prématurée ou une administration irrégulière peut compromettre l'efficacité de l'ITA.

---

# L'Accueil Optimal à l'Officine

**Type:** communication | **Thème:** Communication | **Système:** N/A | **Niveau:** Facile

> Synthèse des meilleures pratiques pour un accueil performant en pharmacie, abordant la communication verbale et non verbale, l'impact de la voix et l'environnement pour une relation client durable.

### Situation Patient / Cas Comptoir

• Un client entre dans l'officine, l'air un peu perdu ou pressé. Il observe l'équipe, peut-être avec une ordonnance à la main, ou juste pour un conseil. Il est crucial que dès son entrée, il se sente vu, reconnu et pris en charge, sans même avoir prononcé un mot. Comment l'équipe s'assure-t-elle qu'il soit instantanément mis en confiance et encouragé à exprimer son besoin, même si elle est déjà en contact avec un autre patient ?

### L'Importance Cruciale de la Première Impression (Custom)

- L'**accueil** est la première et la plus courte étape de la relation client en officine, mais elle est d'une importance capitale car elle 'augure déjà de ce que sera la relation client'.
- Les pharmaciens et leur équipe disposent d'environ 20 secondes pour réussir cette première impression. Un accueil de qualité fait que le client se sent 'reconnu et bienvenu', et il est un facteur clé dans le choix d'une officine (15% des motivations). Il est essentiel de montrer d'emblée l'importance accordée à la dimension humaine.

### L'Accueil à Distance Publique : La Première Connexion Non Verbale (Custom)

- Dès l'entrée du client, la première interaction est non verbale et doit établir un climat de confiance. Il est impératif de regarder le client et de lui sourire dès qu'il entre. Ce geste simple est 'nécessaire et suffisant pour que votre client se sente en confiance, reconnu et ait envie de rester'. Adoptez des gestes d'ouverture (regard franc, sourire, paumes et mains ouvertes). Évitez les 'gestes de fermeture' (bras croisés, mains dans les poches ou derrière le dos, doigt pointé) ou un 'visage fermé sans sourire et un regard fuyant ou concentré sur l'ordinateur'. Restez attentif dès l'entrée pour éviter que le client ne se sente ignoré.

### L'Accueil Verbal et la Personnalisation (Custom)

- L'engagement verbal doit être réfléchi et adapté pour montrer disponibilité et respect.
- N'engagez la conversation que lorsque vous êtes entièrement disponible pour le client. Utilisez des mots valorisants et exprimez votre disponibilité. La formule clé est 'Bonjour'. Si vous connaissez le client, utilisez son nom, en particulier pour les seniors, mais toujours 'à distance intime et surtout pas à la cantonade'. Privilégiez des phrases comme 'Quel renseignement puis-je vous donner ?', 'En quoi puis-je vous être utile ?' ou 'Bienvenue dans notre officine, comment puis-je vous aider aujourd'hui ?'. Évitez les expressions impersonnelles comme 'C'est à qui ?' ou 'Comment allez-vous ?'.

### La Communication Non Verbale : L'Impact de la Gestuelle (Custom)

La gestuelle de l'équipe est cruciale pour transmettre une image dynamique, accueillante et accessible. Il est recommandé de 'sortir de derrière son comptoir et de se déplacer dans l'espace de vente' pour montrer une disponibilité active. Adaptez toujours votre gestuelle à la situation, en maintenant une distance appropriée. Soyez proactif et attentif aux besoins des clients. Des gestes simples comme tenir la porte pour une personne âgée ou une maman avec un bébé démontrent une attitude positive, attentive et proactive.

### Le Rôle Essentiel de la Voix dans l'Accueil (Custom)

Le ton, le volume et l'intonation de la voix influencent grandement la perception du message et l'établissement de la relation. Adaptez le ton et le volume de votre voix au sujet abordé (ex : éviter de parler fort d'un sujet délicat). Cherchez à synchroniser le ton de votre voix avec celui du client. Idéalement, cette synchronisation verbale doit être accompagnée d'une synchronisation gestuelle. Savoir se taire et utiliser des silences est aussi important que de parler. En théorie, 90% du temps de parole devrait revenir au client et seulement 10% au vendeur. L'intonation 'porte des éléments affectifs et émotionnels' et doit être gérée avec soin.

### L'Environnement de l'Officine : Un Acteur Silencieux de l'Accueil (Custom)

L'apparence physique de l'officine joue un rôle non négligeable dans l'accueil et l'image globale perçue par le client. La propreté et l'agencement de l'espace de vente sont des éléments clés qui influencent la perception du client et contribuent à ce qu'il se sente 'reconnu et bienvenu'. Un environnement agréable et organisé renforce le sentiment de confiance et de professionnalisme.

### Conclusion : L'Accueil, Starter de la Vente et de la Fidélisation (Custom)

- L'accueil en officine est un processus bref mais fondamental.
- Il s'agit d'une synergie efficace entre la communication non verbale (regard, sourire, gestes ouverts), la communication verbale (formules de politesse personnalisées, questions ouvertes) et une gestion adéquate du ton de la voix.
  Un accueil réussi est le 'starter de la vente' : il sécurise, touche, apprivoise et rassure le client/patient, posant ainsi une base solide pour la relation client, la confiance et, in fine, la fidélisation. C'est l'investissement le plus rentable pour une officine performante.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est l'objectif principal de l'accueil optimal en officine ?
  R: Renforcer la relation client et la fidélisation.
- Q: Quelle est la première sensation qu'un client doit éprouver en entrant dans l'officine, avant même de parler ?
  R: Se sentir vu, reconnu et pris en charge.
- Q: Pourquoi est-il crucial de mettre un client en confiance dès son entrée ?
  R: Pour l'encourager à exprimer son besoin.
- Q: Que doit faire l'équipe si elle est déjà en contact avec un autre patient lorsqu'un nouveau client arrive ?
  R: S'assurer que le nouveau client se sente instantanément pris en charge, même par un signe non verbal.
- Q: Quel est le rôle de l'accueil dans la fidélisation client en pharmacie ?
  R: Un accueil optimal est une clé pour établir une relation de confiance et encourager le client à revenir.
- Q: Comment un client 'perdu ou pressé' doit-il être abordé initialement ?
  R: Avec une approche qui reconnaît son état et le rassure rapidement.
- Q: L'accueil optimal concerne-t-il uniquement les clients avec une ordonnance ?
  R: Non, il concerne tous les clients, qu'ils aient une ordonnance, besoin d'un conseil ou autre.
- Q: Quelle est l'importance du contact visuel dès l'arrivée d'un client ?
  R: Il permet de signifier au client qu'il a été remarqué et qu'il sera pris en charge.
- Q: Que signifie 'être pris en charge' sans avoir prononcé un mot, dans le contexte de l'officine ?
  R: Recevoir un signal non verbal de l'équipe indiquant que l'on s'occupe de lui prochainement (ex: un sourire, un hochement de tête).
- Q: En quoi l'attitude de l'équipe influe-t-elle sur l'expression du besoin du client ?
  R: Une attitude accueillante et rassurante encourage le client à se sentir suffisamment en confiance pour exprimer clairement son besoin.

---

# Mémofiche CAO: Asthme

**Type:** ordonnances | **Thème:** Ordonnances | **Système:** ORL & Respiration | **Niveau:** Facile

### Ordonnance

- - **Traitement de fond** Symbicort Turbuhaler ®400 (1 inhalation matin et soir) + Onceair 10 mg (1 comprimé le soir).
- - **Traitement d'appoint** Solupred® 20 mg (1 comprimé le matin pendant 5 jours).
- - **Traitement de secours** Aerol® spray (2 bouffées si besoin).

### Analyse de l'Ordonnance

- **Contexte Probable**: La présence d'une cure courte de corticoïde oral (Solupred) suggère une exacerbation d'asthme, probablement un ajustement thérapeutique pour un asthme persistant mal contrôlé.
- - **Logique Thérapeutique**: La prescription est cohérente et suit les recommandations actuelles pour l'asthme.
- - **Points de Vigilance**: Aucune interaction médicamenteuse majeure entre ces produits. La vigilance portera sur les antécédents du patient et la bonne compréhension des différents rôles de chaque médicament.
- - **Primo-délivrance**: Le conseil doit se concentrer sur la maladie, les objectifs du traitement, la manipulation correcte des dispositifs et la distinction cruciale entre traitement de crise et traitement de fond.
- - **Renouvellement**: Évaluer l'observance du patient, le contrôle de la maladie (fréquence d'utilisation du traitement de secours), la bonne utilisation des dispositifs et la recherche d'éventuels effets indésirables.
- - **Profil du Patient**: Rechercher des antécédents de reflux gastro-œsophagien (RGO) ou de pathologies cardiovasculaires.
- - **Traitements en Cours**: Une vigilance absolue est requise concernant les bêtabloquants (même en collyre), car ils sont contre-indiqués et peuvent provoquer un bronchospasme.

### Conseils Traitement

**Symbicort Turbuhaler 400**:

- **Rôle** C'est votre traitement de fond. Il traite l'inflammation de vos bronches et doit être pris tous les jours, même si vous vous sentez bien, pour prévenir les crises.
- **Administration** Armer le dispositif, expirer loin du Turbuhaler, inspirer à fond et retenir sa respiration. Se rincer la bouche à l'eau après chaque utilisation pour éviter les mycoses buccales.
- **Effets Possibles** Raucité de la voix, candidose buccale (risque minimisé par le rinçage).
  **Onceair 10 mg (Montelukast)**:
- **Rôle** Ce médicament est un traitement de fond complémentaire qui agit sur une autre voie de l'inflammation, souvent lié à l'allergie, renforçant le contrôle de votre asthme.
- **Administration** Un comprimé à prendre chaque jour, généralement le soir.
- **Effets Possibles** Rares troubles de l'humeur ou du sommeil sont à surveiller.
  **Solupred 20 mg (Prednisone)**:
- **Rôle** C'est un traitement puissant et
- rapide pour éteindre l'inflammation sévère associée à la crise d'asthme que vous venez de faire.
- **Administration** Un comprimé le matin pendant le repas, uniquement pour la durée prescrite (généralement 5 jours). Respectez scrupuleusement la durée courte de la prescription.
- **Effets Possibles** Sur une courte durée, des troubles du sommeil, une excitation ou des troubles digestifs peuvent survenir.
  **Aerol spray (Salbutamol)**:
- **Rôle** C'est votre traitement de secours. Il sert à vous soulager immédiatement si vous avez du mal à respirer en cas de crise.
- **Administration** Agiter le spray, expirer, puis inspirer lentement et profondément en même temps que l'on appuie sur le dispositif. L'utilisation d'une chambre d'inhalation est suggérée, surtout si vous avez des difficultés de coordination.
- **Signe d'Alerte** Une utilisation fréquente de ce traitement est un signal que votre asthme n'est pas bien contrôlé; il est important de revoir votre médecin.
- **Effets Possibles** Des palpitations ou de légers tremblements peuvent survenir, ils sont généralement transitoires.

### Flashcards (Révision)

- Q: Qu'est-ce que l'asthme?
  R: Une maladie inflammatoire chronique des voies respiratoires, caractérisée par une hyperréactivité bronchique et une obstruction réversible des bronches.
- Q: Quel est le rôle principal du pharmacien dans le conseil aux patients asthmatiques?
  R: Éduquer sur l'utilisation correcte des inhalateurs, l'observance du traitement, et la reconnaissance des signes d'alerte.
- Q: Quels sont les deux types de médicaments utilisés dans le traitement de l'asthme?
  R: Les traitements de fond (contrôleurs) et les traitements de crise (bronchodilatateurs de secours).
- Q: À quoi sert un bronchodilatateur de courte durée d'action (BDCA)?
  R: À soulager rapidement les symptômes de la crise d'asthme en dilatant les bronches.
- Q: Quand un corticoïde inhalé (CSI) est-il généralement prescrit?
  R: En traitement de fond pour réduire l'inflammation bronchique et prévenir les crises.
- Q: Quelle est l'importance de la chambre d'inhalation?
  R: Elle optimise le dépôt du médicament dans les poumons, réduisant les effets secondaires systémiques et facilitant l'inhalation pour certains patients.
- Q: Citez un signal d'alerte indiquant une aggravation de l'asthme.
  R: Augmentation de la fréquence d'utilisation du bronchodilatateur de secours, essoufflement croissant, toux nocturne persistante.
- Q: Comment le pharmacien peut-il vérifier l'observance du traitement chez un patient asthmatique?
  R: En discutant de la régularité des prises, en vérifiant les dates de renouvellement et l'utilisation des dispositifs.
- Q: Qu'est-ce qu'un plan d'action personnalisé pour l'asthme?
  R: Un document élaboré avec le médecin qui guide le patient sur la gestion de son asthme au quotidien et en cas de crise.
- Q: Quels sont les facteurs déclenchants courants de l'asthme?
  R: Allergènes (pollen, acariens), irritants (fumée, pollution), infections respiratoires, exercice physique, stress.

---

# Fiche conseil : Onychomycoses (Demande spontanée)

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Santé cutanée | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Un patient de 40 ans s’est présenté à la pharmacie: Bonjour, j'ai remarqué que mon ongle d'orteils a changé d'aspect. Il est épais, jauni, et se casse facilement. Que me conseillez-vous ?"

### Aperçu Pathologie

• - **Définition**:
• Infection fongique de l'ongle, principalement des dermatophytes, levures (Candida) ou moisissures.
• - **Symptômes**:
• Ongle épaissi, jauni/décoloré, décollé, friable, parfois avec des taches blanches.
• - **Facteurs favorisants**:
• Humidité, chaleur, macération, microtraumatismes, âge avancé.
• - **Conditions associées**:
• Diabète, immunodépression, troubles circulatoires, psoriasis.
• - **Lieux à risque**:
• Piscines, douches collectives, gymnases.
• - **Transmission**:
• Contact direct (peau à peau) ou indirect (objets, surfaces contaminées).
• - **Contagiosité**:
• L'infection est contagieuse et auto-inoculable.

### Questions Clés

- -Depuis quand observez-vous ces changements sur votre ongle?
- -Avez-vous des démangeaisons, des rougeurs ou des fissures entre les orteils?
- -Avez-vous déjà essayé un traitement pour cette condition?
- -Souffrez-vous de diabète, de troubles circulatoires ou d'une immunodépression?
- -Pratiquez-vous des sports (natation, course) ou des activités favorisant la macération des pieds?
- -Portez-vous des chaussures non aérées ou de sécurité?
- -D'autres personnes de votre entourage présentent-elles des symptômes similaires?
- -D'autres ongles sont-ils affectés?

### Signaux d'Alerte (Red Flags)

- -Plus de deux ongles atteints ou atteinte de la base de l'ongle (matrice)
- -Ongle très épaissi ou décollé.
- -Comorbidités: Diabète, immunodépression, troubles circulatoires.
- -Absence d'amélioration après 3 mois de traitement local.
- -Douleur importante ou suspicion de surinfection bactérienne.
- -Femme enceinte ou allaitante
- -Onychomycose chez l'enfant.

### Traitement Principal

- -**Vernis antifongiques**:
- -**Produits Conseil**: **ciclopirox** (Mycoster 8%®)
- -Les vernis à base de ciclopirox sont utilisés quotidiennement.
- -Il faut appliquer une couche fine de vernis à base de ciclopirox (Mycoster) sur toute la surface de l’ongle infecté chaque jour, de préférence le soir.
- -Une fois par semaine, limer et couper l’ongle pour éliminer le plus possible de bouts d’ongle infecté puis utiliser un dissolvant afin d'enlever la couche filmogène.
- -**Produits Prescrits**: **amorolfine** (Locéryl®).
- -Ces vernis doivent être appliqués **une à deux fois par semaine**.
- -Il faut appliquer une couche fine de vernis sur toute la surface de l’ongle infecté, de préférence le soir.
- -Une fois par semaine, limer et couper l’ongle pour éliminer le plus possible de bouts d’ongle infecté puis utiliser un dissolvant afin d'enlever la couche filmogène.
- -**Attention!!** Il faut nettoyer les résidus de limage de l’ongle. (ils peuvent causer l’infestation d’un autre ongle ou bien les plis interdigitaux)
- -**Hygiène des outils**: Nettoyer et désinfecter les limes et spatules après chaque utilisation, ou les jeter si jetables, pour éviter l'auto-contamination.
- -**Durée**: Poursuivre le traitement sur plusieurs mois (jusqu'à repousse complète d'un ongle sain) en respectant scrupuleusement la posologie.

### Produits Associés

- -**Kératolytiques (urée 40%)**:
- -Pour ramollir et éliminer l'ongle épaissi, facilitant la pénétration des antifongiques.
- -Application quotidienne sous pansement occlusif.
- -ex: SVR Xerial 40® ongles
- -**Poudres antifongiques**:
- -Pour décontaminer chaussures et chaussettes (ex: éconazole), à appliquer 2-3 fois/semaine.
- -**Huiles essentielles**:
- -Arbre à thé ou Lavande, utilisées sous forme de bain de pieds diluées avec du bicarbonate de soude.
- -**Bicarbonate de soude**:
- -Pour alcaliniser le milieu et limiter la prolifération fongique dans les bains de pieds.
- -**Gels nettoyants à pH alcalin**:
- -Pour la toilette quotidienne des pieds
- -ex: Mycolin®, Dermacare pH8®
- -**Anti-transpirants**:
- -En cas de transpiration excessive des pieds
- -ex: Etiaxil®, SVR Spirial®

### Conseils Hygiène de Vie

- -Toujours **sécher minutieusement** les pieds après la douche ou le bain, en insistant entre les orteils
- -Porter des **chaussures aérées**. Alterner les paires de chaussures pour les laisser sécher.
- -Changer de chaussettes tous les jours, **privilégier le coton** et les laver à **60°C**.
- -Ne jamais marcher pieds nus dans les lieux publics (piscines, vestiaires, douches communes)
- -Décontaminer régulièrement les chaussures avec des poudres ou sprays antifongiques et poudrer les chaussettes avant de les enfiler.
- - Utiliser des **serviettes individuelles** pour les pieds, les laver à 60°C. Éviter de partager serviettes, chaussures et chaussons.
- -Couper les **ongles courts** et **désinfecter le matériel** de pédicurie (ciseaux, limes) à l'alcool après chaque utilisation.
- -Nettoyer fréquemment les sols de la salle de bain et aspirer tapis/moquettes **pour éliminer les spores**.
- -Laver les pieds quotidiennement avec **un savon doux à pH alcalin**.
- -Éviter de manipuler les lésions sans se laver soigneusement les mains après tout contact.
- -Traiter **systématiquement tout intertrigo** pour prévenir les récidives de l'onychomycose.
- -Éviter les vernis colorés et les faux ongles pendant la durée du traitement.

### Conseils Alimentaires

- Aucune recommandation alimentaire spécifique n'est établie pour l'onychomycose.

### Traitement Principal (Rec)

- - **Vernis antifongiques**:
- **Produits Conseil**: vernis antifongiques à base de **ciclopirox** (Mycoster 8%)
- -Les vernis à base de ciclopirox sont utilisés quotidiennement.
- -Il faut appliquer une couche fine de vernis à base de ciclopirox (Mycoster) sur toute la surface de l’ongle infecté chaque jour, de préférence le soir.
- -Une fois par semaine, limer et couper l’ongle pour éliminer le plus possible de bouts d’ongle infecté puis utiliser un dissolvant afin d'enlever la couche filmogène.
- **Produits Prescrits**: vernis antifongiques à base d’**amorolfine** (Locéryl).
- Ces vernis doivent être appliqués **une à deux fois par semaine**.
- Il faut appliquer une couche fine de vernis sur toute la surface de l’ongle infecté, de préférence le soir.
- Une fois par semaine, limer et couper l’ongle pour éliminer le plus possible de bouts d’ongle infecté puis utiliser un dissolvant afin d'enlever la couche filmogène.
- **Attention!!** Il faut nettoyer les résidus de limage de l’ongle. (ils peuvent causer l’infestation d’un autre ongle ou bien les plis interdigitaux)
- - **Hygiène des outils**: Nettoyer et désinfecter les limes et spatules après chaque utilisation, ou les jeter si jetables, pour éviter l'auto-contamination.
- - **Durée**: Poursuivre le traitement sur plusieurs mois (jusqu'à repousse complète d'un ongle sain) en respectant scrupuleusement la posologie.
- - **Restrictions**: Éviter les vernis colorés et les faux ongles pendant la durée du traitement.

### Produits Associés (Rec)

- - **Kératolytiques (urée 40%)**:
- Pour ramollir et éliminer l'ongle épaissi, facilitant la pénétration des antifongiques.
- Application quotidienne sous pansement occlusif.
- ex: SVR Xerial 40 ongles
- - **Poudres antifongiques**:
- Pour décontaminer chaussures et chaussettes (ex: éconazole), à appliquer 2-3 fois/semaine.
- - **Huiles essentielles**:
- Arbre à thé ou Lavande, utilisées sous forme de bain de pieds diluées avec du bicarbonate de soude.
- - **Bicarbonate de soude**:
- Pour alcaliniser le milieu et limiter la prolifération fongique dans les bains de pieds.
- - **Gels nettoyants à pH alcalin**:
- Pour la toilette quotidienne des pieds
- ex: Mycolin, Dermacare pH8
- - **Anti-transpirants**:
- En cas de transpiration excessive des pieds
- ex: Etiaxil, SVR Spirial

### Conseils Hygiène de Vie (Rec)

- -Toujours **sécher minutieusement** les pieds après la douche ou le bain, en insistant entre les orteils. Une lotion asséchante peut être utile.
- -Porter des **chaussures aérées**, éviter les chaussures serrées et en matières synthétiques. Alterner les paires de chaussures pour les laisser sécher.
- -Changer de chaussettes tous les jours, **privilégier le coton** et les laver à **60°C**.
- -Ne jamais marcher pieds nus dans les lieux publics (piscines, vestiaires, douches communes) et utiliser des chaussons en caoutchouc.
- -Décontaminer régulièrement les chaussures avec des poudres ou sprays antifongiques et poudrer les chaussettes avant de les enfiler.
- - Utiliser des **serviettes individuelles** pour les pieds, les laver à 60°C. Éviter de partager serviettes, chaussures et chaussons.
- -Couper les **ongles courts** et **désinfecter le matériel** de pédicurie (ciseaux, limes) à l'alcool après chaque utilisation.
- -Nettoyer fréquemment les sols de la salle de bain et aspirer tapis/moquettes **pour éliminer les spores**.
- -Laver les pieds quotidiennement avec **un savon doux à pH alcalin**.
- -Éviter de manipuler les lésions sans se laver soigneusement les mains après tout contact.
- -Traiter **systématiquement tout intertrigo** associé (ex: pied d'athlète) pour prévenir les récidives de l'onychomycose.

### Conseils Alimentaires (Rec)

- Aucune recommandation alimentaire spécifique n'est établie pour l'onychomycose.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que l'onychomycose?
  R: Une infection fongique de l'ongle, principalement causée par des dermatophytes, levures (Candida) ou moisissures.
- Q: Quels sont les principaux symptômes d'une onychomycose?
  R: Ongle épaissi, jauni/décoloré, décollé, friable, parfois avec des taches blanches.
- Q: Citez deux facteurs favorisant le développement d'une onychomycose.
  R: Humidité, chaleur, macération, microtraumatismes, âge avancé (deux au choix).
- Q: Quelles conditions associées nécessitent une vigilance particulière en cas d'onychomycose?
  R: Diabète, immunodépression, troubles circulatoires, psoriasis.
- Q: Quels sont les deux principes actifs de vernis antifongiques mentionnés pour le traitement des onychomycoses?
  R: Ciclopirox et Amorolfine.
- Q: Quelle est la fréquence d'application recommandée pour un vernis à base de ciclopirox?
  R: Quotidienne.
- Q: Quelle est la fréquence d'application recommandée pour un vernis à base d'amorolfine?
  R: 1 à 2 fois par semaine.
- Q: Quelles sont les étapes clés pour préparer l'ongle avant chaque application de vernis antifongique?
  R: Limer et couper l'ongle pour éliminer la partie infectée, puis utiliser un dissolvant pour retirer les couches précédentes.
- Q: Combien de temps dure généralement le traitement d'une onychomycose?
  R: Plusieurs mois, jusqu'à la repousse complète d'un ongle sain.
- Q: Quelles sont les restrictions concernant les produits cosmétiques pour les ongles pendant le traitement d'une onychomycose?
  R: Éviter les vernis colorés et les faux ongles.

---

# La Découverte du Client à l'officine: Les Clés d'une Communication Efficace

**Type:** communication | **Thème:** Communication | **Système:** N/A | **Niveau:** Facile

> Guide pratique pour les professionnels de la pharmacie sur les techniques de découverte des besoins et motivations des clients, afin d'optimiser le conseil et la vente.

### Situation Patient / Cas Comptoir

• Un patient se présente au comptoir et demande "quelque chose pour sa peau sèche". Face à cette demande initiale vague, le professionnel doit initier une découverte structurée pour comprendre l'étendue de la sécheresse, les zones concernées, les éventuels inconforts (démangeaisons, tiraillements), les produits déjà utilisés, le budget, et les attentes spécifiques du patient (rapidité d'action, texture, composition naturelle). Cette démarche permet de passer d'une demande générique à un conseil personnalisé et pertinent.

### Les Fondamentaux de la Découverte Client (Custom)

- **Objectif**: Cerner précisément les besoins et attentes du client pour un conseil adapté.
- **Démarche**: Mener une "enquête" rapide et rigoureuse pour consolider l'information en quelques minutes.
- **Clés**: Utiliser le questionnement, l'écoute active et la reformulation comme outils principaux.

### Le Questionnement Efficace : La Méthode de l'Entonnoir (Custom)

- **Principe**: Succession chronologique de questions pour baliser l'interrogatoire et affiner la demande.
- **Question Ouverte**: Pour initier le dialogue et inviter le client à s'exprimer librement ("Que puis-je pour vous ?").
- **Question Ricochet**: Pour rebondir sur les propos du client et obtenir plus de détails sur ses besoins réels.
- **Question Miroir**: Pour reprendre un mot ou une phrase du client et l'encourager à poursuivre son explication.
- **Question Fermée**: À utiliser avec précaution pour obtenir des réponses précises ("oui/non"), mais limite le dialogue.
- **Question Alternative**: Pour orienter le client en lui proposant des choix et mieux cerner ses préférences.
- **Exploration**: Questionner sur l'effet recherché, la facilité d'utilisation, la sécurité, le confort, le prix ou les réticences.

### Écoute Active et Reformulation : Piliers de la Compréhension (Custom)

- **Écoute Active**: Indispensable pour identifier les attentes du client sans l'interrompre, en lui laissant la parole.
- **Concentration**: Se concentrer totalement, sans distractions, pour accumuler les informations nécessaires et montrer son écoute.
- **Reformulation**: Primordiale pour s'assurer d'avoir bien compris la demande du client ("Si je vous comprends bien...").
- **Validation**: Le client doit acquiescer si la reformulation est correcte, se sentant écouté et compris.
- **Précision**: La reformulation précise et consolide l'information, assurant une bonne transmission du message.

### Comprendre les Motivations d'Achat : La Méthode SONCAS (Custom)

- **Motivation**: Essentiel de comprendre "pourquoi" le client souhaite cet achat pour orienter l'argumentation.
- **SONCAS**: Méthode balayant les principaux mobiles d'achat pour détecter les plus sensibles et choisir les arguments clés.
- **S (Sécurité)**: Concerne la santé, la qualité, la garantie, et la sécurité physique (fréquent en parapharmacie).
- **O (Orgueil)**: Besoin de reconnaissance, statut social, marque, ou influence des tiers.
- **N (Nouveauté)**: Recherche d'innovation, de nouvelles technologies, ou de produits "tendances".
- **C (Confort)**: Produit agréable, facile d'emploi, texture, souvent nécessite un test.
- **A (Argent)**: Facteur économique, prix du produit (peut orienter vers des ventes par lot).
- **S (Sympathie)**: Côté amusant, fantaisie, flaconnage attractif.

### L'Approche Sensorielle du Client pour un Conseil Personnalisé (Custom)

- **SRS**: Système de Représentation Sensorielle pour décrypter le canal privilégié du client.
- **Client Visuel**: Attiré par l'apparence du produit; le guider vers un facing attractif.
- **Client Auditif**: Intègre l'information par la parole; développer un conseil détaillé et explicatif.
- **Client Kinesthésique**: Besoin de toucher et de tester le produit; lui faire prendre en main ou essayer.

### La Prise de Décision Post-Découverte (Custom)

- **Décision Initiale**: Après la découverte, le pharmacien prend une première décision cruciale.
- **Conseil au Comptoir**: Si la demande est claire et relève de ses compétences, rassurer et proposer un traitement adapté.
- **Orientation Médicale**: Face à une situation incertaine ou complexe, ne pas dispenser de traitement et orienter vers une consultation médicale.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est l'objectif principal de la découverte client en pharmacie selon la mémofiche ?
  R: Passer d'une demande générique à un conseil personnalisé et pertinent.
- Q: Quelle est la demande initiale typique d'un patient mentionnée dans l'exemple ?
  R: Quelque chose pour sa peau sèche.
- Q: Quels aspects de la sécheresse cutanée le professionnel doit-il explorer ?
  R: L'étendue, les zones concernées, les éventuels inconforts (démangeaisons, tiraillements).
- Q: En plus des inconforts, quelles autres informations le professionnel doit-il recueillir ?
  R: Les produits déjà utilisés, le budget, et les attentes spécifiques du patient.
- Q: Pourquoi est-il important de comprendre les attentes du patient concernant un produit ?
  R: Pour proposer un conseil personnalisé tenant compte de la rapidité d'action, la texture, ou la composition naturelle.
- Q: Quelle est la conséquence d'une demande initiale "vague" si elle n'est pas approfondie ?
  R: Un risque de conseil non pertinent ou non adapté aux besoins réels du patient.
- Q: Quels sont des exemples d'inconforts liés à la peau sèche mentionnés ?
  R: Démangeaisons et tiraillements.
- Q: Que permet une "démarche structurée" lors de la découverte client ?
  R: De transformer une demande générique en un conseil spécifique et utile.
- Q: La mémofiche mentionne-t-elle la pathologie spécifique de la peau sèche ?
  R: Non, la section "Pathologie" est indiquée comme "undefined".
- Q: Quel rôle joue le budget du patient dans le processus de conseil ?
  R: C'est un critère à prendre en compte pour adapter la proposition de produits aux capacités financières du patient.

---

# Argumentation adaptée: La Méthode CAB à l'Officine

**Type:** communication | **Thème:** Communication | **Système:** N/A | **Niveau:** Facile

> Mémofiche pour les professionnels de l'officine sur la méthode CAB (Caractéristiques, Avantages, Bénéfices) pour une argumentation éthique et centrée sur le patient, incluant des conseils pratiques et la méthode SONCAS.

### Situation Patient / Cas Comptoir

• **Cas 1 : Écran solaire**
• Une cliente reconnaît l'importance de l'application répétée d'écran solaire mais trouve cette habitude contraignante par manque de temps. Le préparateur doit conseiller une brume solaire en basant son argumentation sur la facilité et la rapidité d'application.
• **Cas 2 : Toux sèche de l'enfant**
• Une mère cherche un traitement pour son enfant de 3 ans réveillé plusieurs fois par une toux sèche gênante. Après découverte des besoins, le préparateur argumente le choix d'un antihistaminique antitussif non seulement sur son efficacité mais surtout sur son effet sédatif recherché dans ce cas.

### 1. La Caractéristique (C) : Le "Qu'est-ce que c'est ?" (Custom)

**Description**: Décrit le produit de manière objective et factuelle.
**Contenu**: Énumère les propriétés et fonctionnalités concrètes de l'offre.
**Types Techniques**: Composition, dosage, forme (crème, comprimé), contenance, consistance.
**Types Commerciaux**: Prix, garanties de la marque, lieux de distribution.
**Types Psychologiques**: Clientèle visée, motivations d'achat.
**Discours**: Purement informatif, factuel et objectif.
**Question Clé**: Répond à « Qu’est-ce que c’est ? ».
**Prérequis**: Nécessite une parfaite maîtrise de l'offre.

### 2. L'Avantage (A) : Le "Qu'est-ce que ça apporte ?" (Custom)

**Transformation**: Transforme les caractéristiques brutes en un intérêt concret et direct pour le patient.
**Fonction**: Décrit ce que le produit fait pour le client et ce qu'il lui apporte.
**Verbes d'Action**: Souvent formulé avec des verbes comme "permettre de", "aider à", "réduire", "calmer", "améliorer".
**Objectif**: Éveiller la curiosité du patient.

### 3. Le Bénéfice (B) : Le "Qu'est-ce que ça change pour moi ?" (Custom)

**Impact**:
-Met en lumière l'impact émotionnel et personnel du produit, ce qu'il va changer positivement dans la vie du patient.
**Projection**:
-Projette le client dans une "vie meilleure" grâce au produit.
**Nature**:
-Plus personnel que l'avantage (qui est plus générique).
**Question Clé**: Répond à « Qu’est-ce que ça change pour moi ? ».
**Types Émotionnels**: Sensations, perceptions, fierté, sérénité, plaisir.
**Types Rationnels**: Mesurables, quantifiables.
**Motivation d'Achat**: Environ 90% des décisions sont émotionnelles.
**Rôle du Pharmacien**: Ne vend plus un produit, mais une promesse.

### Approche Centrée sur le Patient et Éthique (Custom)

**Écoute Active**: Primordiale pour comprendre les besoins, préoccupations et motivations d'achat spécifiques de chaque patient.
**Personnalisation**: L'argumentaire ne doit jamais être standardisé; adapter caractéristiques, avantages et bénéfices aux recherches du patient (ex: sécurité).
**Langage Clair**: Indispensable; éviter le jargon médical ou technique, utiliser des mots simples (ex: "maux de tête" pour "céphalées").
**Preuves Concrètes**: Appuyer les bénéfices avec des faits, chiffres, labels de qualité, résultats d'études cliniques ou témoignages.
**Hiérarchiser les Mobiles**: Déterminer les mobiles d'achat (ex: méthode SONCAS) pour sélectionner les arguments les plus pertinents.
**Convaincre sans Manipuler**: Présenter la valeur ajoutée de manière concrète et convaincante, en laissant le patient libre d'adhérer. Éviter de "survendre".

### Variantes de la Méthode CAB (Custom)

**Méthode CAB**: Caractéristiques, Avantages, Bénéfices.
**Méthode CAP**: Caractéristiques, Avantages, Preuves (la "preuve" peut être un élément du bénéfice).
**Méthode CBD**: Caractéristiques, Bénéfices, Démonstration (la "démonstration" sert de preuve concrète).
**Importance**: Lier ces éléments pour une argumentation fluide.

### Conseils pour une Utilisation Efficace à l'Officine (Custom)

**Objectifs Raisonnables**: Commencer l'exercice avec des produits à forte rotation ou de nouvelles gammes.
**Entraînement Régulier**: Pratiquer par écrit et à l'oral en équipe, utiliser des exercices de simulation.
**Varier les Bénéfices**: Adapter aux motivations d'achat spécifiques du patient (méthode SONCAS).
**Authenticité et Honnêteté**: Ne pas exagérer les bénéfices pour préserver la réputation et la confiance.
**Mettre à Jour**: Adapter régulièrement l'argumentaire car les besoins des patients et le contexte évoluent.
**Éviter le "Trop d'Arguments"**: Préférer 3 à 5 bénéfices bien choisis pour plus d'efficacité.
**Prioriser le Client**: L'argumentaire doit toujours être adapté au client et non au produit.

### La Méthode SONCAS : Découvrir les Motivations d'Achat (Custom)

**Définition**: Technique de questionnement permettant de comprendre les besoins et motivations d'un client pour déclencher un achat.
**Leviers**: Regroupe 6 leviers principaux : Sécurité, Orgueil, Nouveauté, Confort, Argent, Sympathie.
**Détection**: À identifier implicitement via les dires et attitudes du client.
**Sécurité**: **Mots-clés**: solidité, référence, garantie, réconfort, protection, SAV, fiabilité.
**Orgueil**: **Mots-clés**: notoriété, numéro 1, exclusif, standing, image de marque, unique, personnalisation, prestige.
**Nouveauté**: **Mots-clés**: nouveau, précurseur, d'avant-garde, à la pointe, originalité.
**Confort**: **Mots-clés**: facilité d'utilisation, pratique, simple, fonctionnel, mise en service, simplifier les tâches.
**Argent**: **Mots-clés**: économie d'argent/temps, remise, gain, investissement, rentabilité, promotion, acheter moins cher.
**Sympathie**: **Mots-clés**: agréable, convivial, plaisir, ludique, cadeau, charme, acheter à un vendeur sympathique.

### Les Mots Gagnants : Un Impact Décisif sur la Vente (Custom)

**Définition**: Mots puissants qui influencent le déroulement de la vente, suscitent l'intérêt et aident à la décision.
**1. Vous, votre** : Le client se sent important, rassuré et confiant.
**2. Economisez**: Incite à l'achat en promettant un gain (argent, temps, effort).
**3. Argent** : Éveille l'intérêt, une argumentation basée sur un gain peut être décisive.
**4. Facile**n: Le client préfère ce qui est simple, non compliqué et nécessite moins d'effort.
**5. Garantie**: Rassure le client, calme sa peur et élimine les soupçons.
**6. Santé Insister sur l'état de santé du client valorise l'argumentation.
**7. Prouvé**: Le client préfère ce qui est testé et prouvé, renforce la conviction.
**8. Sécurité**: Valorise le produit et facilite la vente en éloignant le risque.
**9. Découverte**: Intéresse le client pour un produit issu d'une nouvelle recherche.
**10. Nouveau**: Attire l'attention du client sur les nouveautés.
**11. Amour**: Évoquer le côté sentimental aide à convaincre.
**12. Résultat**: Le client attend un résultat, il est impératif d'insister sur cet aspect.
**13. Gratuit**: Le client adore les cadeaux, il faut insister sur les gratuités.
Intonations Positives
**Recommandation**: Préférer "Ce produit va vous convenir", "Ce médicament est adapté à votre situation et vous soulagera".
**Expressions Négatives**:
**À Éviter\*\*: "Je ne pense pas que", "Vous ne serez pas déçu", "Je ne pense pas que le médicament ne vous soulagera pas".

### Synthèse : Les Clés d'un Argumentaire Réussi (Custom)

**Règle 1 : Bons arguments**: Choisir des arguments qui répondent aux désirs et s'harmonisent avec les besoins et motivations du client.
**Règle 2 : Méthode CAB**: Adapter la méthode CAB, en insistant sur les bénéfices ressentis par le client.
**Règle 3 : Mots puissants**: Utiliser des mots gagnants qui rassurent le client et facilitent la vente.
**Conseil : Offre**: Ne pas proposer trop de produits pour éviter de noyer le client sous les informations.
**Conseil : Budget**: Prendre garde au budget du client pour le rassurer et le convaincre plus facilement.
**Conseil : Flexibilité**: L'argumentaire doit être souple et s'adapter à la personnalité et à l'échange avec le client pour réduire les objections.

### Conseils Traitement

### Flashcards (Révision)

- Q: Que signifie l'acronyme CAB dans la méthode d'argumentation en pharmacie ?
  R: Caractéristiques, Avantages, Bénéfices.
- Q: Quel est l'objectif principal de la méthode CAB en officine ?
  R: Structurer l'argumentation pour mieux conseiller le client en mettant en avant ce qui est important pour lui.
- Q: Dans la méthode CAB, à quoi se réfèrent les "Caractéristiques" (Features) d'un produit ?
  R: Il s'agit des propriétés objectives et techniques du produit (ex: texture, composition, forme galénique).
- Q: Que représentent les "Avantages" (Advantages) d'un produit selon la méthode CAB ?
  R: Ce sont les conséquences directes des caractéristiques du produit, souvent formulées en termes d'action (ex: "s'applique facilement", "soulage la toux").
- Q: Qu'est-ce que les "Bénéfices" (Benefits) dans la méthode CAB, et pourquoi sont-ils essentiels ?
  R: Ce sont les gains personnels et subjectifs pour le client, répondant directement à ses besoins et motivations. Ils sont essentiels car ils personnalisent le conseil.
- Q: Quelle était la contrainte majeure exprimée par la cliente dans le cas de l'écran solaire ?
  R: Le manque de temps et le caractère contraignant de l'application répétée de l'écran solaire.
- Q: Dans le cas de l'écran solaire, quel bénéfice devait être mis en avant pour la brume solaire ?
  R: La facilité et la rapidité d'application.
- Q: Quel symptôme gênant présentait l'enfant dans le cas de la toux sèche ?
  R: Une toux sèche réveillant l'enfant plusieurs fois par nuit.
- Q: Quel bénéfice spécifique de l'antihistaminique antitussif était recherché pour l'enfant dans le cas de la toux sèche ?
  R: Son effet sédatif, permettant à l'enfant de mieux dormir et de ne plus être réveillé par la toux.
- Q: Pourquoi l'argumentation en officine doit-elle être considérée comme "éthique" ?
  R: Car elle vise à répondre au mieux aux besoins du patient, en lui offrant le conseil le plus juste et adapté, et non simplement à vendre un produit.

---

# Gestion des Objections Patients-Clients à l'officine : Méthode ACCRé

**Type:** communication | **Thème:** Communication | **Système:** N/A | **Niveau:** Facile

> Guide pratique pour les professionnels de l'officine sur **la gestion éthique et efficace des objections** des patients,
> incluant la méthode **ACCRé** et la gestion des objections de prix.

### Situation Patient / Cas Comptoir

• **Scénario**: Un patient hésite devant un produit conseillé, affirmant "C'est un peu cher, je ne suis pas sûr que ça vaille le coup." ou "J'ai déjà essayé quelque chose de similaire et ça n'a pas fonctionné."
• **Réflexe**: Ne pas contredire immédiatement, mais plutôt accueillir son doute comme une opportunité d'échange.
• **Objectif**: Identifier la véritable source de l'hésitation (prix, efficacité passée, peur des effets secondaires, manque d'information) pour y répondre précisément.
• **Conséquence**: Une objection bien gérée renforce la confiance du patient et valide l'expertise du professionnel.

### Comprendre la Méthode ACCRé (Custom)

**Définition**: ACCRé est un acronyme signifiant Accepter, Creuser, Comprendre, Répondre.
**Philosophie**: Approche éthique et centrée sur le patient, respectant son besoin d'information et de réassurance.
**Objectif**: Transformer une objection en opportunité de dialogue et de conseil pertinent.
**Intégration**: La "vente" de produits ou conseils à l'officine est indissociable de la déontologie médicale et de l'intérêt du patient.

![Image](/uploads/pharmia/communication/objections-slides/4.png)

### Accepter l'Objection : Créez un Climat de Confiance (Custom)

**Première étape**: Accueillez l'objection sans la contrer ni vous justifier.
**Signe d'intérêt**: L'objection indique que le patient est en phase de décision et cherche à être rassuré.
**Légitimation**: Exprimez de l'empathie avec des phrases comme "Je comprends votre point de vue" ou "Votre question est légitime."
**Vocabulaire**: Préférez "point de vue" ou "préoccupation" à "objection" pour un dialogue constructif.
**Anticipation**: Ne jamais anticiper l'objection ; laissez le patient l'exprimer pour éviter d'induire le doute.

![Image](/uploads/pharmia/communication/objections-slides/3.png)

### Creuser l'Objection : Débusquez la Raison Profonde (Custom)

**Motivation cachée**: De nombreuses objections sont des "fausses excuses" masquant une préoccupation réelle ou un manque d'information.
**Questions ouvertes**: Utilisez des questions comme "Qu'est-ce qui vous gêne spécifiquement ?" ou "Trop cher par rapport à quoi ?" pour inciter le patient à s'exprimer.
**Techniques**:
_ **L'Approfondissement**: Idéale pour les objections non sincères, elle recentre la conversation sur le problème.
_ **L'Effritement**: Encourage le patient à justifier son objection, révélant ses véritables freins.
**Révéler le besoin**: L'objectif est d'amener le patient à verbaliser sa vraie préoccupation pour la traiter efficacement.

![Image](/uploads/pharmia/communication/objections-slides/6.png)

### Comprendre l'Objection : Écoute et Empathie (Custom)

**Écoute active**: Écoutez attentivement et sans interruption, en vous concentrant sur les mots et les émotions.
**Reformulation**: Validez votre compréhension et montrez au patient que vous l'avez écouté ("Si je comprends bien, c'est ce point qui vous préoccupe ?").
**Reconnaissance émotionnelle**: Les objections sont souvent liées à des craintes. Rassurez le patient et validez ses sentiments, sans nécessairement être d'accord avec le contenu de l'objection.

![Image](/uploads/pharmia/communication/objections-slides/7.png)

### Répondre à l'Objection : Apporter la Solution Éthique (Custom)

**Transformation positive**: Utilisez l'objection comme un levier pour valoriser votre solution.
_ **L'Appui**: "L'absence de parfum limite les risques d'allergies pour votre bébé."
_ **Le "Oui, mais"**: Reconnaître le point du patient avant de présenter un bénéfice supérieur ("Oui, mais une seule application assure un confort toute la journée"). \* **Le Prolongement**: "C'est justement pour cette raison que ce produit est idéal..."
**Preuves concrètes**: Apportez des faits, chiffres, témoignages ou démonstrations pour rationaliser la décision.
**Éthique professionnelle**: L'argumentation doit toujours être basée sur l'intérêt du patient, la logique et la rationalité.
**Bénéfices client**: Mettez en avant comment la solution répond aux besoins et améliore la qualité de vie du patient.

![Image](/uploads/pharmia/communication/objections-slides/9.png)

### Gestion Spécifique des Objections de Prix en Pharmacie (Custom)

**Questionnement**: Face à "C'est trop cher", demandez "Par rapport à quoi ?" pour cerner la vraie perception du coût.
**Valeur et bénéfices**: Expliquez la plus-value du produit (efficacité, moins d'effets secondaires, meilleure tolérance).
**Coût en investissement**: Reformulez le prix comme un "investissement supplémentaire" offrant des gains (temps, confort, sécurité).
**Preuve sociale (Les 3R)**: Mentionnez que d'autres clients ont eu la même remarque mais sont satisfaits de la qualité ou de l'efficacité.
**Concession prudente**: Si une concession est envisagée, offrez un complément (échantillon, accessoire) plutôt qu'une réduction directe, en demandant un retour.

### Le Pharmacien, Expert en Communication et Confiance (Custom)

**Compétence fondamentale**: La gestion des objections est une compétence clé de communication, pas juste de vente.
**Impact de l'ACCRé**: En appliquant cette méthode, vous dissipez les doutes, renforcez la confiance du patient et personnalisez le conseil.
**Rôle essentiel**: Affirmez votre expertise en tant que professionnel de santé dévoué au bien-être du patient.
**Amélioration continue**: Chaque interaction est une occasion de pratiquer et d'affiner votre approche pour mieux servir les patients.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est le titre de la méthode de gestion des objections patient mentionnée dans la mémofiche ?
  R: La Méthode ACCRé.
- Q: Quel est le réflexe initial à adopter face à une objection d'un patient en pharmacie ?
  R: Ne pas contredire immédiatement, mais plutôt accueillir son doute comme une opportunité d'échange.
- Q: Quel est l'objectif principal de la gestion des objections selon la mémofiche ?
  R: Identifier la véritable source de l'hésitation du patient.
- Q: Citez un exemple d'objection de patient liée au prix.
  R: "C'est un peu cher, je ne suis pas sûr que ça vaille le coup."
- Q: Citez un exemple d'objection de patient liée à l'efficacité passée.
  R: "J'ai déjà essayé quelque chose de similaire et ça n'a pas fonctionné."
- Q: Quelles sont les sources possibles d'hésitation d'un patient identifiées dans la mémofiche ?
  R: Le prix, l'efficacité passée, la peur des effets secondaires, le manque d'information.
- Q: Quelle est la conséquence positive d'une objection bien gérée en pharmacie ?
  R: Renforcer la confiance du patient et valider l'expertise du professionnel.
- Q: Pourquoi est-il important d'accueillir le doute du patient plutôt que de le contredire ?
  R: Pour transformer le doute en une opportunité d'échange et mieux comprendre ses préoccupations.
- Q: Que permet de renforcer une objection patient bien gérée ?
  R: La confiance du patient envers le professionnel de santé.
- Q: Quel est l'impact d'une objection bien gérée sur l'expertise du professionnel de la pharmacie ?
  R: Elle valide l'expertise du professionnel.

---

# Optimisation de l'utilisation des inhalateurs de poudre sèche (DPI) dans l'asthme : Guide pour le pharmacien

**Type:** dispositifs-medicaux | **Thème:** Dispositifs médicaux | **Système:** ORL & Respiration | **Niveau:** Facile

### Turbuhaler - exemple: SYMBICORT ® (Custom)

[Video](https://www.youtubeeducation.com/watch?v=SxmUjLgmqEw)

### Diskus - exemple: SERETIDE ® (Custom)

[Video](https://www.youtubeeducation.com/watch?v=LeFR55YLUwY)

### Aerolizer - exemple: AERONIDE ® (Custom)

[Video](https://www.youtubeeducation.com/watch?v=BtNn9HJ3giM)

### Nexthaler - exemple: FOSTER ® poudre (Custom)

[Video](https://www.youtubeeducation.com/watch?v=FSkrBdyZ0hQ)

### Aérosol doseur - exemple: AEROL ® (Custom)

[Video](https://www.youtubeeducation.com/watch?v=CRpFU3m_AUQ)

### Cas Comptoir (DM)

• **Délivrance initiale ou renouvellement**: Le patient se présente pour une première délivrance d'un traitement inhalé ou pour le renouvellement d'un DPI.
• **Consommation excessive de bêta-2-mimétiques**: Le patient renouvelle fréquemment son traitement de crise (plus d'un aérosol doseur par trimestre), signalant un asthme non contrôlé.
• **Patient sous corticoïde inhalé (CSI)**: Un patient asthmatique adulte qui utilise un CSI depuis au moins 6 mois, ou qui a débuté un CSI au cours des 12 derniers mois.
• **Difficulté d'utilisation**: Le patient exprime des difficultés à manipuler son inhalateur ou à réaliser la technique d'inhalation correcte.
• **Effets indésirables locaux**: Le patient signale des symptômes tels que la raucité de la voix ou des candidoses oropharyngées suite à l'utilisation de son CSI.
• **Questionnement sur l'efficacité**: Le patient doute de l'efficacité de son traitement, notamment s'il ne ressent pas la poudre après l'inhalation.

### Objectifs Conseil

• **Éducation thérapeutique**: Promouvoir activement le bon usage des dispositifs inhalés et l'observance du traitement.
• **Différenciation des traitements**: Expliquer clairement la distinction entre le traitement de fond (quotidien, anti-inflammatoire) et le traitement de crise (rapide, symptomatique).
• **Démonstration et évaluation**: Effectuer une démonstration pratique de la technique d'inhalation avec des dispositifs placebos et faire pratiquer le patient pour corriger les erreurs.
• **Adéquation du dispositif**: Vérifier que le DPI est adapté aux capacités physiques du patient, en particulier son débit inspiratoire et sa coordination.
• **Prévention des effets indésirables**: Insister sur le rinçage buccal systématique après l'inhalation de corticoïdes (CSI) pour prévenir candidose et raucité.
• **Suivi de l'observance et du contrôle**: Utiliser l'historique des délivrances et des outils comme l'ACT (Test de Contrôle de l'Asthme) pour évaluer le niveau de contrôle et l'observance.
• **Optimisation du dépôt pulmonaire**: Conseiller sur la bonne position, l'étanchéité labiale, et le maintien de l'apnée post-inhalation (5-10 secondes).
• **Maintenance du dispositif**: Informer sur le nettoyage adéquat de l'embout buccal (chiffon sec) et les précautions de conservation (à l'abri de l'humidité pour les DPI).
• **Proposer un accompagnement**: Orienter les patients éligibles vers les entretiens de Bon Usage des Médicaments (BUM) Asthme pour un suivi approfondi.

### Pathologies Concernées

• **Asthme**: Maladie inflammatoire chronique des voies respiratoires caractérisée par une obstruction bronchique réversible, des sifflements, une toux, une oppression thoracique et une dyspnée. Les dispositifs d'inhalation sont essentiels pour le contrôle des symptômes et la prévention des exacerbations.
• **Asthme persistant**: Forme d'asthme nécessitant une corticothérapie inhalée (CSI) quotidienne pour réduire l'inflammation sous-jacente et maintenir un contrôle à long terme. La bonne utilisation des DPI est cruciale pour l'efficacité des CSI.
• **Asthme non contrôlé**: État où les symptômes asthmatiques persistent malgré le traitement, souvent signalé par une utilisation fréquente des bêta-2-mimétiques de courte durée d'action. L'optimisation de la technique d'inhalation est une étape clé pour améliorer le contrôle.
• **Candidose oropharyngée**: Infection fongique de la bouche et de la gorge, fréquemment observée chez les utilisateurs de CSI sans rinçage buccal adéquat, due au dépôt local du corticoïde. Une bonne technique et le rinçage sont préventifs.
• **Raucité de la voix (dysphonie)**: Altération de la qualité de la voix, autre effet indésirable local possible des CSI, également prévenu par un rinçage buccal post-inhalation.
• **Crise d'asthme sévère**: Exacerbation aiguë de l'asthme où le débit inspiratoire du patient peut être très faible, rendant l'utilisation des DPI moins efficace en raison de l'exigence d'une inspiration vive et profonde. Les DPI ne sont généralement pas adaptés à la gestion de la crise sévère.

### Intérêt du Dispositif

• **Administration ciblée**: Permet de délivrer le principe actif directement dans les bronches, optimisant son action locale et minimisant les effets systémiques.
• **Simplicité d'utilisation**: Ne nécessitant pas de coordination main-poumon (contrairement aux pMDI), les DPI peuvent être plus faciles à utiliser pour certains patients.
• **Efficacité du traitement de fond**: Contribuent à un contrôle efficace de l'inflammation bronchique, réduisant ainsi la fréquence et la gravité des crises d'asthme.
• **Prévention des complications**: Une technique d'inhalation maîtrisée est synonyme d'une meilleure efficacité thérapeutique, prévenant les exacerbations et les hospitalisations.
• **Adaptabilité aux patients**: La variété des DPI disponibles permet d'adapter le dispositif aux capacités inspiratoires et aux préférences individuelles de chaque patient.
• **Information claire sur la dose**: De nombreux DPI intègrent des compteurs de doses visibles, assurant au patient la prise effective du médicament.

### Bénéfices Santé

• **Amélioration du contrôle de l'asthme**: L'utilisation correcte des DPI assure un dépôt optimal du médicament, conduisant à une meilleure maîtrise des symptômes et une meilleure qualité de vie.• **Réduction des exacerbations**: Un traitement de fond bien administré diminue la fréquence et l'intensité des crises d'asthme, réduisant le recours aux urgences.• **Prévention des effets indésirables**: Le respect des bonnes pratiques (ex: rinçage après CSI) minimise les risques de candidose oropharyngée et de raucité de la voix.• **Optimisation de l'observance**: Une bonne compréhension et maîtrise du dispositif favorisent l'adhésion au traitement, essentielle pour une gestion efficace de l'asthme.• **Autonomie et confiance du patient**: Le patient acquiert une meilleure autonomie dans la gestion de sa maladie et une confiance accrue dans son traitement.• **Diminution de la dépendance aux traitements de crise**: Un asthme bien contrôlé réduit la nécessité d'utiliser fréquemment les bronchodilatateurs de secours, indicateur d'une meilleure santé respiratoire.

### Dispositifs à Conseiller

• **Inhalateurs de Poudre Sèche (DPI)**: Dispositifs n'utilisant pas de gaz propulseur, activés par l'inspiration du patient, exigeant une inspiration vive et profonde.
• **DPI à Gélule/Capsule (Unidose)**: Pour les patients capables de manipuler une gélule et de vérifier qu'elle est vide.
Exemples: Aerolizer (Foradil®, Eolide®, Aeoronide ).
• **DPI Multidoses à Réservoir**: Adaptés aux patients nécessitant un débit inspiratoire relativement faible et un compteur de doses. Exemples: Turbuhaler (Pulmicort®, Symbicort®).
• **DPI Multidoses à Plaquette**: Pour une protection individuelle des doses et un compteur visible. Exemples: Diskus (Flixotide®, Seretide®).
• **Autres systèmes autodéclenchés**: Intègrent un mécanisme de chargement et de déclenchement par l'inspiration. Exemples: Nexthaler (Foster®).
• **Dispositifs de démonstration**: Outils essentiels pour l'éducation thérapeutique et la pratique de la technique d'inhalation en officine.
• **Chambres d'inhalation**: À conseiller systématiquement en association avec les aérosols-doseurs pressurisés (pMDI) contenant des corticoïdes, pour optimiser le dépôt pulmonaire et réduire les effets indésirables oropharyngés.

[Video](https://www.youtubeeducation.com/watch?v=CRpFU3m_AUQ)

### Réponses aux Objections

• **"Je ne sens rien quand j'inhale, donc le médicament ne passe pas."**: Rappeler que certains DPI (sans lactose) peuvent ne pas donner de sensation de poudre. Expliquer que si le compteur de doses a avancé, la dose a bien été délivrée. Insister sur l'importance de ne pas renouveler la prise sans avis médical ou pharmaceutique.• **"Mon inhalateur est trop compliqué à utiliser."**: Proposer une nouvelle démonstration pas à pas avec un dispositif placebo. Vérifier si un autre type de DPI serait plus adapté aux capacités du patient (ex: débit inspiratoire, coordination). Simplifier les étapes clés et mettre en place une grille d'évaluation si besoin.• **"J'ai la voix rauque et la bouche irritée à cause de mon corticoïde."**: Expliquer que le rinçage de la bouche (et le gargarisme) avec de l'eau, à cracher systématiquement après chaque prise de CSI, est crucial pour prévenir ces effets locaux. Pour les pMDI, conseiller l'usage d'une chambre d'inhalation.• **"Je dois prendre mon traitement de crise trop souvent."**: Expliquer que c'est un signe de mauvais contrôle de l'asthme et que le traitement de fond doit être bien pris. Suggérer une consultation médicale pour réévaluer la stratégie thérapeutique et proposer les entretiens BUM Asthme pour un accompagnement.• **"Je souffle dans l'appareil avant de prendre ma dose."**: Informer le patient qu'en soufflant dans un DPI chargé, la dose de poudre est dispersée et perdue. Expliquer qu'il faut préparer une nouvelle dose et inspirer vivement par la bouche, sans souffler dans l'embout.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est l'objectif principal de l'optimisation de l'utilisation des inhalateurs de poudre sèche (DPI) dans l'asthme?
  R: Assurer une administration efficace du médicament, améliorer le contrôle des symptômes de l'asthme et réduire les exacerbations.
- Q: Pourquoi la technique d'inhalation est-elle cruciale pour l'efficacité d'un DPI?
  R: Une technique correcte garantit que la dose de médicament atteint les voies respiratoires inférieures, là où elle doit agir, maximisant ainsi l'efficacité thérapeutique.
- Q: Quels sont les avantages des DPI par rapport aux inhalateurs-doseurs pressurisés (MDI) pour certains patients?
  R: Les DPI ne nécessitent pas de coordination main-poumon aussi stricte que les MDI, et l'absence de propulseurs les rend écologiquement plus favorables.
- Q: Cite un inconvénient potentiel des DPI.
  R: Ils nécessitent un flux inspiratoire suffisant de la part du patient, ce qui peut être un défi pour les jeunes enfants, les personnes âgées ou celles avec des exacerbations sévères.
- Q: Quel conseil le pharmacien doit-il donner au patient après l'inhalation d'un corticoïde en poudre sèche?
  R: Rincer la bouche et se gargariser avec de l'eau, puis cracher, afin de prévenir les candidoses orales et la dysphonie.
- Q: Quand le pharmacien devrait-il réévaluer la technique d'inhalation d'un patient utilisant un DPI?
  R: Lors de chaque dispensation, lors de l'introduction d'un nouveau dispositif, en cas de contrôle insuffisant de l'asthme, ou si le patient rapporte des difficultés.
- Q: Qu'est-ce qu'un «placebo test» ou une démonstration avec un inhalateur vide peut apporter?
  R: Cela permet de vérifier et de corriger la technique du patient sans administrer de médicament, renforçant ainsi la confiance et l'apprentissage.
- Q: Pourquoi est-il important de ne pas secouer certains DPI avant utilisation?
  R: Les DPI contiennent la poudre en vrac ou en capsules, et secouer le dispositif pourrait altérer l'intégrité des doses ou leur libération.
- Q: Comment le pharmacien peut-il vérifier l'adhérence du patient à son traitement par DPI?
  R: En discutant avec le patient de sa routine, en vérifiant les dates de renouvellement et le nombre de doses restantes dans l'appareil.
- Q: Quel est le rôle du pharmacien dans la sélection de l'inhalateur pour un patient asthmatique?
  R: Le pharmacien conseille sur le type d'inhalateur le plus adapté en fonction des capacités du patient, de ses préférences et de l'observance, en collaboration avec le médecin.

---

# La Toux: conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** ORL & Respiration | **Niveau:** Facile

### Situation Patient / Cas Comptoir

Un patient âgé de 25 ans se présente au comptoir en disant : « Je tousse, que puis-je prendre ? ».

### Aperçu Pathologie

**-Définition** : La toux est un réflexe naturel de défense de l'organisme pour expulser les agents irritants des voies respiratoires: C'est une expiration brusque et sonore de l'air des poumons, impliquant des récepteurs spécifiques.
**-Classification** : On classe la toux en: Aiguë (Durée< 3 semaines), Subaiguë (Durée de 3 à 8 semaines), Chronique (Durée > 8 semaines).
**-Types:**
**.Toux Sèche** : Irritative, non-productive, sans expectorations, souvent fatigante et nocturne.
**.Toux Grasse** : Productive, permet l'évacuation des sécrétions et impuretés.
**-Causes de la toux:**
**.Virales** : Fréquemment due à des **infections respiratoires virales** (rhino-pharyngite, bronchite, trachéite).
**.Environnementales** : Tabagisme, poussières, substances irritantes peuvent déclencher la toux.
**.Médicamenteuses** : Les **Inhibiteurs de l'Enzyme de Conversion** (IEC) peuvent provoquer une toux irritative sèche
**.Autres** : Infections bactériennes (coqueluche), allergies, asthme, reflux gastro-œsophagien (RGO), cardiopathies, BPCO.
**-Principes de traitement** : Le traitement de la toux est symptomatique:
**.Toux grasse**: Faciliter la toux pour dégager les voies respiratoires.
**.Toux sèche**: Bloquer la toux pour diminuer l'irritation et soulager le patient.

![Image](https://pharmaconseilbmb.com/photos/site/orl-respiration/toux.jpg)

### Questions Clés

- **-Durée:** Depuis quand toussez-vous ?
- **-Type de toux:** Est-elle sèche (irritative, sans crachats) ou grasse (productive, avec mucosités) ? Ressentez-vous des sécrétions ?
- **-Symptômes associés:** Avez-vous d'autres signes (fièvre, vomissements, fatigue, courbatures, rhume, maux de tête) ?
- **-Signes de gravité:** Souffrez-vous de troubles respiratoires, essoufflement, douleurs thoraciques?
- **-Facteurs déclenchants:** Quels sont les éléments qui déclenchent ou aggravent votre toux ?
- **-Traitements actuels:** Suivez-vous un traitement médicamenteux ?
- **-Antécédents médicaux:** Souffrez-vous de problèmes respiratoires ou cardiaques ?

### Signaux d'Alerte (Red Flags)

- **-Persistance:** La toux persiste plus de **2** semaines et/ou les symptômes s'aggravent malgré un traitement.
- **-Fièvre:** Une fièvre persiste depuis plus de **48** heures.
- **-Hémoptysie:** Présence de **sang** dans les expectorations.
- **-Dyspnée:** Difficultés respiratoires (essoufflement).
- **-Altération de l'état général:** Altération de l'état général (ex: amaigrissement, fatigue importante).
- **-Patients à Risque:** La toux survient chez un patient souffrant d'une maladie chronique: asthme, insuffisance cardiaque, immunodépression.

### Traitement Principal

- **Toux Sèche (Non productive, irritative)** :
- -Le traitement de choix sont les **antitussifs**
- -Ils agissent en bloquant l’arc réflexe de la toux
- -On distingue **trois classes principales: **opiacés**, **antihistaminiques**, **non-opiacés non-antihistaminiques\*\*
- **Toux Grasse (Productive)** :
- -Il ne faut pas stopper la toux mais faciliter l'évacuation les sécrétions bronchiques
- -On distingue trois classes principales: **mucolytiques**, **expectorants**, **mucorégulateurs**
- -La durée d'utilisation **maximale** de médicament contre la toux est de **5 jours**
- **Précautions d'usage** : Ne pas réutiliser de vieux sirops ouverts (> 2 mois). Vérifier la présence d'alcool dans les sirops.

### Conseils Hygiène de Vie

- **Environnement** : **Éviter** les atmosphères **sèches et chaudes** ; utiliser des humidificateurs électriques ou un bol d'eau sur radiateur dans les pièces.
- **Température** : Maintenir la température des chambres à 18°C (19-20°C pour les enfants) ; ne pas surchauffer la maison.
- **Aération** : **Aérer régulièrement** les pièces de la maison (au minimum une fois par jour).
- **Tabagisme** : **Éviter de fumer** et de rester dans une ambiance enfumée ; ne pas exposer les enfants à la fumée de tabac.
- **Repos Nocturne** : Surélever la tête du matelas ou utiliser des oreillers supplémentaires en cas de toux nocturne.
- **Hygiène Nasale** : Se laver le nez au sérum physiologique plusieurs fois par jour.
- **Mouchoirs** : Utiliser des mouchoirs **jetables.**
- **Hygiène des Mains** : Se laver régulièrement les mains avec du savon (pendant 30 secondes) ou utiliser une solution hydro-alcoolique.
- **Contacts** : Limiter les contacts avec les personnes fragiles et les enfants ; éviter les poignées de main et les embrassades.
- **Protection** : Porter un masque jetable pour protéger votre entourage, en le changeant toutes les 4 heures ou dès qu'il est mouillé.

### Conseils Alimentaires

- **Hydratation** : **Boire abondamment** et régulièrement (environ 1,5 litre d'eau par jour) pour **fluidifier les sécrétions** et rester hydraté.
- **Boissons Chaudes** : Préférer les tisanes, le thé léger, l'eau, les boissons chaudes avec du citron et du miel, les infusions de thym ou d'eucalyptus.

### Toux Grasse (Custom)

**Mucolytiques** : -**Diminuer la viscosité** du mucus pour le rendre plus facile à expectorer
-Carbocistéine: Bronchokod®
-Acétylcystéine: Mucolyse®
-Bromhexine: Bromisol®
-Prise avant 17-18 heures pour éviter une toux nocturne
**Expectorants** :
-Stimuler la sécrétion bronchique et l'activité ciliaire.
-Ambroxol: Muxol®
**Mucorégulateurs**:
-Améliorer la composition du mucus (quantité et viscosité).
-Carbocystéine: Bronchokod®
**Produits à base de Plantes Toux Grasse** :
-Eucalyptus: expectorant
-Lierre grimpant: antispasmodique et mucolytique
-Romarin: fluidifiant
-Plantain
-ex: Prospan®, Pectal®.
**Effets indésirables**: nausées, vomissements ou diarrhées
**Contre-indications**: Ulcère gastro-duodénal, enfant< 2ans
**Homéopathie Toux Grasse** :
-Bryonia alba 5 CH : Conseillé à raison de 5 granules toutes les 2 heures

### Toux sèche (Custom)

**Antitussifs Opiacés (sur prescription médicale)** : Codéine, Dextrométhorphane
-Effets indésirables principaux: somnolence, dépression respiratoire, constipation, dépendance
-Contre-indication: insuffisance respiratoire, enfant<12 ans, asthme, grossesse
-Ex:Pectolyse®, Pulmosérum®
**Antitussifs Antihistaminiques H1** : Oxomémazine
-Utile pour toux nocturne,
-Effets indésirables: Somnolence,
-Contre-indication: Nourrissons <2 ans, rétention urinaire, troubles prostatiques, glaucome à angle fermé
-Ex: Toplexil®
**Antitussifs Non-Opiacés Non-Histaminiques**: Oxéladine
-ex: Paxeladine®
**Homéopathie Toux Sèche** : Bryonia alba 5 CH, Drosera 5 CH, spécialités comme Stodal®.
**Phytothérapie Toux Sèche** :
-Mauve, Guimauve, Plantain: adoucissantes et antitussives
-Thym: antiseptique
-Lierre grimpant: antispasmodique, expectorant
-ex: Tussiben®, Biocalm®

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que la toux ?
  R: Un réflexe naturel de défense de l'organisme pour expulser les agents irritants des voies respiratoires.
- Q: Comment classifie-t-on la toux selon sa durée ?
  R: Aiguë (< 3 semaines), Subaiguë (3-8 semaines), Chronique (> 8 semaines).
- Q: Quelles sont les caractéristiques d'une toux sèche ?
  R: Irritative, non-productive, sans expectorations, souvent fatigante et nocturne.
- Q: Quelle famille de médicament peut-elle provoquer une toux ?
  R: Les inhibiteurs de l'enzyme de conversion (IEC) peuvent causer une toux sèche chez les patients.
- Q: Citez deux maladies virales pouvant être associées à une toux.
  R: La Rhino-pharyngite (Rhume) , La Bronchite.
- Q: Quel est le principe de traitement d'une toux sèche ?
  R: Bloquer la toux sèche par utilisation des antitussifs (opiacés, antihistaminiques, non-opiacés).
- Q: Peut-on stopper une toux grasse ? Pourquoi?
  R: Non, car elle est productive et permet l'élimination des sécrétions et impuretés et donc dégager les voies respiratoires.
- Q: A partir de quel âge la codéine est-elle utilisable chez l'enfant?
  R: La codéine peut être utilisée chez l'enfant comme antitussif à partir de l'âge de 12 ans.
- Q: Quels sont les effets indésirables de la carbocistéine?
  R: La carbocistéine peut provoquer des troubles gastrointestinaux type gastralgies, nausées et diarrhées.
- Q: Quelle est la durée maximale d'utilisation des médicaments contre la toux?
  R: On conseille le patient de ne pas prolonger le traitement par les médicaments de la toux plus de 5 jours.

---

# Vaccination Antigrippale: conseils à l'officine

**Type:** savoir | **Thème:** Maladies courantes | **Système:** ORL & Respiration | **Niveau:** Facile

> Analyse des aspects essentiels de la vaccination antigrippale, des caractéristiques du virus, des populations à risque, des objectifs et recommandations vaccinales, ainsi que des propriétés et effets indésirables du vaccin pour une gestion optimale au comptoir.

### Nouvelle Section (Custom)

### Conseils Traitement

### Flashcards (Révision)

- Q: Quels sont les objectifs de la vaccination antigrippale ?
  R: Objectifs de la vaccination antigrippale: Prévenir l'infection par le virus de la grippe, Réduire la gravité de la maladie, Prévenir les complications graves, y compris l'hospitalisation et le décès.
- Q: Quelles sont les populations prioritaires pour la vaccination antigrippale ?
  R: Les personnes âgées de 65 ans et plus, Les personnes atteintes de maladies chroniques, Les femmes enceintes, Les nourrissons (à partir de 6 mois) et les jeunes enfants, Les professionnels de santé.
- Q: Quand est-il généralement recommandé de se faire vacciner contre la grippe ?
  R: Il est généralement recommandé de se faire vacciner en automne, avant le début de la circulation des virus grippaux, idéalement entre octobre et décembre.
- Q: Combien de temps faut-il pour que le vaccin antigrippal soit efficace après l'injection ?
  R: Il faut environ 2 semaines après l'injection pour que le système immunitaire développe une protection suffisante contre le virus de la grippe.
- Q: Quels sont les effets secondaires courants du vaccin antigrippal ?
  R: Les effets secondaires courants sont généralement légers et transitoires : douleur, rougeur ou gonflement au site d'injection, maux de tête, douleurs musculaires, fièvre légère, et fatigue.
- Q: Un patient peut-il attraper la grippe à cause du vaccin ?
  R: Non, le vaccin antigrippal ne peut pas donner la grippe car il contient des composants viraux, incapables de provoquer la maladie. Il peut parfois provoquer des symptômes pseudo-grippaux légers et temporaires.
- Q: Pourquoi la composition du vaccin antigrippal change-t-elle chaque année ?
  R: Car les virus grippaux évoluent constamment. L'OMS recommande une nouvelle composition basée sur les souches virales les plus susceptibles de circuler la saison suivante.
- Q: Quelle est la principale contre-indication absolue au vaccin antigrippal ?
  R: La principale contre-indication absolue est une réaction allergique sévère (anaphylaxie) à une dose antérieure du vaccin ou à l'un de ses composants (par exemple, des traces d'œuf pour certains vaccins).
- Q: Qu'est-ce qu'un vaccin antigrippal quadrivalent ?
  R: Un vaccin quadrivalent protège contre quatre souches de virus grippaux : deux souches de type A et deux souches de type B.
- Q: Le vaccin antigrippal protège-t-il contre le rhume ?
  R: Non, le vaccin antigrippal ne protège pas contre le rhume (rhinopharyngite), qui est causé par d'autres types de virus (ex: rhinovirus, coronavirus) et non par le virus de la grippe.

---

# Diabète Type 2 : Mémofiche 1: La Pathologie

**Type:** savoir | **Thème:** Pharmacologie | **Système:** Diabète | **Niveau:** Facile

> Cette mémofiche fournit un aperçu détaillé du diabète de type 2 (DT2), abordant son contexte épidémiologique spécifique à la Tunisie, ses mécanismes physiopathologiques, les symptômes révélateurs et les complications majeures à moyen et long terme. Elle est destinée à harmoniser et améliorer la prise en charge pharmaceutique de cette pathologie chronique.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que le Diabète de Type 2 ?
  R: C'est une maladie chronique caractérisée par une hyperglycémie due à une insulinorésistance et/ou un déficit de sécrétion d'insuline.
- Q: Quels sont les principaux facteurs de risque du Diabète de Type 2 ?
  R: L'obésité, la sédentarité, les antécédents familiaux, l'âge et l'hypertension artérielle.
- Q: Citez trois symptômes courants du Diabète de Type 2.
  R: Polyurie (uriner souvent), polydipsie (soif intense), polyphagie (faim excessive), fatigue, vision floue ou infections fréquentes.
- Q: Quelle est la principale caractéristique de l'insulinorésistance ?
  R: Les cellules du corps ne répondent pas efficacement à l'insuline, ce qui empêche le glucose d'entrer dans les cellules et élève le taux de sucre dans le sang.
- Q: Nommez deux complications macrovasculaires du Diabète de Type 2.
  R: Maladie coronarienne, accident vasculaire cérébral (AVC) ou artériopathie des membres inférieurs.
- Q: Nommez deux complications microvasculaires du Diabète de Type 2.
  R: Rétinopathie diabétique, néphropathie diabétique ou neuropathie diabétique.
- Q: Quelles sont les complications à court terme du diabète du type 2 ?
  R: L'Hypoglycémie, Le Coma Hyperosmolaire.
- Q: Quel est l'objectif principal du traitement du Diabète de Type 2 ?
  R: Maintenir la glycémie à des niveaux cibles pour prévenir les complications à long terme.
- Q: Pourquoi la détection précoce du Diabète de Type 2 est-elle importante ?
  R: Pour initier rapidement le traitement et ralentir ou prévenir l'apparition des complications graves.
- Q: Quelle hormone est-elle déficiente ou inefficace dans le Diabète de Type 2 ?
  R: L'Insuline.

---

# Diabète type 2: Mémofiche 2: Traitements Conventionnels

**Type:** pharmacologie | **Thème:** Pharmacologie | **Système:** Diabète | **Niveau:** Facile

> Cette mémofiche détaille la prise en charge individualisée et globale du Diabète de Type 2 (DT2), incluant les objectifs glycémiques, tensionnels et pondéraux, ainsi que la stratégie thérapeutique de première ligne et les traitements médicamenteux conventionnels.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est l'objectif principal du traitement du diabète de type 2 ?
  R: Prévenir les complications macro et microvasculaires et maintenir une glycémie équilibrée.
- Q: Quel est l'objectif glycémique de l'HbA1c pour la plupart des patients diabétiques de type 2, selon les recommandations générales ?
  R: Généralement inférieur à 7%.
- Q: Quel est le traitement de première ligne recommandé pour le diabète de type 2 en l'absence de contre-indications ?
  R: La metformine.
- Q: Quels sont les principaux piliers de la prise en charge non médicamenteuse du diabète de type 2 ?
  R: Les mesures hygiéno-diététiques (alimentation équilibrée, activité physique régulière, gestion du poids).
- Q: Citez une classe de médicaments antidiabétiques oraux agissant en stimulant la sécrétion d'insuline.
  R: Les sulfonylurées ou les glinides.
- Q: Quels sont les principaux risques associés aux sulfonylurées et glinides ?
  R: L'hypoglycémie et la prise de poids.
- Q: Quel est le mécanisme d'action principal des inhibiteurs de SGLT2 ?
  R: Ils augmentent l'élimination du glucose par les urines.
- Q: Quand l'insulinothérapie est-elle envisagée dans le diabète de type 2 ?
  R: Lorsque les antidiabétiques oraux et autres injectables non insuliniques ne suffisent plus à contrôler la glycémie, ou en cas de contre-indications majeures.
- Q: Quel est l'effet de l'activité physique régulière sur la sensibilité à l'insuline ?
  R: Elle l'améliore.
- Q: Citez une complication microvasculaire fréquente du diabète de type 2.
  R: La rétinopathie diabétique, la néphropathie diabétique ou la neuropathie diabétique.

---

# Diabète Type2: Mémofiche 3: Nouveaux Traitements

**Type:** pharmacologie | **Thème:** Pharmacologie | **Système:** Diabète | **Niveau:** Facile

> L'approche thérapeutique du diabète a évolué depuis 2015, intégrant la protection cardiovasculaire (CV) et rénale. Il est recommandé d'ajouter ou de remplacer par un antihyperglycémiant aux bénéfices CV ou rénaux démontrés en cas d'HbA1c non atteinte ou de comorbidités CV/rénales.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est le mécanisme d'action principal des Gliflozines ?
  R: Les Gliflozines agissent en inhibant le co-transporteur sodium-glucose de type 2 (SGLT2) dans les reins, ce qui entraîne une augmentation de l'excrétion urinaire de glucose et une diminution de la glycémie.
- Q: Que signifie l'acronyme AR GLP-1 et quel est leur rôle dans le traitement du diabète ?
  R: AR GLP-1 signifie Agonistes des Récepteurs du Glucagon-Like Peptide-1. Ils miment l'action de l'hormone incrétine GLP-1, stimulant la sécrétion d'insuline de manière glucose-dépendante, inhibant la sécrétion de glucagon, ralentissant la vidange gastrique et favorisant la satiété.
- Q: Comment les Gliptines agissent-elles pour réduire la glycémie ?
  R: Les Gliptines (inhibiteurs de la DPP-4) agissent en bloquant l'enzyme dipeptidyl peptidase-4 (DPP-4), qui est responsable de la dégradation des hormones incrétines (GLP-1 et GIP). En inhibant la DPP-4, elles augmentent la concentration et prolongent l'action des incrétines, stimulant ainsi la sécrétion d'insuline et réduisant celle de glucagon de manière glucose-dépendante.
- Q: Citez un effet secondaire courant des Gliflozines.
  R: Les infections génito-urinaires (mycoses vaginales, infections urinaires) sont des effets secondaires courants en raison de l'augmentation du glucose dans les urines.
- Q: Quel est un avantage cardiovasculaire potentiel de certaines Gliflozines ?
  R: Certaines Gliflozines ont démontré une réduction des événements cardiovasculaires majeurs et des hospitalisations pour insuffisance cardiaque chez les patients atteints de diabète de type 2.
- Q: Citez un effet secondaire gastro-intestinal fréquent avec les AR GLP-1.
  R: Des nausées, vomissements et diarrhées sont fréquemment rapportés avec les AR GLP-1, surtout en début de traitement.
- Q: Les Gliptines sont-elles associées à un risque élevé d'hypoglycémie en monothérapie ?
  R: Non, les Gliptines ont un faible risque d'hypoglycémie en monothérapie car leur action est glucose-dépendante.
- Q: Quel type d'administration est le plus courant pour les AR GLP-1 ?
  R: La plupart des AR GLP-1 sont administrés par injection sous-cutanée (quotidienne ou hebdomadaire), bien qu'une formulation orale de sémaglutide existe.
- Q: Les Gliflozines sont-elles recommandées chez les patients présentant une insuffisance rénale sévère ?
  R: L'efficacité des Gliflozines diminue avec la fonction rénale et leur utilisation est souvent déconseillée ou contre-indiquée en cas d'insuffisance rénale sévère.
- Q: Quel est un effet commun des AR GLP-1 qui peut être bénéfique pour les patients en surpoids ?
  R: Les AR GLP-1 peuvent entraîner une perte de poids en raison de leurs effets sur la satiété et le ralentissement de la vidange gastrique.

---

# Rhinopharyngite chez l'enfant: Conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Pédiatrie | **Niveau:** Facile

### Situation Patient / Cas Comptoir

• Une maman s’est présentée à la pharmacie demandant un conseil : « Mon enfant a le nez qui coule, il éternue et tousse depuis quelques jours. Je voudrais un produit pour le soulager de son rhume. Que me conseillez-vous?».

### Aperçu Pathologie

**-\*\***La rhinopharyngite** (rhume) est une infection **virale\*\* **bénigne** de la muqueuse du nez et du pharynx.
**-**Elle est causée **exclusivement** par des **virus** (rhinovirus, coronavirus, etc.).
**-**C'est la pathologie infectieuse **la plus fréquente** chez l'**enfant**, qui peut en contracter **jusqu'à dix** par an avant 2 ans en raison de l'**immaturité** de leur **système immunitaire**.
**-\*\***Symptômes Clés** :
-Fièvre **modérée** (souvent < 38,5), ne durant pas plus de 3 jours. -**Obstruction** (nez bouché) ou **écoulement nasal** (nez qui coule) -**Éternuements**, **toux** (pouvant durer jusqu'à **10** jours et parfois causer des vomissements), et **léger** mal de gorge.
**-\***\*Évolution et Facteurs Favorisants** :
-Le rhume guérit **spontanément** en **7** à **10** jours. Il est **favorisé** par la vie en communauté (crèche), le tabagisme passif, et la sécheresse de l'air.

### Questions Clés

- **-**Quel âge a l'enfant ?
- **-**Depuis quand ces symptômes sont-ils présents ?
- **-**Y a-t-il d'autres symptômes (fièvre, maux de gorge, difficultés à respirer) ?
- **-**Avez-vous déjà essayé un médicament?
- **-**L'enfant est-il suivi pour une pathologie (asthme, immunodéficience) ?

### Signaux d'Alerte (Red Flags)

- **-**Nourrisson de moins de 3 mois (risque de détresse respiratoire).
- **-**Fièvre persistante (> 48h) ou très élevée.
- **-**Symptômes s'aggravant après 5 jours ou persistant après 10 jours sans amélioration.
- **-**Difficulté à respirer, respiration rapide, lèvres bleues.
- **-**Maux d'oreille (otalgie), écoulement de l'oreille (otorrhée), yeux collés par du pus jaunâtre.
- **-**Refus de s'alimenter, vomissements, forte baisse de la ration alimentaire.
- **-**Enfant très irritable ou beaucoup plus endormi que d'ordinaire.
- **-**Enfant asthmatique, immunodéprimé, ou avec des otites fréquentes.

### Traitement Principal

- • **Désobstruction Rhino-Pharyngée (DRP)** (Hygiène nasale) :
- **-**Lavage par du **sérum physiologique** ou de l'**eau de mer isotonique**.
- **-**Réaliser aussi souvent que nécessaire, surtout avant les repas et au coucher, en position allongée tête penchée sur le côté.
- Les bénéfices:
- **-**Décongestionner le nez bouché pour une meilleure respiration et une tétée plus facile.
- **-**Prévenir les complications vers les otites.

### Produits Associés

- **-\*\***Eau de mer hypertonique\*\* Utiliser ponctuellement pour décongestionner par effet osmotique.
- **-\*\***Paracétamol\*\*: 60 mg/kg/jour, réparti en 4-6 prises (15 mg/kg toutes les 6h ou 10 mg/kg toutes les 4h). - Indiqué si fièvre > 38.5°C, douleur, ou irritabilité. Utiliser la dose efficace la plus faible et la durée la plus courte.
- **-\*\***Ibuprofène\*\* : Uniquement chez l'enfant de plus de 3 mois et en cas de contre-indication au paracétamol. - Risque de complications infectieuses
- **-\*\***Aspirine\*\* Formellement contre-indiquée chez l'enfant sans avis médical (Risque de syndrome de Reye)
- **-\*\***Mouche-bébé\*\* : Pour aider à éliminer les sécrétions après lavage nasal
- **-\*\***Sirop pour toux sèche\*\*
- **Guimauve**: dès 3 ans
- **Plantain lancéolé** : dès 3 ans
- **Thym** : dès 4 ans
- -Ex: Humer toux sèche®
- **-\*\***Sirop pour toux grasse\*\*
- **Lierre grimpant** :dès 2 ans
- **Fenouil** : dès 4 ans
- -Ex: Baumix toux grasse®
- **Baumes pour confort respiratoire (aromathérapie)** Eucalyptus radié, Romarin à Verbénone dès 3 mois
- -Ex: Baumix baume®

### Conseils Hygiène de Vie

- **-**Maintenir la chambre fraîche et aérée (entre 18 et 20 °C) pour ne pas assécher les muqueuses.
- **-**Surélever légèrement la tête du lit de l'enfant pour faciliter la respiration en cas de nez bouché.
- **-**Utiliser un humidificateur à air froid ou placer un linge mouillé sur un radiateur si l'air est sec.
- **-**Ne pas fumer au domicile de l'enfant pour prévenir les irritations des voies respiratoires.
- **-**Se laver les mains et celles de l'enfant régulièrement, surtout après avoir toussé, éternué ou s’être mouché.
- **-**Éviter de partager les jouets, tétines, sucettes, biberons ou couverts.
- **-**Éviter les contacts entre les nourrissons de moins de 3 mois et les personnes enrhumées ou les jeunes enfants.

### Conseils Alimentaires

- **-**Faire boire l'enfant suffisamment et régulièrement pour éviter la déshydratation (surtout en cas de fièvre) et fluidifier les sécrétions.
- **-**Proposer de petits repas nutritifs et légers si l'enfant refuse de manger.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que le rhume (rhinopharyngite) chez l'enfant?
  R: C'est une infection virale bénigne de la muqueuse nasale et pharyngée.
- Q: Quelle est la dose maximale journalière de paracétamol recommandée pour un enfant?
  R: 60 mg/kg/jour, répartie en 4 à 6 prises.
- Q: Quel est le geste essentiel d'hygiène nasale en cas de rhume chez l'enfant?
  R: La Désobstruction Rhino-Pharyngée (DRP) avec sérum physiologique isotonique ou eau de mer isotonique.
- Q: Jusqu'à quelle quantité de sérum physiologique peut-on utiliser par narine pour une DRP?
  R: Jusqu'à 2ml par narine.
- Q: Dans quel cas l'eau de mer hypertonique est-elle indiquée pour le rhume de l'enfant?
  R: Pour une obstruction nasale importante, ponctuellement et pour une courte durée, afin de décongestionner par effet osmotique.
- Q: Pourquoi l'aspirine est-elle contre-indiquée chez l'enfant en cas de rhume sans avis médical?
  R: En raison du risque de syndrome de Reye.
- Q: Pourquoi doit-on envoyer l'enfant enrhumé de moins de 3 mois au médecin?
  R: Car il y a risque de détresse respiratoire.
- Q: Quels sont les signes de détresse respiratoire à surveiller chez un enfant enrhumé?
  R: Difficulté à respirer, respiration rapide, lèvres bleues.
- Q: A partir de quel âge peut-on utiliser les sirops à base de lierre grimpant?
  R: Le lierre grimpant peut être utilisé à partir de l'âge de 2 ans.
- Q: Quels conseils hygiéno-diététiques donner aux parents de l'enfant enrhumé?
  R: Faire boire l'enfant suffisamment et régulièrement, Surélever légèrement la tête du lit de l'enfant pour faciliter la respiration en cas de nez bouché, Se laver les mains et celles de l'enfant régulièrement.

---

# Psoriasis : CAO - Conseil Associé à l'Ordonnance

**Type:** ordonnances | **Thème:** Ordonnances | **Système:** Santé cutanée | **Niveau:** Facile

### Nouvelle Section (Custom)

### Nouvelle Section (Custom)

### Nouvelle Section (Custom)

### Nouvelle Section (Custom)

### Ordonnance

- - **Patient** : Adulte, 45 ans.
- - **Pathologie** : Psoriasis en plaques, impact faible à modéré sur la qualité de vie.
- - **Localisation** : Coudes et genoux.
- - **Contexte** : Aggravation due à un choc émotionnel (stress).
- - **Prescription** : Calcipotriol 50 µg/g + Bétaméthasone 0,5 mg/g pommade, tube de 60g.
- - **Posologie** : Appliquer 1 fois par jour le soir sur les lésions.
- - **Durée** : Ne pas dépasser 100g/semaine.

### Analyse de l'Ordonnance

- -**Objectif** :
- -Contrôler les symptômes
- -Réduire rapidement l'inflammation et les squames.
- -**Profil du patient**
- -**Motif de consultation**:
- -Vérifier s'il s'agit d'une **initiation** de traitement ou d'un **renouvellement** suite à une **poussée** pour adapter les conseils.
- -**Antécédents**:
- -Vérifier les médicaments prescrits et les antécédents médicaux (pathologies, traitements en cours, automédication) pour identifier d'éventuelles contre-indications ou interactions médicamenteuses.
- -**Localisation**:
- -Vérifier qu'elles sont les zones **atteintes**

### Conseils Traitement

**Calcipotriol/Bétaméthasone**:

- -Dermocorticoïde et analogue de la vitamine D combinés
- - **Application** :
- -Appliquer une **fine** couche **1** fois par jour, le **soir** de préférence, **uniquement** sur les **plaques**.
- - **Hygiène** :
- -Se laver les mains après application (sauf si les mains sont traitées).
- - **Effets secondaires** :
- Risque d'**irritation** en **début** de traitement.
- - **Contre-indications** :
- -Ne pas appliquer sur le visage.
- - **Arrêt** :
- -Ne pas arrêter **brutalement** le traitement pour **éviter** un **effet rebond**.
- - **Quantités** :
- -La dose maximale **journalière** ne doit pas dépasser **15** g
- -La dose maximale **hebdomadaire** **100**g/semaine
- - **Durée** :
- -Éviter l'utilisation prolongée sur de grandes surfaces risque de tachyphylaxie (Diminution rapide de l'effet d'un médicament lors d'administrations successives)

### Flashcards (Révision)

- Q: Quel est l'objectif principal du traitement du psoriasis?
  R: Contrôle des symptômes, pas de guérison définitive.
- Q: Quelle est la dose maximale hebdomadaire recommandée pour les topiques contenant du calcipotriol/bétaméthasone?
  R: 100g/semaine.
- Q: Pourquoi est-il important d'éviter l'arrêt brutal des traitements topiques pour le psoriasis?
  R: Risque de rebond des symptômes.
- Q: Comment doit-on appliquer les topiques à base de calcipotriol/bétaméthasone?
  R: Appliquer une fine couche 1 fois par jour, le soir de préférence, uniquement sur les plaques.
- Q: Quels sont les facteurs déclenchants du psoriasis?
  R: Stress, chocs émotionnels, infections (streptococciques), traumatismes cutanés (phénomène de Koebner).
- Q: Quels sont les médicaments qui peuvent aggraver le psoriasis?
  R: Bêtabloquants, Lithium, IEC, Antipaludéens de synthèse.
- Q: Quels sont les conseils d'hygiène de vie pour les patients atteints de psoriasis?
  R: Douches tièdes et rapides, nettoyants doux, hydratation quotidienne.
- Q: Quels aliments sont-ils à privilégier dans l'alimentation d'un patient atteint de psoriasis?
  R: Acides gras Oméga-3 (huiles végétales, poissons gras).
- Q: Quels types de soins cosmétiques sont-ils recommandés pour les patients atteints de psoriasis?
  R: Soins Émollients & Kératolytiques, Produits d'Hygiène Adaptés.
- Q: Pourquoi faut-il éviter l'application de calcipotriol/bétaméthasone sur le visage?
  R: L'utilisation du dermocorticoïde sur la peau sensible du visage entraîne des effets indésirables type amincissement, rougeur, irritation.

---

# Les Antibiotiques: Guide à l'officine

**Type:** le-medicament | **Thème:** Pharmacologie | **Système:** N/A | **Niveau:** Facile

> Les Antibiotiques
> I. Définition des antibiotiques
> Définition
> Qu'est-ce qu'un antibiotique ?
> Les ...

### Situation Patient / Cas Comptoir

Les Antibiotiques
I. Définition des antibiotiques
Définition
Qu'est-ce qu'un antibiotique ?
Les antibiotiques sont des médicaments destinés à traiter les infections bactériennes
Ils agissent soit en empêchant le développement des bactéries (bactériostatiques), soit en les tuant (bactéricides)
Qu’est ce qu’une bactérie?
Micro-organisme, généralement unicellulaire, caractérisé par la structure de son noyau procaryote, son mode de division cellulaire par scissiparité (ou fission binaire) et sa paroi contenant des peptidoglycanes.

II. Les grandes familles d’antibiotiques :

1. β-lactamines (Pénicillines et Céphalosporines): Bactéricides

Mécanisme
Inhibition de la synthèse de la paroi bactérienne. Cette famille partage un noyau structural commun, le noyau bêtalactame.
Exemples
Pénicillines : Naturelles (Pénicilline G, V), du groupe M (Oxacilline, Cloxacilline), Aminopénicillines (Amoxicilline), et Urédopénicillines (Pipéracilline). Céphalosporines : Classées en générations (Céfalexine, Céfuroxime, Céfixime, Ceftriaxone, etc.).
Indications
Infections ORL, bronchiques, urinaires, cutanées. La Pénicilline V est notamment utilisée dans les angines documentées à streptocoque β-hémolytique du groupe A (SGA).
EI Majeurs
Allergies : C'est le risque le plus fréquent. Elles sont croisées avec les céphalosporines dans 5 à 10 % des cas. Le pharmacien doit interroger le patient sur ses antécédents allergiques avant toute délivrance, car l'allergie impose l'arrêt immédiat du traitement.
Autres EI
Troubles digestifs (nausées, vomissements, diarrhées). Risque de colite pseudo-membraneuse (CPM) possible, bien qu'exceptionnel.
Interactions
Potentialisation de l'activité des anticoagulants coumariniques (risque hémorragique).
L'association avec le méthotrexate est déconseillée (augmentation de sa toxicité hématologique).
Prise
Amoxicilline: pendant ou en dehors
Amoxicilline+ Ac.clavulanique: après repas pour limiter les EI digestifs
Céfuroxime axétil: pendant les repas pour une meilleure absorption
Pénicilline V: Phénoxyméthylpénicilline: À jeun (Min. 1h avant ou 2h après le repas): la nourriture diminue l’absorption

2. Macrolides et apparentés: Bactériostatiques

Mécanisme
Inhibition de la synthèse protéique bactérienne en se fixant sur la sous-unité 50S des ribosomes.
Exemples
Azithromycine, Clarithromycine, Érythromycine (le plus ancien). Les Lincosamides (Clindamycine) et les Synergistines (Pristinamycine) sont apparentés.
Indications
Infections ORL, respiratoires, cutanées, et certaines IST. Utiles en cas d'allergie à la pénicilline (ex: angine bactérienne). La Clarithromycine est utilisée dans le traitement d'Helicobacter pylori.
Prise
Clarithromycine: recommandé avec les repas pour améliorer la tolérance digestive.
Azithromycine, Spiramycine: Absorption généralement peu affectée.
Érythromycine: à jeun: Absorption diminuée par la nourriture
EI/Risques
Généralement bien tolérés, avec des effets indésirables mineurs, principalement digestifs (nausées, vomissements, diarrhées). Risque d'allongement de l’espace QT (Érythromycine, Clarithromycine).
Interactions
Inhibition enzymatique (cytochrome P450 3A4) entraînant un risque important d'interactions médicamenteuses. L'Azithromycine et la Spiramycine ont un pouvoir inhibiteur moindre.
Exp: La clarithromycine associée à l’atorvastatine peut majorer la rhabdomyolyse
Note Lincosamides
La Clindamycine (un lincosamide) est parmi les antibiotiques les plus impliqués dans la survenue de colites pseudo-membraneuses (CPM) graves à Clostridium difficile, nécessitant l'arrêt immédiat du traitement en cas de diarrhée.

3. Fluoroquinolones: Bactéricides

Mécanisme
Inhibent le fonctionnement de l'ADN, spécifiquement par inhibition de l’ADN-gyrase bactérienne.
Exemples
Ciprofloxacine, Lévofloxacine, Norfloxacine, Ofloxacine.
Indications
Infections urinaires, respiratoires, digestives.
EI Majeurs
Toxicité tendineuse : Le risque le plus important est l'atteinte tendineuse (douleurs aux chevilles) pouvant aller jusqu'à la rupture tendineuse. L'arthropathie est également à surveiller, surtout chez l'enfant.
Autres EI
Photosensibilisation : Éviter l’exposition au soleil/UV. Troubles neurologiques (convulsions, réactions psychotiques).
Précautions
Utilisation prudente chez les patients ayant des antécédents de convulsions.
Prise
Absorption diminuée par les produits laitiers

4. Tétracyclines (Cyclines): Bactériostatiques
   Mécanisme
   Inhibition de la synthèse protéique bactérienne en se fixant sur la sous-unité 30S des ribosomes.
   Exemples
   Doxycycline, Tétracycline
   Indications
   Infections pulmonaires atypiques, acné, maladie de Lyme, Rickettsioses, Fièvre Q. La Doxycycline est aussi utilisée pour la prophylaxie du paludisme dans les régions de forte résistance.
   EI Majeurs
   Coloration dentaire permanente : Formation de complexes calcium/cycline, causant une coloration anormale (jaune à brun) et une fragilité des dents. Contre-indiquées chez l’enfant de moins de 8 ans et chez la femme enceinte ou allaitante. Photosensibilisation : Fréquente (Doxycycline et Minocycline), nécessité d'éviter l'exposition solaire et de se protéger
   Prise
   Doit être prise à distance des produits laitiers (lait et dérivés) ainsi que des sels de fer ou des topiques gastro-intestinaux, car les cations (Fe²⁺, Al²⁺, Ca²⁺, Mg²⁺) diminuent l'absorption digestive (formation de chélates).
   La prise doit se faire avec une quantité suffisante de liquide, loin du coucher, pour éviter les ulcérations de l'œsophage
   Interactions
   Association contre-indiquée avec les rétinoïdes (risque d’hypertension intracrânienne).

5. Aminosides (Aminoglycosides): Bactéricides

Mécanisme
Inhibition de la synthèse protéique (fixation sur la sous-unité 30S des ribosomes). Ils sont bactéricides.
Exemples
Gentamicine, Amikacine, Streptomycine, Tobramycine.
Indications
Réservés aux infections généralement sévères. Souvent associés à une bêtalactamine pour un effet synergique. La seule indication en monothérapie est l'infection urinaire. La Streptomycine est limitée à la tuberculose résistante, la brucellose, la tularémie et la peste.
Prise
Principalement par voie parentérale (IM, IV), car ils sont très peu absorbés par voie digestive. L’insuffisance rénale nécessite une adaptation de posologie individualisée.
EI Majeurs
Ototoxicité : Atteintes irréversibles de l'oreille interne, pouvant causer vertiges et altération de l’audition (cumulative).
Néphrotoxicité : Touche environ 20 % des patients traités (néphropathie tubulaire proximale, généralement réversible). La Gentamicine est considérée comme la molécule la plus toxique dans cette classe.
Précautions
Les risques toxiques (néphro et oto) sont majorés lors de l’association avec des médicaments néphrotoxiques ou ototoxiques (ex: Amphotéricine B, certaines céphalosporines, diurétiques de l’anse).

III. Focus sur le Microbiote et la Diarrhée Associée aux Antibiotiques (DAA) 🦠
Impact des antibiotiques sur le microbiote
L’utilisation des antibiotiques perturbe, à des degrés divers, l’équilibre du microbiote intestinal (dysbiose). Cette perturbation s’installe souvent rapidement (dès 24 heures après le début) et peut favoriser le développement de micro-organismes pathogènes, comme Clostridium difficile.
La Diarrhée Associée aux Antibiotiques (DAA)
La DAA est définie par l’émission d’au moins trois selles très molles à liquides par 24 heures, pendant au moins 24 heures, survenant pendant ou dans les deux mois suivant l'arrêt d’un traitement antibiotique. Sa fréquence varie de 5 à 25 % selon l’antibiotique.
Les mécanismes de la DAA sont doubles :
Une prolifération de micro-organismes pathogènes (perte de l’effet de "barrière").
Une altération des fonctions métaboliques du microbiote.
Facteurs de risque de DAA
Le risque de DAA augmente avec :
La largeur du spectre de l’antibiotique.
La durée de l’antibiothérapie (plusieurs semaines).
L’excrétion par voie biliaire (ex: Amoxicilline, Pristinamycine).
Les âges extrêmes : moins de 6 ans ou plus de 65 ans.
Les antécédents de DAA ou un intestin fragile/irritable.
La Colite Pseudo-Membraneuse (CPM)
La CPM est la forme la plus grave de DAA, causée par une infection à Clostridium difficile.
Antibiotiques les plus impliqués : Bêtalactamines, Lincomycine et surtout la Clindamycine.
Pronostic : Sévère, avec une mortalité allant de 10 à 30 %.
Traitement : Arrêt impératif de l’antibiotique responsable et mise en place d’une antibiothérapie spécifique (Métronidazole ou Vancomycine).
Rôle des Probiotiques
La prise de probiotiques (médicaments du microbiote, ou "flore de substitution") peut minimiser ou prévenir la survenue d’une DAA.
Conseil de Prise
Détail
Moment
Doivent être pris à distance de l'antibiotique.
Durée
Poursuivre la prise pendant toute la durée du traitement et éventuellement quelques jours après son arrêt.
Efficacité
Ils permettent de réduire la fréquence des récidives chez les patients présentant une infection à Clostridium difficile.

IV. L’antibiorésistance et Rôle de l’équipe officinale 🛡️
L'antibiorésistance est la capacité des bactéries à survivre et à se multiplier en présence d'antibiotiques qui étaient auparavant efficaces pour les combattre
Cela se produit lorsqu'une bactérie se transforme et développe des mécanismes de défense, diminuant ou annulant l'action des antibiotiques
Cette résistance rend les infections plus difficiles à guérir, même les plus courantes
Causes et Conséquences de l'Antibiorésistance
Les principales causes de l'antibiorésistance sont :
La mauvaise observance du traitement (arrêt prématuré).
L'automédication (réutilisation).
Le mauvais choix ou la surprescription d’antibiotiques.
La pression de sélection exercée par les antibiotiques affecte non seulement les bactéries pathogènes, mais aussi celles du microbiote humain, favorisant la diffusion des gènes de résistance.
Le rôle clé de l’équipe officinale 💡
Le pharmacien (et par extension le préparateur) a un rôle majeur dans l'information du public et l’optimisation de l’antibiothérapie.
Rôle du Préparateur
Conseils
Bonne Observance
Insister sur la posologie et la durée complète du traitement pour garantir l'efficacité et un moindre risque de sélection de bactéries résistantes. Indiquer la posologie et la durée sur chaque boîte.
Prévention des EI
Conseiller de prendre un probiotique pour minimiser l'impact digestif (DAA). Rappeler les précautions spécifiques (ex: photosensibilisation, régime alimentaire).
Limiter le Mésusage
Préciser que le médicament ne doit jamais être utilisé en automédication, et que les antibiotiques n'agissent que sur les bactéries.
Prévention générale
Rappeler les règles hygiéno-diététiques et promouvoir la vaccination, stratégies nécessaires pour limiter l’usage des antibiotiques.

Références
APC, Birmingham Antibiotic Advisory Group, & Public Health England. (2021). Summary of antimicrobial prescribing guidance – managing common infections. In Public Health England.
BUXERAUD, J., & FAURE, S. (2022). Les cyclines. Actualités Pharmaceutiques, Supplément préparateur au n° 614, 1–26. http://dx.doi.org/10.1016/j.actpha.2021.12.037
Buxeraud, J. (2021). Impact des antibiotiques sur le microbiote intestinal. Actualités Pharmaceutiques, 60(607), S18–S19. https://doi.org/10.1016/j.actpha.2021.04.006
Buxeraud, J. Faure, S. Les antibiotiques divers. Actualités pharmaceutiques • Supplément formation au n° 558 • 3e trimestre 2016 •
Buxeraud, J. Faure, S. Les bêtalactamines. Actualités pharmaceutiques • Supplément formation au n° 558 • 3e trimestre 2016 •
Buxeraud, J., & Faure, S. (2016). Les aminosides ou aminoglycosides. Actualités Pharmaceutiques, 55(558), 13–16. https://doi.org/10.1016/j.actpha.2016.06.003
Buxeraud, J., & Faure, S. (2022). Les macrolides et apparentés. Actualités Pharmaceutiques, 61(618), 23–26. https://doi.org/10.1016/j.actpha.2022.07.023
Les effets indésirables des antibiotiques. (2014). Actualités Pharmaceutiques, 53(Suppl. 1), S10.
Vernhet, A., Licznar-Fajardo, P., & Jumas-Bilak, E. (2016). Antibiorésistance, quels rôles pour le pharmacien d’officine ? Actualités Pharmaceutiques, 55(556), 37–40. https://doi.org/10.1016/j.actpha.2016.03.009

### Conseils Traitement

---

# Conseil des Anti Parasitaires Externes chez le Chat et le Chien

**Type:** maladie | **Thème:** Pharmacie vétérinaire | **Système:** Santé cutanée | **Niveau:** Facile

### Situation Patient / Cas Comptoir

Un jeune homme se présente à l'officine et demande votre conseil: "Je veux un produit protecteur pour mon animal contre les puces et les tiques."

### Aperçu Pathologie

• **.Pulicose**: **البرغوث**:Infestation par des puces hématophages
**-**Signes: **prurit intense**, petits **points noirs** dans le pelage,**lésions cutanées** et même la DAPP
**-**Attention: **95%** du cycle parasitaire se déroule dans l'**Environnement**.
• **.Poux**: **القمل**: Infestation par des insectes parasites broyeurs
**-**Signes: **prurit**, **irritation cutanée**, dégradation du pelage.
**-**Les **poux adultes** et les **lentes** attachées aux poils sont visibles.
• **.Tiques**: **القراد**: Acariens hématophages se fixant à la peau, entraînent une anémie si infestation massive.
**-**Peuvent **transmettre** la **Maladie de Lyme** et la **Piroplasmose**.
• **.Aoûtats **: Acarien fréquent en fin d'été chez les animaux ayant accès à l'extérieur, causant des piqûres sans gravité particulière.
• **.Gale des oreilles**: Infestation du conduit auditif par un acarien, surtout chez les jeunes animaux.
**-**Signes: un **prurit auriculaire intense**, secouement de tête et un **exsudat cérumineux noirâtre**.
• **.Gale**: Affection cutanée **contagieuse** due à Sarcoptes scabiei canis (chien) ou Notoedres cati (chat)
**-**Signes:** prurit intense**débute à partir de la tête, lésions cutanées étendues et perte de poils.
**-**Zoonose **transmissible à l'homme**.

• **Démodécie canine**: Prolifération anormale de l'acarien Demodex canis dans les follicules pileux, fréquente chez les **chiots** (3 mois-2 ans)
**-**Signes: des **pertes de poils** surtout **localisées**, parfois **généralisées** et **prurigineuses**.

### Questions Clés

- • **Concernant l'Animal**:
- **-**Est-ce un **chat** ou un **chien**, quel est son âge et son poids?
- • **-**A-t-il accès à l'**extérieur** (jardin, promenades)?
- • **-**Est-ce le seul animal de compagnie? Si non, quels sont les autres animaux et sont-ils traités?
- • **-Foyer**: Y a-t-il des enfants en bas âge dans le foyer qui pourraient être en contact avec l'animal traité?
- • **En cas d'infestation**:
- **-**Quels **signes** avez-vous remarqué (démangeaisons, rougeurs, pertes de poils, autres symptômes)?
- • **-**Depuis combien de temps ces symptômes sont-ils présents?
- • **-**Avez-vous vu des **puces**, des **tiques** ou d'autres parasites sur l'animal?
- • **-**Si puces, avez-vous remarqué de petits **points noirs** dans le pelage?
- • **-**Si tiques, depuis quand les avez-vous remarquées?
- • **-**Pour les chats, se gratte-t-il les oreilles ou y a-t-il un dépôt noir?
- • **-T**Avez-vous déjà utilisé un traitement antiparasitaire? Si oui, lequel et avec quelle efficacité?
- • **En Prévention**:
- **-**Contre quoi souhaitez-vous protéger votre animal principalement (puces, tiques, autres)?
- • **-**Votre animal est-il exposé à des risques particuliers (contact avec d'autres animaux infestés)?
- • **-**Quelle forme d'antiparasitaire préférez-vous (spot-on, spray, collier, shampooing)?
- • **-**À quelle fréquence souhaitez-vous administrer le traitement?

### Signaux d'Alerte (Red Flags)

- • **-Première** infestation ou infestation **sévère**
- • **-Animaux sensibles**: Animaux très jeunes (moins de 8 semaines), âgés, gestantes, allaitantes ou malades nécessitent un avis vétérinaire avant tout traitement.
- • **-** Présence de **symptômes généraux**: fièvre, abattement, perte d'appétit, indiquant une potentielle complication.
- • **-** Présence de lésions cutanées **étendues** ou **purulentes**.
- • **-** Suspicion de **gale** en raison de sa nature contagieuse et zoonotique.
- • **-Inefficacité** d'un traitement antiparasitaire antérieur.

### Traitement Principal

- • **PRODUITS A CONSEILLER**
- **-Fipronil en Spot-on**
- **.** **Fipronil**: Acaricide et Insecticide.
- **.** Exemples: FRONTLINE® Spot-on Chat/Chien** et **EFFIPRO® Spot-on\*\*
- **.**Appliquer **1** pipette par animal entre les omoplates ou à la base du cou. **.**Protection contre les **puces** et les **tiques** pendant **4 semaines**.
- • ** -Association Fipronil et Perméthrine en Spot-on**:
- **.**Acaricide, Insecticide avec un effet Répulsif.
- **.** Exemples: **FRONTLINE® TriAct Spot-on** et **EFFITIX® Spot-on**
- **.**Pour chiens uniquement, Toxique pour les chats.
- **.**Protection contre les puces, les tiques et effet répulsif contre les phlébotomes et moustiques pendant 3 semaines.
- • ** Fipronil en Spray**:
- **.** **Fipronil**: Acaricide et Insecticide.
- **.** Exemples: **FRONTLINE® Spray Pompe**, **FIPROSPRAY®**, **EFFIPRO® Spray**
- **.**Pulvériser uniformément sur tout le corps de l'animal à rebrousse-poil, en évitant les yeux.
- • **-Deltaméthrine en Collier**:
- **.**Deltaméthrine: Protection de **6 mois** contre les **tiques** et les **moustiques**, et de **12 mois** contre les **phlébotomes** (vecteurs de la leishmaniose).
- **.**Deltaméthrine: **Toxique** pour les** chats**.
- **.**Exemple: **SCALIBOR® Collier Chien**

### Produits Associés

- • **-Tire-tique**: Outil indispensable pour retirer les tiques fixées de manière sécurisée et complète.
- • **-Sprays insecticides habitat**: Produits spécifiques (ex: Bio Spray Intérieur ® Biospotix) pour traiter les tapis, moquettes, coussins et zones de repos de l'animal, éliminant les puces adultes et immatures.
- • **-Vermifuges**: Médicaments pour traiter les parasites internes (vers) qui peuvent être transmis par les puces, notamment les ténias.
- • **-Peigne à puces**: Permet de détecter et de retirer manuellement les puces adultes et leurs excréments du pelage.
- • **-Shampooings doux/dermo-protecteurs**: Peuvent être utilisés en complément pour apaiser les peaux irritées après une infestation ou un traitement.
- • **-Gants de protection**: Recommandés pour l'application des produits antiparasitaires afin d'éviter le contact cutané direct.

### Conseils Hygiène de Vie

- • **-Éviter le surdosage**: Ne jamais administrer une quantité de produit supérieure à celle recommandée par le fabricant ou le vétérinaire.
- • **-Prévenir le léchage**: Surveiller l'animal après l'application d'un **spot-on** ou d'un **spray**; isoler l'animal traité des autres animaux du foyer si nécessaire.
- • **-**Traitement de tous les animaux de compagnie du foyer pour éviter les recontaminations croisées.
- • **-**Conseiller une **vermifugation régulière** de l'animal, car les puces peuvent être vectrices de parasites internes (ténias).
- • **-**Recommander l'usage d'un **tire-tique** pour retirer les tiques de manière sûre et efficace.
- • **-Vérification régulière du pelage**: Brosser attentivement l'animal, surtout après les promenades, pour détecter la présence de parasites.

### Conseils Hygiène de vie: Le Propriétaire (Custom)

• **-Hygiène des mains**: Se laver les mains soigneusement après chaque manipulation d'un produit antiparasitaire.
• **-**Éviter tout **contact direct** du produit avec la **peau**, les **yeux** et la **bouche** lors de l'application.
• **-**En cas de **contact accidentel** avec les yeux, rincer immédiatement et abondamment à l'eau claire.
• **-**Maintenir tous les produits antiparasitaires hors de portée des enfants.
• **-Contact post-traitement**: Éviter que les enfants jouent avec les animaux traités tant que le site d'application n'est pas **complètement sec**.

### Cas Comptoir (DM)

• **Cas comptoir 1**: Un monsieur se présente à l'officine: «Mon chat se gratte beaucoup et j'ai vu de petits insectes noirs dans son pelage, qu’est ce que vous me conseillez comme produit?».
• **Cas comptoir 2**: Une jeune fille se présente à l’officine: «Je veux un produit répulsif pour protéger mon chien, aujourd’hui il est revenu de sa promenade avec des tiques accrochées à la peau.»

### Conseils Traitement

### Flashcards (Révision)

- Q: Citer 3 parasites externes des chats et des chiens
  R: Les Poux, Les Puces, Les Tiques
- Q: Quelle est la maladie parasitaire transmissible à l'homme?
  R: La Gale
- Q: Quel est le parasite qui contamine énormément l'environnement de l'animal infesté?
  R: Les Puces: On estime que 95% des puces (toutes formes comprises) se trouvent dans l'environnement de l'animal.
- Q: Quels sont les parasites hématophages des chats et des chiens?
  R: Les Puces et Les Tiques sont hématophages: Ils se nourrissent du sang de l'animal infesté, ce qui explique l'intérêt des antiparasitaires externes sous forme de comprimés.
- Q: Quand est-il nécessaire de consulter un vétérinaire pour une infestation parasitaire ? Citez au moins trois situations.
  R: Première infestation/sévère, animaux sensibles (jeunes, âgés, gestantes, allaitantes, malades), symptômes généraux (fièvre, abattement), lésions cutanées étendues, suspicion de gale, ou inefficacité du traitement.
- Q: Quel est l'effet du Fipronil?
  R: Le Fipronil est Acaricide et Insecticide: IL est utilisé contre les puces et les tiques en traitement et en prévention.
- Q: Pourquoi la Perméthrine est-elle contre-indiquée chez le chat?
  R: La Perméthrine, présente dans certains antiparasitaires pour chiens, est une substance neurotoxique pour les chats, pouvant entraîner des symptômes graves voire mortels.
- Q: Sous quelles formes galéniques trouve-t-on les médicaments Anti Parasitaires Externes des Chats et des Chiens
  R: Les Spot-on, Shampooings, Colliers, Sprays et Comprimés.
- Q: Quel est la forme galénique offrant une protection de longue durée contre les parasites externes? ?
  R: Les Colliers
- Q: Parmi les médicaments Anti parasitaires Externes, quelle est la forme galénique qui n'a pas d'effet répulsif?
  R: Les Comprimés: n'ont pas d'effet répulsifs, ils sont principalement prescrits comme curatifs en cas d'infestation importante.

---

# Dermatite Atopique: CAO Conseil Associé à l'Ordonnance

**Type:** ordonnances | **Thème:** Ordonnances | **Système:** Pédiatrie | **Niveau:** Facile

### Ordonnance

- • **Patient**: Nourrisson de 18 mois
- • **Motif de consultation**: Poussée d'eczéma avec plaques rouges et démangeaisons au niveau du visage
- • **Locapred® crème 0,1%**: 1 tube
- • **Posologie Locapred®**: 1 application par jour sur les lésions jusqu’à amélioration, puis 1 application 1 jour/2 pendant une semaine, puis 2 applications par semaine pendant une semaine.
- • **Allergus sirop 0.5mg/ml**:
- • **Posologie Allergus**: 2.5 ml/jour pendant une semaine.

### Analyse de l'Ordonnance

- **Objectif du traitement**:
- -Il est **symptomatique** et vise à restaurer la qualité de vie, traiter les symptômes lors des **poussées** et **prévenir les récurrences** en espaçant et réduisant leur intensité et durée.
- **Profil du patient**:
- Nourrisson de 18 mois présentant une **poussée d'eczéma**.
- **Motif de consultation**:
- Vérifier s'il s'agit d'une **initiation** de traitement ou d'un **renouvellement** suite à une poussée pour adapter les conseils.
- **Localisation**:
- Vérifier qu'elles sont les **zones atteintes**

### Conseils Traitement

**Locapred® crème 0,1%**:

- -Ce médicament est un **dermocorticoïde** d'activité modérée.
- -Il possède des propriétés **anti-inflammatoires**, **immunosuppressives** et **vasoconstrictrices**.
- **Application**:
- -Appliquer une fois par jour, de préférence le **soir**, sur les **zones** présentant des **lésions** (plaques rouges, démangeaisons).
- **Mode d'emploi**:
- -Il n'est pas nécessaire de masser ni d'appliquer une couche épaisse, **juste assez pour blanchir la lésion**.
- **Durée**:
- -Le traitement doit être poursuivi jusqu'à **disparition complète** des lésions, généralement 1 à 2 semaines. Il est impératif de l'arrêter **progressivement** selon les indications de l'ordonnance pour éviter un **effet rebond**.
- **Précautions**:
- -Respecter la **durée** et le **mode** d'application pour éviter les effets secondaires liés aux corticoïdes topiques (atrophie cutanée).
  **Allergus® sirop 0.5mg/ml**:
- -Ce médicament est un **antihistaminique**.
- -Aide à réduire les **démangeaisons**.
- **Administration**:
- -Administrer **2.5 ml** par jour de préférence le soir, pendant une semaine.
- **Effets indésirables**:
- -Peut provoquer une **somnolence**. Il est important d'observer l'enfant après l'administration.
- **Respect de la posologie**:
- -Toujours respecter la dose prescrite par le médecin

### Flashcards (Révision)

- Q: Quel est le symptôme principal de la dermatite atopique chez l'enfant?
  R: Le prurit (démangeaison).
- Q: Quelle est la caractéristique principale de la peau atopique?
  R: La xérose (peau sèche) et une altération de la barrière cutanée.
- Q: La dermatite atopique est-elle une maladie contagieuse?
  R: Non, elle n'est pas contagieuse.
- Q: Citez un facteur déclenchant des poussées de dermatite atopique chez l'enfant.
  R: Les allergènes (acariens, pollens, certains aliments), les Irritants (savons agressifs), le Stress.
- Q: Quelle est la principale complication cutanée de la dermatite atopique?
  R: Les surinfections bactériennes (souvent par Staphylococcus aureus) ou virales (ex: herpès).
- Q: Quel conseil d'hygiène est crucial pour un enfant atteint de dermatite atopique?
  R: Utiliser des produits lavants doux, sans savon ni parfum, et prendre des douches courtes et tièdes.
- Q: Quand les dermocorticoïdes sont-ils indiqués dans le traitement de la dermatite atopique?
  R: Lors des poussées inflammatoires pour réduire l'inflammation et le prurit.
- Q: Comment appliquer les crèmes dermocorticoïdes en cas de dermatite atopique.
  R: Les crèmes dermocorticoïdes sont à appliquer une fois par jour, le soir, uniquement sur les lésions.
- Q: Quel est le rôle principal des émollients dans la gestion de la dermatite atopique?
  R: Hydrater la peau, restaurer la barrière cutanée et réduire le prurit.
- Q: À quelle fréquence doit-on appliquer les émollients chez un enfant atopique?
  R: Au moins une à deux fois par jour, idéalement après la douche ou le bain, même en période de rémission.

---

# Fiche Conseil Spontané: Entorse

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Ostéo-articulaire | **Niveau:** Facile

### Situation Patient / Cas Comptoir

Un patient âgé de 32 ans se présente à la pharmacie en déclarant : "Je me suis tordu la cheville, ساقي تلوات".

### Aperçu Pathologie

-**Définition:**
**Lésion** d'**un** ou **plusieurs** ligaments de la cheville, causée par un mouvement **forcé** (**étirement** à **rupture**). -**Mécanisme:**
**Torsion** en varus équin, affectant souvent le ligament collatéral externe. -**Symptômes**
Douleur, gonflement, ecchymose et difficulté à poser le pied.
-Il existe plusieurs degrés de gravité de l'entorse:
--**Entorse Bénigne**:
**Simple étirement** ligamentaire, **douleur** atténuée puis **récurrente**, gonflement **sans** ecchymose. Guérison en ~**10** jours.
--**Entorse Moyenne**:
Déchirure **partielle**, **œdème rapide**, **ecchymose** apparaissant au bout de quelques heures, douleur à l'**appui**. Guérison en **4**-**6** semaines.
--**Entorse Grave**:
**Rupture complète** des ligaments, **craquement**, œdème **précoce**, **ecchymose**, **impossibilité** d'appui. Guérison sur **plusieurs mois**.

### Questions Clés

- -Que s'est-il passé exactement ?
- -Pouvez-vous faire **quelques pas** ?
- -La **douleur** est-elle intense ?
- -Y a-t-il un **gonflement** ou une **ecchymose** (bleu) visible ? Depuis quand l'avez-vous remarqué?
- -Avez-vous entendu un claquement lors de la foulure ?
- -Avez-vous déjà eu une entorse à cette articulation ?
- -Avez-vous mis quelque chose sur votre articulation ou pris un médicament ?
- -Avez-vous d'autres problèmes de santé (diabète, problèmes circulatoires) ?

### Signaux d'Alerte (Red Flags)

- -**Douleur** intense avec **impossibilité d'appui**.
- -**Traumatisme:** Craquement audible lors de l'accident.
- -Présence d'un **hématome** significatif.
- -Patient: **enfant** ou âgé de plus de **55** ans.
- -**Persistance** des symptômes au-delà de **48** heures.
- -Antécédents d'entorses **fréquentes** ou **récidivantes**.
- -Signes d'atteinte **vasculaire** ou **nerveuse** (froid, engourdissement).
- -**Général:** Une consultation médicale est souhaitable car la gêne n'est pas corrélée à la gravité.

### Traitement Principal

- **.Protocole GREC**:
- **-Glaçage**:
- Appliquer pendant 20 minutes toutes les 2 heures - Réduit l'œdème et soulage la douleur.
- **-Repos**:
- Arrêt de l'activité physique, éviter l'appui
- L'utilisation de béquilles peut être nécessaire.
- **-Élévation**:
- Surélever la jambe
- Favorise le retour veineux et limite l'œdème.
- **-Compression**:
- -Appliquer une contention à l'aide d'un bandage élastique (sans trop serrer pour ne pas gêner la circulation) ou d'une chevillère pour limiter le gonflement.
- **.Paracétamol** (Antalgique Palier I) :
- -1 g par prise, jusqu'à 3-4 fois par jour
- -Traitement de première intention pour la douleur.
- **.Ibuprofène** (AINS oral) : Non systématique
- -Action anti-inflammatoire et antalgique, pour limiter l'inflammation.
- -200 à 1200 mg par jour
- -Pendant une courte durée: 2 à 3j car il peut retarder la guérison.

### Produits Associés

- **.Gels/Pommades AINS** (Anti-inflammatoire topique):
- -À base d'ibuprofène ou de diclofénac
- -Appliquer sans masser pour soulager douleur et inflammation.
- **.Poche de froid**:
- - Réduire l'inflammation et le gonflement : application de froid limite le développement de l'œdème et minimise la constitution d'un hématome
- -Soulager la douleur
- -ex: Physiogel®
- **.Chevillère simple** devant une entorse bénigne (foulure):
- -Soulager la douleur et limiter l'œdème
- -Stabiliser et soutenir l'articulation
- -Prévenir de nouvelles blessures en limitant les mouvements excessifs et les torsions
- **.Cannes anglaises** (béquilles)

### Conseils Hygiène de Vie

- -Éviter de solliciter l'articulation lésée pour favoriser la guérison.
- -**Respecter** scrupuleusement le **temps de repos** et le programme de rééducation prescrit.
- -Reprendre l'activité physique de manière **progressive** et **encadrée**.
- -Porter des chaussures **adaptées**, **stables** et offrant un bon maintien.
- -**Après guérison**, renforcer les muscles entourant l'articulation pour prévenir les récidives.

### Conseils Alimentaires

- -Maintenir une hydratation suffisante tout au long de la journée.
- -Consommer des aliments riches en **vitamine C** (agrumes, kiwi, poivron) pour la synthèse du collagène.
- -**Privilégier** les aliments aux propriétés **anti-inflammatoires** (poissons gras, fruits et légumes colorés).
- -**Limiter** la consommation d'**alcool**, susceptible d'augmenter l'inflammation.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce qu'une entorse de la cheville?
  R: Une lésion d'un ou plusieurs ligaments de la cheville, causée par un mouvement forcé (étirement à rupture).
- Q: Comment classe-t-on les entorses selon le degré de gravité?
  R: On distingue 3 types d'entorse: Bénigne, Moyenne et Grave.
- Q: Quels sont les symptômes d'une entorse Bénigne?
  R: Douleur atténuée , non intense, gonflement, pas de bleu, marche possible.
- Q: Quels sont les symptômes d'une entorse Moyenne?
  R: Œdème d'apparition rapide, ecchymose qui apparaît dans les 24h, douleur à l'appui.
- Q: Quels sont les symptômes d'une entorse Grave?
  R: Œdème d'apparition rapide, ecchymose, impossibilité d'appui sur le pied.
- Q: Quel conseil principal recommander au patient?
  R: Protocole GREC: Glaçage, Repos, Elévation, Compression
- Q: Quel est l'antalgique de première intention recommandé pour la douleur d'une entorse?
  R: Le Paracétamol (1g par prise, jusqu'à 3-4 fois par jour).
- Q: Dans quel cas l'Ibuprofène oral est-il contre-indiqué en cas d'entorse?
  R: En cas d'ulcère gastrique ou de prise d'anticoagulants.
- Q: Comment doit-on appliquer les gels/pommades AINS sur une entorse?
  R: Sans masser, pour soulager douleur et inflammation.
- Q: Citez deux signaux d'alerte importants nécessitant une consultation médicale pour une entorse.
  R: Douleur intense avec impossibilité d'appui, ou un craquement audible lors de l'accident.

---

# Vaccination et Calendrier Vaccinal Tunisien 2025

**Type:** savoir | **Thème:** Pharmacologie | **Système:** Pédiatrie | **Niveau:** Facile

> Synthèse des évolutions du Programme National de Vaccination (PNV) tunisien pour 2025, incluant l'intégration du vaccin HPV, les recommandations pour les seniors et femmes enceintes, et le rôle clé du pharmacien.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quel est l'objectif principal d'une analyse stratégique du calendrier vaccinal tunisien 2025?
  R: Évaluer l'efficacité, la pertinence et la faisabilité du programme de vaccination actuel pour l'adapter aux besoins épidémiologiques futurs et aux recommandations internationales.
- Q: Quelle est l'importance de l'adhésion de la population à un programme de vaccination?
  R: L'adhésion de la population est cruciale pour atteindre une couverture vaccinale élevée et garantir l'immunité collective, protégeant ainsi les individus et la communauté contre la propagation des maladies.
- Q: Citez un facteur clé à prendre en compte lors de la modification d'un calendrier vaccinal.
  R: Les données épidémiologiques locales, les nouvelles vaccins disponibles, les recommandations de l'OMS et l'analyse coût-bénéfice des vaccins.
- Q: Quel rôle joue l'Organisation Mondiale de la Santé (OMS) dans les calendriers vaccinaux nationaux?
  R: L'OMS fournit des lignes directrices et des recommandations basées sur les preuves pour aider les pays à élaborer et à mettre à jour leurs calendriers vaccinaux, en fonction de leur contexte épidémiologique.
- Q: Qu'est-ce que l'immunité collective (ou immunité de groupe)?
  R: C'est la protection indirecte d'une population contre une maladie infectieuse qui survient lorsque qu'une proportion suffisante d'individus est immunisée, réduisant ainsi la probabilité d'une infection.
- Q: Pourquoi une analyse stratégique est-elle nécessaire même pour un calendrier vaccinal établi?
  R: Une analyse stratégique permet d'anticiper les défis, d'intégrer les innovations, d'optimiser l'allocation des ressources et d'assurer que le programme reste pertinent et efficace face à l'évolution des menaces sanitaires.
- Q: Quel est l'un des principaux défis logistiques de la mise en œuvre d'un calendrier vaccinal en Tunisie?
  R: La chaîne du froid pour le stockage et le transport des vaccins, l'accessibilité des zones rurales et la formation continue du personnel de santé.
- Q: Quelle est la différence entre un vaccin monovalent et un vaccin polyvalent?
  R: Un vaccin monovalent protège contre une seule souche ou type de virus/bactérie, tandis qu'un vaccin polyvalent protège contre plusieurs souches ou types d'un même agent pathogène ou contre plusieurs agents pathogènes différents.
- Q: Comment la pharmacie communautaire peut-elle contribuer à l'amélioration de la couverture vaccinale?
  R: Par l'information et la sensibilisation du public, la vérification des carnets de vaccination, et potentiellement la dispensation ou l'administration de certains vaccins, selon la législation nationale.
- Q: Quel est l'impact potentiel du changement climatique sur les stratégies vaccinales?
  R: Le changement climatique peut modifier la répartition géographique et l'incidence de certaines maladies infectieuses (ex: maladies à transmission vectorielle), nécessitant une adaptation des calendriers vaccinaux et des stratégies de surveillance.

---

# La Rage: Conseil à l'Officine

**Type:** savoir | **Thème:** Pharmacie vétérinaire | **Système:** Pédiatrie | **Niveau:** Facile

> La rage est une zoonose virale aiguë et mortelle, transmissible principalement par la salive d'animaux infectés. L'équipe officinale a un rôle crucial dans les premiers soins d'urgence et l'orientation rapide des patients exposés vers un centre antirabique.

### Aperçu Pathologie

• La rage est une zoonose virale aiguë et mortelle qui affecte le système nerveux central, causée par un Lyssavirus neurotrope. • Elle est transmise principalement à l'homme par la salive d'animaux infectés, le plus souvent via une morsure de chien. • Après inoculation, le virus se multiplie localement puis migre le long des nerfs périphériques jusqu'au cerveau, provoquant une encéphalite. • Une fois les symptômes neurologiques déclarés (formes furieuse ou paralytique), l'issue est presque toujours fatale. • La période d'incubation est variable, de quelques jours à plusieurs mois. • La prévention repose sur la vaccination animale et la prophylaxie post-exposition humaine immédiate.

### Questions Clés

- 1. Quelle est la définition d'une zoonose et pourquoi la rage entre-t-elle dans cette catégorie ?
- 2. Décrivez le tout premier geste à effectuer en officine pour une personne qui vient d'être mordue par un animal, et expliquez son importance.
- 3. Quels sont les trois modes de transmission du virus de la rage à l'homme ?
- 4. Quelle est la différence fondamentale entre la forme "furieuse" et la forme "paralytique" de la rage chez l'homme ?
- 5. Dans quelles situations la sérothérapie (immunoglobulines) est-elle indiquée en plus de la vaccination ?
- 6. Quelle est la conduite à tenir concernant un chien domestique qui a mordu une personne ?
- 7. Pourquoi la vaccination des chiens est-elle considérée comme la stratégie la plus efficace pour prévenir la rage humaine ?
- 8. Quels sont les premiers symptômes non spécifiques de la rage chez l'homme ?
- 9. Expliquez pourquoi il ne faut jamais suturer immédiatement une plaie de morsure.
- 10. Un client a touché une chauve-souris trouvée au sol en plein jour. Quel conseil lui donnez-vous ?

### Signaux d'Alerte (Red Flags)

- • Morsure ou griffure profonde, multiple, ou située sur des zones à haut risque (tête, cou, mains, pieds, organes génitaux). • Contact avec un animal sauvage ou errant au comportement inhabituel (désorienté, agressif, non craintif de l'homme, ou actif le jour pour un animal normalement nocturne comme une chauve-souris). • Observation d'une salivation excessive ou de difficultés à avaler chez un animal. • Toute exposition à la salive d'un animal dont le statut vaccinal est inconnu, qui ne peut être surveillé, ou qui est suspecté d'être enragé. • Apparition de douleur, picotements ou démangeaisons inexpliquées au site d'une ancienne morsure ou griffure.

### Traitement Principal

- • **Prophylaxie Post-Exposition (PPE) d'urgence**: Doit être initiée le plus rapidement possible.
- • **Traitement local immédiat de la plaie**: Lavage abondant à l'eau et au savon pendant au moins 15 minutes, suivi d'une antisepsie avec un produit virucide (solution aqueuse d'iode, povidone iodée, alcool à 70°).
- • **Vaccination antirabique**: Administration d'un vaccin inactivé selon un schéma de doses multiples, adapté au risque et à la situation (animal en observation ou non). La voie est intramusculaire (deltoïde chez l'adulte, face antérolatérale de la cuisse chez l'enfant de moins de 4 ans).
- • **Sérothérapie (Immunoglobulines Antirabiques - SAR)**: Indiquée pour les expositions les plus graves et les personnes non vaccinées auparavant. Elle fournit une immunité passive immédiate et doit être administrée localement (autour de la plaie) et conjointement à la première dose de vaccin, le plus tôt possible.

### Conseils Hygiène de Vie

- • **Éviter le contact direct**: Ne jamais approcher, toucher, nourrir ou tenter de capturer des animaux sauvages ou errants, ou tout animal au comportement suspect.
- • **Protection des animaux domestiques**: Garder les animaux de compagnie sous surveillance ou à l'intérieur pour éviter tout contact avec des animaux sauvages ou errants.
- • **Signalement**: Signaler tout animal au comportement étrange ou suspect aux autorités locales compétentes (municipalité, services vétérinaires).
- • **Manipulation des carcasses**: Ne jamais manipuler un animal mort à mains nues.
- • **Vaccination des animaux**: Assurer la vaccination antirabique des chiens et chats dès l'âge de 3 mois, c'est une mesure clé de santé publique pour interrompre la transmission du virus.

### Cas Comptoir (DM)

• **Patient mordu par un animal**: Nettoyage immédiat de la plaie à l'eau et au savon (15 min), antisepsie, pansement non occlusif. Ne jamais suturer la plaie immédiatement. Orientation urgente vers un médecin ou un centre antirabique pour la Prophylaxie Post-Exposition (PPE) et vérification du statut antitétanique. Recueillir des informations sur l'animal mordeur. • **Client s'inquiétant d'un animal au comportement étrange**: Conseiller de ne jamais approcher l'animal, de protéger les animaux domestiques, de signaler aux autorités compétentes et de ne jamais manipuler d'animal mort à mains nues. • **Client demandant la vaccination de son animal**: Expliquer l'importance cruciale de la vaccination animale pour la prévention de la rage humaine et orienter vers un vétérinaire. Recommander la vaccination des chiens et chats dès 3 mois.

### Conseils Traitement

### Flashcards (Révision)

- Q: Qu'est-ce que la rage?
  R: Une zoonose virale aiguë et mortelle affectant le système nerveux central, causée par un Lyssavirus neurotrope.
- Q: Quel est le mode de transmission le plus fréquent de la rage à l'homme?
  R: La salive d'animaux infectés, le plus souvent via une morsure, griffure ou léchage d'une blessure d'un chien ou d'un chat.
- Q: Que se passe-t-il une fois les symptômes neurologiques de la rage déclarés?
  R: Une fois que les symptômes apparaissent, la maladie est presque toujours mortelle.
- Q: Quelle est la première étape cruciale de la Prophylaxie Post-Exposition (PPE) d'urgence?
  R: Le traitement local immédiat de la plaie.
- Q: Comment doit être traitée localement une plaie suspecte de rage?
  R: Lavage abondant à l'eau et au savon pendant au moins 15 minutes, suivi d'une antisepsie avec un produit iodé ou de l'alcool à 70%.
- Q: Quel type de vaccin est-il utilisé pour la vaccination contre la rage?
  R: Un vaccin inactivé.
- Q: Quelles sont les contre-indications du vaccin antirabique?
  R: Le vaccin anti rabique n'a pas de contre-indications et peut être administré même chez la femme enceinte.
- Q: Quand la sérothérapie (Immunoglobulines Antirabiques) est-elle indiquée?
  R: Pour les expositions les plus graves et les personnes non vaccinées auparavant.
- Q: Comment les immunoglobulines antirabiques (SAR) doivent-elles être administrées?
  R: Localement autour de la plaie et conjointement à la première dose de vaccin.
- Q: Citez un signal d'alerte lié au comportement d'un animal potentiellement enragé.
  R: Comportement inhabituel (désorienté, agressif, non craintif de l'homme, ou actif le jour pour un animal normalement nocturne comme une chauve-souris).

---

# Lumbago: Conseils à l'officine

**Type:** maladie | **Thème:** Maladies courantes | **Système:** Ostéo-articulaire | **Niveau:** Facile

> Mémofiche pratique pour la prise en charge officinale du lumbago aigu, une douleur fréquente du bas du dos, souvent bénigne mais intense, avec un focus sur les questions clés, les signaux d'alerte, les traitements et les conseils d'hygiène de vie.

### Situation Patient / Cas Comptoir

Une patiente de 40 ans se présente au comptoir avec une demande directe de naproxène pour un mal de dos.

### Aperçu Pathologie

-**La lombalgie aiguë, le lumbago** , est une douleur fréquente dans le **bas du dos**.
-Elle survient **souvent** de manière **brutale** suite à un **effort**, un **faux mouvement**, une **mauvaise posture**, les métiers qui nécessitent de faire de **longs trajets**… -**La douleur** peut être **intense** et provoquer un **blocage** du bas du dos
-Elle peut **irradier** dans les **fesses** ou à la **face postérieure des cuisses**, mais généralement pas au-delà des genoux.
-Dans la majorité des cas (neuf sur dix), **la lombalgie aiguë est bénigne** et s'améliore en **quelques jours** ou **semaines** -**Des contractures musculaires** peuvent également être une cause de la **douleur**.

### Questions Clés

- -Depuis combien de temps ressentez-vous cette douleur ?
- -Comment la douleur est-elle apparue ? Était-ce progressif ou brutal ?
- -Où précisément se situe la douleur ? Irradie-t-elle ?
- -Avez-vous d'autres symptômes associés, comme de la fièvre, des troubles urinaires, une perte de poids inexpliquée, ou des douleurs qui vous réveillent la nuit ?
- -Avez-vous déjà eu des épisodes de mal de dos auparavant ?
- -Avez-vous déjà essayé quelque chose pour soulager cette douleur?
- -Prenez-vous d'autres médicaments ?
- -Avez-vous des allergies ?

### Signaux d'Alerte (Red Flags)

- -Présence de **fièvre inexpliquée** associée à la douleur.
- -Perte de poids **involontaire** et **inexpliquée**.
- -Douleurs de type **inflammatoire** qui réveillent le patient la **nuit**, **insensibles au repos**.
- -Difficultés à uriner (rétention, incontinence) ou autres troubles sphinctériens.
- -Antécédents de cancer.
- -Douleur trop intense, persistante et invalidante, ou altération de l'état général.
- -Présence de troubles de la sensibilité (fourmillements, engourdissements dans les jambes, paresthésies) ou faiblesse musculaire.
- -Douleur irradiant au-delà du genou, notamment le long de la jambe jusqu'au pied.
- -Douleur survenue suite à un traumatisme (chute, choc).
- -Absence d'amélioration notable après 48 heures de traitement symptomatique bien conduit.
- -Lumbago devenant fréquemment récidivant ou chronique.

### Traitement Principal

- **-Paracétamol** :
- **.1** g par prise, jusqu'à 3-4 fois par jour (max **4**g/jour)
- **.4** heures **au minimum** entre les prises
- **.**À privilégier en**première intention**
- **-AINS**: **Ibuprofène** :
- **.200** à **400** mg par prise, **2** à **3** fois par jour, sur une courte durée (5 jours).
- **.CI**: ulcère gastroduodénal, insuffisance rénale, cardiaque, hépatique, grossesse > 6 mois( 24Semaines d'Aménorrhée) et les interactions médicamenteuses: anticoagulants
- **-Méphénésine**: **Myorelaxant**:
- **.500**mg à **1**g par prise **3** fois par jour.
- **.**Généralement sur une **courte** période (moins d'une semaine).
- **.**À conseiller si les contractures musculaires sont **intenses**, en complément des antalgiques
- **.**Ex: DécontractylⓇ

### Produits Associés

- **-Patchs AINS** : Pour une action locale ciblée.
- **.**Appliquer directement sur la zone douloureuse toutes les 12 heures, en évitant les peaux lésées.
- **-Gels/Pommade anti-inflammatoires** :Ibuprofène ou diclofénac
- **.**Soulagement localisé des douleurs et des contractures musculaires
- **-Ceinture de contention lombaire** :
- **.**Soulager la douleur, soutenir et stabiliser la région lombaire.
- **.**Permet le maintien de l'activité, en réduisant la tension musculaire et limitant les mouvements excessifs.
- **-Magnésium**:
- **.**Essentiel pour la **fonction musculaire et nerveuse**
- **.**Aide à réduire les spasmes musculaires et les tensions associées au lumbago.
- **-Oméga-3**
- **.** Contribuent à réduire l'inflammation et la douleur associées à la lombalgie.
- **-Harpagophytum**:
- **.**Anti-inflammatoire et Antalgique.
- **.CI**: Reflux gastro-œsophagien, Ulcère de l'estomac ou du duodénum, Calculs biliaires
- **.**Ex: RhumatylⓇ, Dolo-softⓇ
- **-Poche de chaud/froid**:
- **.**La chaleur détend les muscles contractés, le froid soulage l'inflammation aigue.
- **-Saule Blanc**:
- **.**Antalgiques et anti-inflammatoire.
- **.CI**: Allergie aux dérivés salicylés. Ex: SoulagelⓇ
- **-Curcuma**:
- **.**Anti-inflammatoire et antioxydant.
- **.**Ex: Phytoflore CurcumaⓇ
- **-Cassis**:
- **.**Anti-inflammatoire et diurétique.
- **.**Attention: Peut interagir avec les plantes et médicaments diurétiques et présenter un risque d'hypotension. Ex: Etno-CassisⓇ

### Conseils Hygiène de Vie

- -Prévoir un **court repos initial** si la douleur est **intense**
- -Reprendre **progressivement** les activités **normales dès que possible**, en évitant les efforts intenses et les mouvements brusques.
- -Adopter de **bonnes postures au quotidien** : garder le dos droit, fléchir les jambes pour soulever des charges, éviter de se pencher en avant.
- -Pratiquer une activité physique **régulière** et **modérée** (marche, natation, vélo, yoga doux) pour **renforcer la musculature** du **dos** et des **abdominaux**.
- -**Limiter** la station **assise prolongée**
- -**Éviter** le port de **talons hauts** qui modifient la courbure lombaire et **augmentent** la **pression** sur le **dos**.
- -Utiliser une **literie ferme** et un **oreiller adapté** pour maintenir un **bon alignement** de la colonne vertébrale pendant le sommeil.

### Conseils Alimentaires

- -En cas de surcharge pondérale, conseiller une **réduction progressive** et **équilibrée** du poids pour **diminuer** la **pression** sur le **dos**.
- -**Réduire** la consommation d'**aliments** connus pour **favoriser l'inflammation** (sucre raffiné, viande rouge transformée, certains produits laitiers).
- -Favoriser les aliments **riches en Oméga-3** (poissons gras comme les sardines, maquereaux, saumon, graines de lin) pour leurs propriétés **anti-inflammatoires**.
- -Maintenir une **bonne hydratation** tout au long de la journée (eau, tisanes non sucrées).
- -Privilégier une **alimentation équilibrée**, riche en fruits, légumes, céréales complètes et légumineuses, qui apportent vitamines et minéraux essentiels.

### Conseils Traitement

### Flashcards (Révision)

- Q: Quelle est la définition d'un Lumbago?
  R: C'est une douleur musculaire au niveau du bas du dos, pouvant aller jusqu'au blocage du dos.
- Q: Citez trois questions clés à poser concernant l'historique et le type de la douleur lors d'un lumbago.
  R: Depuis combien de temps la douleur est-elle présente ? Comment est-elle apparue ? Où se situe-t-elle et irradie-t-elle ?
- Q: Citez 3 signaux d'alerte nécessitant une consultation médicale pour un lumbago
  R: Fièvre inexpliquée, perte de poids involontaire, douleurs nocturnes, antécédents de cancer, troubles neurologiques, irradiation étendue au-delà du genou.
- Q: Quel est l'antalgique de première intention recommandé pour le lumbago, surtout en cas de contre-indications aux AINS ?
  R: Le Paracétamol.
- Q: Quelles sont les contre-indications majeures à l'utilisation de l'Ibuprofène (AINS)?
  R: Ulcère gastroduodénal, insuffisance rénale/cardiaque/hépatique sévères, ou grossesse > 6 mois.
- Q: Quand peut-on conseiller un myorelaxant comme la Méphénésine pour un lumbago ?
  R: Si les contractures musculaires sont intenses, en complément des antalgiques.
- Q: Quels compléments alimentaires à propriété anti inflammatoires peut-on conseiller an association des antalgiques?
  R: Des compléments alimentaires à base de: Curcuma, Harpagophytum, Cassis ou Saule blanc.
- Q: Comment utiliser les poches Chaud/ Froid?
  R: La chaleur est utilisée pour relâcher les muscles contractés alors que le froid est indiqué comme anti inflammatoire en présence de signes d' inflammation aigue.
- Q: Citez les recommandations hygiéniques à conseiller au patient en cas de lumbago.
  R: Prévoir un repos initial si la douleur est intense, reprendre progressivement les activités quotidiennes dès que possible.
- Q: Citez les recommandations hygiéniques à conseiller au patient pour éviter les récidives de lumbago.
  R: Pratiquer une activité physique modérée et régulière, adopter de bonnes postures au quotidien, éviter la station assisse de façon prolongée.

---
