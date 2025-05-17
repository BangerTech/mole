FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    postgresql-client \
    mysql-client \
    curl

# Copy package files and install dependencies
COPY ./react-ui/package.json ./react-ui/package-lock.json* ./

# Increase npm timeout and fix potential permission issues
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm cache clean --force && \
    npm install --no-optional --legacy-peer-deps && \
    npm install ajv@8.12.0 ajv-keywords@5.1.0

# Copy all app files
COPY ./react-ui/ ./

# Build the React app
RUN npm run build

# Expose port
EXPOSE 8080

# Install serve for hosting the built app
RUN npm install -g serve

# Start the app using serve with client-side routing
CMD ["serve", "-s", "build", "-l", "8080"] 