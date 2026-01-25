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
