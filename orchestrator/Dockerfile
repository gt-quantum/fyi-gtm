FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./
COPY orchestrator/package.json ./orchestrator/

# Install orchestrator dependencies
RUN cd orchestrator && npm install --production

# Copy source
COPY shared/ ./shared/
COPY orchestrator/ ./orchestrator/
COPY agents/ ./agents/
COPY workers/ ./workers/

WORKDIR /app/orchestrator

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
