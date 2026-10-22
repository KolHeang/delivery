FROM node:20-alpine

# Install build dependencies if any native modules are needed
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# 👉 បន្ថែម ២ ជួរនេះ ដើម្បីទាញយក URL ពី docker-compose មកប្រើប្រាស់ពេល Build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# IMPORTANT: Build the optimized production application
# This compiles everything, minimizes assets, and disables HMR
RUN npm run build

# Expose the port
EXPOSE 3000

# Set the environment to production so React/Next.js run faster
ENV NODE_ENV=production

# IMPORTANT: Run the production server, not the dev server
CMD ["npx", "next", "start", "-p", "3000"]