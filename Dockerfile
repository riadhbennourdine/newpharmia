# Stage 1: Build the application
FROM node:20 AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the server and the client
RUN npm run build


# Stage 2: Create the final production image
FROM node:20-slim

# Install Caddy
RUN apt-get update && apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && \
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list && \
    apt-get update && \
    apt-get install -y caddy

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
COPY Caddyfile .

# Expose the port Caddy will listen on (should be provided by env)
# Dokploy will map this to the public-facing port
EXPOSE 8080

# The command to run the application
# It starts the Node.js server in the background and Caddy in the foreground
CMD ["sh", "-c", "node dist-server/server.js & caddy run --config ./Caddyfile --adapter caddyfile"]
