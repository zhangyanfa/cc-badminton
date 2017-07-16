FROM node:6.11.1

ENV HTTP_PORT 4000

COPY . /app  
WORKDIR /app

RUN npm install

EXPOSE 4000

CMD ["npm", "start"]