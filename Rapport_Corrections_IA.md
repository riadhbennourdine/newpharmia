# Résumé Détaillé des Corrections Apportées au Générateur IA

Ce document décrit le processus itératif de débogage que nous avons suivi pour rendre l'application fonctionnelle. Les problèmes allaient de la configuration de l'environnement à la syntaxe des requêtes API, en passant par la gestion des réponses du modèle IA.

## 1. Problème Initial : Déploiement Impossible (`ERR_CONNECTION_REFUSED`)

*   **Symptôme :** Le navigateur affichait une erreur de connexion, indiquant que le serveur local n'était pas accessible.
*   **Diagnostic :** La commande `npm run preview` lancée en arrière-plan ne démarrait pas correctement ou s'arrêtait immédiatement, sans que nous puissions voir le message d'erreur.
*   **Solution :** Nous avons relancé la commande `npm run preview` en avant-plan (sans `&`) pour capturer sa sortie. Cela nous a permis de voir l'erreur suivante.

## 2. Problème de Clé d'API Manquante (`API Key manquante`)

*   **Symptôme :** L'application signalait une clé d'API manquante. Le code cherchait `process.env.API_KEY`.
*   **Diagnostic :** Une analyse du fichier de configuration de Vite (`vite.config.ts`) a révélé que le projet était configuré pour lire une variable nommée `GEMINI_API_KEY` depuis un fichier `.env` à la racine du projet.
*   **Solution :** Nous avons créé un fichier `.env` et y avons ajouté la ligne `GEMINI_API_KEY="VOTRE_CLE_API_ICI"`.

## 3. Problème de Modèle Non Trouvé (`404 Not Found`)

*   **Symptôme :** L'API retournait une erreur 404, indiquant que le modèle demandé (`gemini-1.5-flash`, `gemini-pro`, etc.) n'était pas trouvé pour la version de l'API utilisée.
*   **Diagnostic :** C'était le problème le plus complexe, qui a nécessité plusieurs étapes pour être résolu :
    1.  **Version de l'API :** La bibliothèque `@google/genai` utilisait par défaut la version `v1beta` de l'API. Le projet Google Cloud de l'utilisateur n'avait pas accès aux modèles sur ce canal "bêta".
    2.  **Nom du Modèle :** Nos tentatives pour deviner un nom de modèle valide (`gemini-1.5-flash`, `gemini-pro`, `gemini-1.0-pro`) échouaient toutes, car aucun n'était disponible pour ce projet sur la version `v1beta`.
*   **Solution :
    1.  **Forcer la version stable de l'API :** Nous avons modifié l'initialisation du client `GoogleGenAI` pour forcer l'utilisation de la version `v1`, qui est stable et plus largement accessible :
        ```javascript
        const ai = new GoogleGenAI({ 
          apiKey, 
          httpOptions: { apiVersion: "v1" } 
        });
        ```
    2.  **Lister les modèles disponibles :** Pour arrêter de deviner, nous avons créé un script temporaire (`listModels.ts`) qui utilisait l'API pour lister tous les modèles auxquels la clé d'API avait accès.
    3.  **Utiliser un nom de modèle valide :** La liste a révélé que le modèle disponible était `gemini-2.5-flash`. Nous avons mis à jour le code pour utiliser ce nom exact.

## 4. Problème de Requête Malformée (`400 Bad Request`)

*   **Symptôme :** Une fois le bon modèle trouvé, l'API retournait une erreur 400, indiquant que le format de la requête était incorrect.
*   **Diagnostic :** Il y avait deux causes :
    1.  **Rôle `system` invalide :** La version `v1` de l'API n'accepte pas le rôle `system` dans les messages. Elle ne reconnaît que les rôles `user` et `model`.
    2.  **Paramètres de configuration invalides :** Les paramètres `systemInstruction`, `responseMimeType` et `responseSchema` que nous utilisions étaient des fonctionnalités de la version `v1beta` et n'existaient pas dans la `v1`.
*   **Solution :** Nous avons refactorisé la structure des requêtes API pour la rendre compatible avec la `v1` :
    *   Le rôle `system` a été supprimé. À la place, les instructions système ont été concaténées avec le prompt de l'utilisateur dans un seul message ayant le rôle `user`.
    *   L'objet de configuration contenant `responseSchema` et `responseMimeType` a été complètement retiré de l'appel API.

## 5. Problème de Parsing JSON (`SyntaxError: Unexpected token '`'`)

*   **Symptôme :** L'application plantait avec une erreur de syntaxe JSON.
*   **Diagnostic :** Le modèle IA répondait enfin, mais il enveloppait sa sortie JSON dans un bloc de code Markdown, comme ceci :
    ````
    ```json
    { "title": "..." }
    ```
    ````
    La fonction `JSON.parse()` ne peut pas interpréter une chaîne qui commence par ` ``` `.
*   **Solution :** Nous avons ajouté une étape de nettoyage pour supprimer ces délimiteurs Markdown de la chaîne de caractères avant de la passer à `JSON.parse()`.
    ```javascript
    const cleanedText = (response.text || '{}').replace(/^```json\n/, '').replace(/\n```$/, '');
    return JSON.parse(cleanedText);
    ```

## 6. Problème Final : Fiche Vide (Réponse JSON Vide)

*   **Symptôme :** L'application fonctionnait sans erreur, mais n'affichait aucune donnée.
*   **Diagnostic :** Le modèle retournait un objet JSON valide mais vide (`{}`). En retirant le paramètre `responseSchema` (une fonctionnalité de la `v1beta` qui force le format de sortie), nous avions aussi retiré le contexte qui décrivait la structure attendue. Le modèle ne savait donc plus quoi générer.
*   **Solution :** Nous avons "traduit" le `responseSchema` en texte brut et l'avons inséré directement dans l'instruction système. De cette manière, le modèle recevait un exemple clair de la structure JSON à remplir. Nous avons également rendu le prompt plus directif pour nous assurer qu'il génère une réponse complète.

Après cette dernière correction, le générateur est devenu pleinement fonctionnel.
