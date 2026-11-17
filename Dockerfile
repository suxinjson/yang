FROM node:22-alpine3.22

WORKDIR /app
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache postgresql17-client

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --omit=dev

# Copy built frontend, static assets, and backend server
COPY dist ./dist
COPY public ./public
COPY server.js ./
COPY shared ./shared
COPY deploy/schema.sql ./deploy/schema.sql
COPY scripts/migrate-database.mjs ./scripts/migrate-database.mjs

# Create data directory for persistence
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
