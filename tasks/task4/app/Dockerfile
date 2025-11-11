FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --retries=3 CMD wget -qO- http://127.0.0.1:8080/ping || exit 1
USER node
CMD ["npm","start"]