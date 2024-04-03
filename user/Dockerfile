FROM node:lts-alpine3.19

EXPOSE 8080

WORKDIR /var/www

COPY package.json /var/www/

RUN npm install

COPY server.js /var/www

CMD ["npx", "nodemon", "server.js"]
