FROM node:20-alpine

# Install ffmpeg for media processing
RUN apk add --no-cache ffmpeg python3 make g++ git

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the project
COPY . .

# Expose health check port
EXPOSE 8000

# Start the bot
CMD ["node", "index.js"]
