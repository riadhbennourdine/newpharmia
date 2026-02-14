# --- Étape 1: Build (Construction) ---
# Utilise une image Node.js complète pour installer les dépendances et construire l'application
FROM node:20 AS builder

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer TOUTES les dépendances (dev et prod) pour construire le projet
RUN npm ci

# Copier le reste du code source
COPY . .

# Exécuter le script de build (qui doit compiler le frontend et le backend)
RUN npm run build


# --- Étape 2: Production ---
# Utilise une image Node.js plus légère pour l'exécution et ajoute dumb-init
FROM node:20-slim

# Install dumb-init
RUN apt-get update && apt-get install -y dumb-init --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer UNIQUEMENT les dépendances de production
RUN npm install --production

# Copier les artefacts de build de l'étape précédente
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/node_modules ./node_modules

# La commande pour démarrer le serveur de production.
# Utilise dumb-init pour gérer le processus principal et les signaux.
# Le ENTRYPOINT garantit que notre application est le PID 1.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist-server/server.js"]