FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with verbose output to debug
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm cache clean --force && \
    npm install --verbose

# Create data directory for database connection storage
RUN mkdir -p /app/data

# Copy application code
COPY . .

# WICHTIG: Rechte setzen und als node laufen (nach dem Kopieren!)
RUN chown -R node:node /app/data
USER node

# Verify that express is installed
RUN ls -la /app/node_modules && \
    ls -la /app/node_modules/express || echo "Express module not found"

# Expose API port
EXPOSE 3001

# Command to run the server
CMD ["node", "server.js"] 