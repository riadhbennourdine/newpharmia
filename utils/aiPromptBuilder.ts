import { CaseStudy } from '../types';
import { TOPIC_CATEGORIES } from '../constants';

export const buildAIPrompt = (
  memoFicheType: CaseStudy['type'],
  sourceText: string,
  selectedTheme: string,
  selectedSystem: string,
  pharmaTheme: string,
  pharmaPathology: string,
): string => {
  const formattingInstructions = `

Instructions de formatage impératives pour chaque section :
- Améliorer le style de rédaction pour qu'il soit clair, concis et professionnel.
- Le contenu de chaque section doit être une liste à puces (commençant par "- ").
- Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).

Instructions spécifiques par section :
- **Questions clés à poser**: Vous DEVEZ utiliser la méthode **P.H.A.R.M.A.**. Chaque ligne doit correspondre à une lettre de l'acronyme avec la question verbatim :
    - **P**atient : "C'est pour vous ou pour quelqu'un d'autre ? Quel âge a la personne ?"
    - **H**istoire : "Dites-moi ce qui se passe... Depuis quand cela a-t-il commencé ?"
    - **A**nalyse : "Comment décririez-vous la douleur (brûlure, pique, serre...) ? Montrez-moi exactement où vous avez mal."
    - **R**écurrence : "Est-ce la première fois que cela vous arrive ?"
    - **M**aladies & Médocs : "Avez-vous des problèmes de santé ou un traitement en cours en ce moment ?"
    - **A**ssociés : "Y a-t-il d'autres signes en plus ? Comme de la fièvre, des boutons ou une grande fatigue ?"
- **Aperçu pathologie**: Ne pas dépasser 10 points. Synthétiser la physiopathologie pour qu'elle soit compréhensible au comptoir. Chaque point commence par un mot-clé en gras.
- **Signaux d'alerte**: Liste stricte des signes nécessitant une orientation médicale immédiate (Red Flags).
- **mainTreatment (Traitement principal)**: Liste des traitements de première intention (OTC ou conseils pharmacien). Format: "**Nom Molécule/Produit** (Classe) : Posologie adulte/enfant - Conseil clé".
- **associatedProducts (Produits complémentaires)**: Proposer une prise en charge globale (compléments, dispositifs, prévention). Max 12 points. Format: "**Nom Produit** (Intérêt) : Pourquoi le conseiller ?".
- **lifestyleAdvice (Hygiène de vie)**: Conseils non-médicamenteux pratiques et applicables immédiatement.
- **dietaryAdvice (Conseils alimentaires)**: Aliments à privilégier ou éviter spécifiquement pour cette pathologie.
`;

  const pharmacologieFormattingInstructions = `

Instructions de formatage impératives :
- Le contenu doit être concis, pertinent et facile à lire pour un professionnel de la pharmacie.
- Vous devez générer UNIQUEMENT les sections personnalisées.
- Interdiction formelle d'utiliser les sections suivantes, car elles ne sont absolument pas pertinentes pour la pharmacologie ou les dispositifs médicaux : "Aperçu pathologie", "Signaux d'alerte", "Produits associés", "Etat et besoin de la peau", "Conseiller une consultation dermatologique", "Produit principal", "Hygiène de vie", "Conseils alimentaires".

Instructions spécifiques pour les sections personnalisées :
- Vous devez générer un tableau de sections personnalisées dans le champ "customSections".
- Chaque section doit avoir un "title" et un "content".
- Les titres des sections doivent être pertinents pour le sujet de la pharmacologie.
- Le contenu de chaque section doit être une liste à puces, où chaque ligne commence par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).
`;

  const dispositifsMedicauxFormattingInstructions = `

Instructions de formatage impératives et strictes pour chaque section :
- Le style de rédaction doit être clair, concis et professionnel.
- Le contenu de CHAQUE section doit être une liste de points.
- CHAQUE point de la liste doit commencer par le caractère "•".
- CHAQUE point de la liste doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).

Voici un exemple de formatage pour une section :
### Intérêt du dispositif
• **Suivi précis**: Permet un suivi précis de la tension artérielle à domicile.
• **Prévention**: Aide à prévenir les complications liées à l'hypertension.
• **Autonomie**: Donne au patient plus d'autonomie dans la gestion de sa santé.

Voici le plan détaillé à suivre OBLIGATOIREMENT :
1.  **Cas comptoir**:
    -   Doit être une liste de points.
2.  **Objectifs de conseil**:
    -   Doit être une liste de points.
3.  **Pathologies concernées**:
    -   Doit être une liste de points.
    -   Chaque pathologie doit être clairement expliquée.
    -   Développer davantage cette rubrique.
4.  **Intérêt du dispositif**:
    -   Doit être une liste de points.
5.  **Bénéfices pour la santé**:
    -   Doit être une liste de points.
6.  **Dispositifs à conseiller ou à dispenser**:
    -   Doit être une liste de points.
7.  **Réponses aux objections des clients**:
    -   Doit être une liste de points.
8.  **Pages sponsorisées**:
    -   Doit être une liste de points.
`;

  let prompt = '';
  if (memoFicheType === 'maladie') {
    prompt = `Génère une mémofiche pour des professionnels de la pharmacie sur le sujet : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".
        
        Tu dois générer un objet JSON avec les clés exactes suivantes :
        - "title" : Titre de la mémofiche
        - "shortDescription" : Courte description
        - "patientSituation" : Cas comptoir (description du patient et de sa demande)
        - "keyQuestions" : Tableau de chaînes de caractères (Questions clés à poser)
        - "pathologyOverview" : Aperçu pathologie (Physiopathologie simplifiée)
        - "redFlags" : Tableau de chaînes de caractères (Signaux d'alerte)
        - "mainTreatment" : Tableau de chaînes de caractères (Traitement principal)
        - "associatedProducts" : Tableau de chaînes de caractères (Produits complémentaires)
        - "lifestyleAdvice" : Tableau de chaînes de caractères (Hygiène de vie)
        - "dietaryAdvice" : Tableau de chaînes de caractères (Conseils alimentaires)

        ${formattingInstructions}`;
  } else if (memoFicheType === 'pharmacologie') {
    prompt = `Génère une mémofiche de pharmacologie sur le principe actif ou la classe : "${sourceText}". Le thème de la mémofiche est "${pharmaTheme}" et la pathologie cible est "${pharmaPathology}".

Instructions de formatage impératives :
- Le contenu doit être concis, pertinent et facile à lire pour un professionnel de la pharmacie.
- Vous devez générer UNIQUEMENT un tableau de sections dans le champ "memoSections". Chaque section doit avoir un "title" et un "content".
- Les titres des sections DOIVENT être exactement les suivants et dans cet ordre : "La Pathologie", "Contexte tunisien", "Pharmacologie", "Les traitements et mécanismes d'action", "Effets indésirables", "Rôle du pharmacien", "Conseils Hygiène de vie", "Conseils alimentaires", "Micronutrition".
- Le contenu de chaque section doit être une liste à puces (commençant par "- "), où chaque ligne commence par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).
`;
  } else if (memoFicheType === 'dispositifs-medicaux') {
    prompt = `Génère une mémofiche sur le dispositif médical : "${sourceText}". Le thème de la mémofiche est "${pharmaTheme}" et l'indication principale est "${pharmaPathology}".${dispositifsMedicauxFormattingInstructions}`;
  } else if (memoFicheType === 'dermocosmetique') {
    prompt = `Génère une mémofiche de dermocosmétique pour des professionnels de la pharmacie sur le sujet : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".
        
        Tu dois générer un objet JSON avec les clés exactes suivantes :
        - "title" : Titre de la mémofiche
        - "shortDescription" : Courte description
        - "patientSituation" : Cas comptoir (description du patient et de sa demande)
        - "keyQuestions" : Tableau de chaînes de caractères (Questions clés à poser)
        - "pathologyOverview" : Nommé "Besoin Dermo-cosmétique", il doit décrire les besoins spécifiques de la peau liés au sujet.
        - "mainTreatment" : Nommé "Dermocosmétique principal", il doit lister les solutions ou produits principaux.
        - "associatedProducts" : Tableau de chaînes de caractères (Produits complémentaires)
        - "lifestyleAdvice" : Tableau de chaînes de caractères (Conseils Hygiène de vie)
        - "dietaryAdvice" : Tableau de chaînes de caractères (Conseils alimentaires)
        - "references" : Tableau de chaînes de caractères (Références bibliographiques)

        ${formattingInstructions}`;
  } else if (memoFicheType === 'communication') {
    prompt = `En tant qu'expert en communication pharmaceutique, analyse le texte suivant et génère une mémofiche de type 'communication'. La mémofiche doit inclure un titre pertinent, une courte description, un résumé d'introduction, une section 'cas comptoir' (patientSituation) et plusieurs sections personnalisées (customSections) qui décomposent le sujet de manière logique et facile à comprendre pour un professionnel de la pharmacie. Le contenu de chaque section doit être détaillé, professionnel et rédigé dans un style clair et concis. Chaque section doit avoir un titre et un contenu. Le contenu de chaque section doit être une liste à puces. Chaque point de la liste doit être sur une nouvelle ligne (en utilisant '\n'). Chaque ligne doit commencer par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**). Le texte à analyser est :

${sourceText}`;
  } else if (memoFicheType === 'ordonnances') {
    prompt = `Génère une mémofiche sur l'analyse d'une ordonnance pour le sujet : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".
Tu dois générer un objet JSON avec les clés suivantes : "ordonnance", "analyseOrdonnance", "conseilsTraitement", "informationsMaladie", "conseilsHygieneDeVie", "conseilsAlimentaires", "ventesAdditionnelles", "references".
Le contenu de chaque clé doit être un tableau de chaînes de caractères.
Chaque chaîne de caractères doit correspondre à un point de la section.

Voici le détail de chaque section :
- **ordonnance**: Ordonnance. Contenant les détails du patient, la pathologie, la prescription et la durée.
- **analyseOrdonnance**: Analyse de l'ordonnance. Contenant l'analyse de la prescription, la vérification essentielle et le profil du patient.
- **conseilsTraitement**: Conseils sur le traitement médicamenteux. Pour chaque médicament de la prescription, créer un objet avec les clés "medicament" et "conseils". "medicament" est le nom du médicament. "conseils" est un tableau de chaînes de caractères contenant les conseils d'administration, les effets indésirables éventuels et les précautions d'emploi.
- **informationsMaladie**: Informations sur la maladie. Ne pas commencer par le mot "Mécanisme". Commencer par le nom de la maladie en gras (par exemple, **Rhinite allergique**).
- **conseilsHygieneDeVie**: Conseils hygiène de vie. Ne doit contenir que des Conseils hygiène de vie.
- **conseilsAlimentaires**: Conseils alimentaires. Indiquer les aliments à consommer à privilégier, et les aliments à éviter. Ne pas lister de micronutriments.
- **ventesAdditionnelles**: Ventes additionnelles. Répartir les produits dans les sous-rubriques suivantes (si pertinentes) : "complementsAlimentaires", "accessoires", "dispositifs", "cosmetiques". Pour chaque produit, inclure les doses, les posologies et les modes d'administration.

${formattingInstructions}
`;
  } else if (memoFicheType === 'micronutrition') {
    prompt = `Créer une mémofiche claire et concise pour initier les pharmaciens d'officine et leurs collaborateurs débutants à la micronutrition et son apport pour les patients souffrant de [maladie]. La mémofiche doit se concentrer sur le déclenchement de la discussion au comptoir et comment créer le besoin, puis explication de la [maladie] , les traitements conventionnels. Puis l'approche micronutritionnelle en expliquant simplement les mécanismes d'action de chaque micronutriment et en proposant des conseils alimentaires et des règles d'hygiène de vie. utiliser un langage accessible et encourageant. Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}". Le sujet détaillé est : "${sourceText}".`;
  } else if (memoFicheType === 'savoir') {
    prompt = `En tant qu'expert en santé et pharmacie, analyse le texte brut suivant et génère une mémofiche de type 'Savoir'. L'objectif est de créer un focus sur un sujet de santé avec une approche pharmaceutique.

Le processus est le suivant :
1.  **Extraire les titres** : Identifie tous les titres présents dans le texte brut.
2.  **Créer les sections Mémo** : Chaque titre identifié doit devenir le "title" d'une section dans le tableau "memoSections".
3.  **Réécrire le contenu** : Pour chaque section, reprends le texte qui suit le titre correspondant dans le texte brut et réécris-le dans un style synthétique, professionnel et facile à comprendre pour un professionnel de la pharmacie. Le contenu réécrit doit être placé dans le champ "content" de la section correspondante. Le contenu doit être une liste à puces, où chaque ligne commence par un mot-clé pertinent mis en évidence avec des doubles astérisques (par exemple, **Mot-clé**).
4.  **Générer les outils pédagogiques** : À partir du texte brut, génère également les sections "flashcards", "quiz" et "glossary".

Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}".

Le texte à analyser est :

${sourceText}`;
  } else if (memoFicheType === 'le-medicament') {
    // New 'Le médicament' type
    prompt = `Génère une mémofiche détaillée sur le médicament suivant : "${sourceText}". Le thème pédagogique est "${selectedTheme}" et le système clinique est "${selectedSystem}". Le contenu doit inclure des informations sur sa classification, son mécanisme d'action, ses indications, sa posologie, ses effets secondaires, ses contre-indications et ses interactions médicamenteuses.`;
  } else {
    // Fallback for types not explicitly handled (should not happen if type definitions are exhaustive)
    prompt = `Génère une mémofiche sur le sujet suivant : "${sourceText}".`;
  }
  return prompt;
};
