FROM node:20-alpine

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend, static assets, and backend server
COPY dist ./dist
COPY public ./public
COPY server.js ./
COPY shared ./shared

# Create data directory for persistence
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
