# Use Node.js LTS (Long Term Support) as the base image
FROM node:22.14.0-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy app source code
COPY . .

RUN npm run build-ts

# Start the application
CMD [ "npm", "run", "prod" ]