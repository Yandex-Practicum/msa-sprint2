FROM node:20-bookworm-slim

WORKDIR /app

COPY booking-history-service/package*.json ./
RUN npm install --omit=dev

COPY booking-history-service/src ./src

CMD ["npm", "start"]
