FROM node:16-bullseye

RUN apt-get update
RUN apt-get install ca-certificates libnss3 libatk-1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon-x11-0 libxcomposite-dev libxdamage1 libxrandr2 libgbm-dev libasound2 -y

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .

ENV REDIS_PASS=$REDIS_PASS
ENV REDIS_HOST=$REDIS_HOST
ENV REDIS_PORT=$REDIS_PORT

CMD ["node", "index.js"]
