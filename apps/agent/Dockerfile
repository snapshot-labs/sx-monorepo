FROM node:22-slim

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production=false

COPY . .
RUN yarn build

EXPOSE 3002

CMD ["sh", "-c", "yarn migrate && yarn start"]
