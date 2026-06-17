FROM node:20-alpine

# Install build dependencies if any native modules are needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
# --legacy-peer-deps is kept for your ApexCharts requirement
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Expose the port you defined in Compose
EXPOSE 3000

# Set the environment to development by default
ENV NODE_ENV=development

# Explicitly bind to the port and host
# Using 0.0.0.0 is crucial for Docker to route traffic correctly
CMD ["npx", "next", "dev", "-p", "3000"]