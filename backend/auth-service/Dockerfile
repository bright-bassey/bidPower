FROM node:18-alpine

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

# Use the correct script from package.json
CMD ["yarn", "dev"]

EXPOSE 4000