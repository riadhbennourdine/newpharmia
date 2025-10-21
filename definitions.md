## Définitions des Utilisateurs dans PharmIA

Voici les définitions et les relations entre "Abonné", "Prospect" et "Client" dans l'application PharmIA :

### Définitions

*   **Abonné (Subscriber)** :
    *   Il s'agit d'une personne dont l'adresse e-mail est enregistrée dans la base de données pour recevoir des communications (comme des newsletters).
    *   Un prospect ou un client peut également être un abonné. L'abonnement est principalement lié à la réception d'informations.
    *   Techniquement, lorsqu'un prospect est créé, son e-mail est ajouté à la liste des abonnés s'il n'y est pas déjà.

*   **Prospect** :
    *   C'est un utilisateur de rôle `PHARMACIEN` qui n'a **pas** d'abonnement actif et payant.
    *   Il peut être en période d'essai (`planName: 'Trial'`) ou n'avoir aucun abonnement (`hasActiveSubscription: false` ou non défini).
    *   Un prospect est une opportunité commerciale qui n'a pas encore converti en client payant.
    *   Le statut `ClientStatus.PROSPECT` lui est attribué lors de sa création.

*   **Client** :
    *   C'est un utilisateur de rôle `PHARMACIEN` qui a un **abonnement actif et payant** (`hasActiveSubscription: true` et `planName` différent de 'Trial').
    *   Un client est un utilisateur qui génère des revenus pour l'entreprise via un abonnement.

### Relations

1.  **Tous sont des `User`** : "Abonné", "Prospect" et "Client" sont tous basés sur l'interface `User` dans le système, ce qui signifie qu'ils partagent des propriétés communes comme l'e-mail, le nom, le rôle, etc.

2.  **Prospect -> Client** : Un prospect devient un client lorsqu'il souscrit à un abonnement payant et actif. C'est une progression dans le cycle de vie commercial.

3.  **Abonné (relation transversale)** :
    *   Un prospect est généralement un abonné (son e-mail est ajouté à la liste des abonnés lors de sa création).
    *   Un client est très probablement aussi un abonné, car il est déjà engagé avec la plateforme.
    *   L'état d'abonné est plus large et concerne la communication, tandis que prospect/client concerne le statut commercial et l'accès aux fonctionnalités payantes.

En résumé, la distinction clé entre un prospect et un client réside dans la présence et l'état de leur abonnement payant, tandis qu'un abonné est défini par sa volonté de recevoir des communications.