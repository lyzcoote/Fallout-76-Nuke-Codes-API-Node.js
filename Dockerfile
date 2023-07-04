FROM node:16-bullseye

RUN apt-get update
RUN apt-get install ca-certificates libnss3 -y

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .

ENV REDIS_PASS=$REDIS_PASS
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PORT=$REDIS_PORT

CMD ["node", "index.js"]
