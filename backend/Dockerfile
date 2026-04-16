FROM node:20-slim

WORKDIR /app

# OpenSSL installeren (vereist door Prisma schema engine)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Dependencies
COPY backend/package*.json ./
RUN npm ci --ignore-scripts

# Broncode kopiëren
COPY backend/ .

# Prisma provider hardcoden voor PostgreSQL (env() niet toegestaan in provider field)
# en client genereren
RUN sed -i 's/provider = env("DATABASE_PROVIDER")/provider = "postgresql"/' ./prisma/schema.prisma && \
    DATABASE_URL=postgresql://placeholder npx prisma generate --schema=./prisma/schema.prisma

# TypeScript builden
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss && node dist/index.js"]
