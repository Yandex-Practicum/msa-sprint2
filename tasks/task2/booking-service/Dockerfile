FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production || npm install --production --force
COPY . .
EXPOSE 9090
CMD ["node", "index.js"]
