FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npx", "next", "start", "-p", "3001"]
