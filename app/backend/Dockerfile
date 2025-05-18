FROM node:18-alpine

# Switch to root to install su-exec and to ensure entrypoint runs as root
USER root

# Install su-exec (needed by entrypoint.sh)
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

# Create data directory for database connection storage
RUN mkdir -p /app/data

# Copy the entrypoint script and make it executable
COPY --chmod=0755 entrypoint.sh /app/entrypoint.sh

# Copy the rest of the application code
COPY . .

# ENTRYPOINT will run as root.
# The entrypoint.sh script is responsible for changing ownership of /app/data
# and then switching to the 'node' user using su-exec.
ENTRYPOINT ["/app/entrypoint.sh"]

# Command to run the server (will be passed as arguments to entrypoint.sh)
CMD ["node", "server.js"]

# Verify that express is installed
RUN ls -la /app/node_modules && \
    ls -la /app/node_modules/express || echo "Express module not found"

# Expose API port
EXPOSE 3001 