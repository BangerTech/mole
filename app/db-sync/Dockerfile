FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    default-mysql-client \
    postgresql-client \
    curl \
    gcc \
    g++ \
    make \
    libssl-dev \
    pkg-config \
    bash \
    git \
    # Install Rust for tokenizers
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && export PATH="$HOME/.cargo/bin:$PATH" \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Add Rust to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

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