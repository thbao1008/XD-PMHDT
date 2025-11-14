# Base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose ports cho FE/BE
EXPOSE 4002 5173

# Default command (sẽ override trong docker-compose)
CMD ["npm", "run", "dev:all"]
