FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY .env-sample .env

EXPOSE 3000

CMD ["npm", "run", "dev"] 