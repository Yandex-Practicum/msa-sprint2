FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js ./

EXPOSE 4001
CMD ["node", "index.js"]