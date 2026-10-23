FROM node:20-slim

# Install ffmpeg, imagemagick and git for media processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg imagemagick git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the project
COPY . .

# Expose health check port
EXPOSE 8000

# Start the bot with optimized memory limit to avoid container OOM kills
CMD ["node", "--max-old-space-size=400", "index.js"]
