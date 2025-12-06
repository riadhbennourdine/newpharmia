# --- Étape 1: Build (Construction) ---
# Utilise une image Node.js complète pour installer les dépendances et construire l'application
FROM node:18 AS builder

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (dev et prod) pour construire le projet
RUN npm install

# Copier le reste du code source
COPY . .

# Exécuter le script de build (qui doit compiler le frontend et le backend)
# Assurez-vous que votre package.json a un script "build" qui génère les répertoires 'dist' et 'dist-server'
RUN npm run build


# --- Étape 2: Production ---
# Utilise une image Node.js beaucoup plus légère (alpine) pour l'exécution
FROM node:18-alpine

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer UNIQUEMENT les dépendances de production
RUN npm prune --production

# Copier les artefacts de build de l'étape précédente
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Copy the migrated FTP files into a temporary location for the start script to move to the volume
COPY public/uploads_migration /temp_uploads

# La commande pour démarrer le serveur de production.
# Railway utilise par défaut la commande "start" de votre package.json.
# Assurez-vous que le script "start" exécute le bon fichier, par exemple : "node dist-server/server.js"
CMD [ "npm", "start" ]
