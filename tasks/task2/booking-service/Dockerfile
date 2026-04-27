FROM node:20-bookworm-slim

WORKDIR /app

COPY booking-service/package*.json ./
RUN npm install --omit=dev

COPY booking.proto ./booking.proto
COPY booking-service/src ./src
COPY booking-service/scripts ./scripts

EXPOSE 9090

CMD ["npm", "start"]
