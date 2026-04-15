FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY backend/package*.json ./
RUN npm ci --ignore-scripts

# Prisma schema kopiëren en client genereren
COPY backend/prisma ./prisma
RUN sed -i 's/provider = env("DATABASE_PROVIDER")/provider = "postgresql"/' ./prisma/schema.prisma && \
    DATABASE_URL=postgresql://placeholder npx prisma generate --schema=./prisma/schema.prisma

# Rest van de broncode
COPY backend/ .

# TypeScript builden
RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/index.js"]
