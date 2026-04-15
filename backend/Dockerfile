FROM node:20-alpine

WORKDIR /app

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

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/index.js"]
