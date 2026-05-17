FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY index.js grpc-client.js ./
COPY proto ./proto

EXPOSE 4001

CMD ["node", "index.js"]