FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy the rest of the application
COPY . .

EXPOSE 3000

# Use --host to ensure the app is accessible from outside the container
CMD ["yarn", "dev", "--host"] 