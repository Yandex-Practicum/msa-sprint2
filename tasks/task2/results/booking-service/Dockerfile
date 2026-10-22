FROM node:18-alpine
WORKDIR /app
ENV KAFKAJS_NO_PARTITIONER_WARNING=1
COPY package.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 9090
CMD ["node", "index.js"]
