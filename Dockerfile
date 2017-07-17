FROM node:4.8.4-wheezy

ENV HTTP_PORT 4000

COPY . /app  
WORKDIR /app

RUN npm install --registry http://registry.cnpmjs.org

EXPOSE 4000

CMD ["npm", "start"]