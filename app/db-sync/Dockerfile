FROM python:3.10-alpine

# Install dependencies
RUN apk add --no-cache mysql-client postgresql-client bash curl

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . /app/

# Create scripts directory if it doesn't exist
RUN mkdir -p /app/scripts

# Make scripts executable (only if they exist)
RUN chmod +x /app/sync.sh /app/entrypoint.sh && \
    find /app/scripts -name "*.sh" -exec chmod +x {} \; || true

# Create config and logs directories
RUN mkdir -p /app/config /app/logs

# Default configuration
ENV SYNC_INTERVAL=86400
ENV LOG_LEVEL=info

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"] 