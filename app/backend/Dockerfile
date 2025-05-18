FROM node:18-alpine

# Install su-exec for user switching
RUN apk add --no-cache su-exec

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with verbose output to debug
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm cache clean --force && \
    npm install --verbose

# Create data directory (permissions will be set by entrypoint)
RUN mkdir -p /app/data

# Copy application code
COPY . .

# Copy the entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
# Make the entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.sh

# Verify that express is installed
RUN ls -la /app/node_modules && \
    ls -la /app/node_modules/express || echo "Express module not found"

# Expose API port
EXPOSE 3001

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Command to run the server (will be passed to entrypoint)
# CMD ["node", "server.js"] 