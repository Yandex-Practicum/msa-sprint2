FROM node:20-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY booking.proto ./booking.proto
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/booking.proto ./booking.proto

CMD ["node", "dist/index.js"]
