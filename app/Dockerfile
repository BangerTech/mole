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
RUN npm install

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