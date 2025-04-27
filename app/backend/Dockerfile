FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm cache clean --force && \
    npm install

# Create data directory for database connection storage
RUN mkdir -p /app/data

# Copy application code
COPY . .

# Expose API port
EXPOSE 3001

# Command to run the server
CMD ["node", "server.js"] 