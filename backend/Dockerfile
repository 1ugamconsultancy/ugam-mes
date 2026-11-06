# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Stage 2: Production Run
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY setup_ugam_mes_db.sql ./setup_ugam_mes_db.sql
COPY src/database/pharma-seed.sql ./src/database/pharma-seed.sql
COPY src/database/pharma-seed.sql ./pharma-seed.sql
COPY src/database/migration_master_data_plant_scoping.sql ./migration_master_data_plant_scoping.sql
COPY src/database/migration_master_data_plant_scoping.sql ./src/database/migration_master_data_plant_scoping.sql
EXPOSE 3000
CMD ["node", "dist/main"]
