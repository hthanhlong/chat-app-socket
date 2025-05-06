# Use Node.js LTS (Long Term Support) as the base image
FROM node:22.14.0-alpine AS Production

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

# Build the application
RUN npm run build-ts

# Start the application

CMD [ "npm", "run", "prod" ]


FROM node:22.14.0-alpine AS Development

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

CMD [ "npm", "run", "dev" ]