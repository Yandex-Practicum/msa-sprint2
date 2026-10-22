FROM node:18-alpine
WORKDIR /app
ENV KAFKAJS_NO_PARTITIONER_WARNING=1
COPY package.json ./
RUN npm install --omit=dev
COPY . .
CMD ["node", "index.js"]
