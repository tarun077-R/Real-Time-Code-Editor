# Build the Frontend [dist]
# Copy the dist folder content into Backend/public folder

FROM node:20-alpine AS frontend-builder

COPY ./Frontend /app

WORKDIR /app

RUN npm install
RUN npm run build

# Backend Build
FROM node:20-alpine

COPY ./Backend /app

WORKDIR /app

RUN npm install

COPY --from=frontend-builder /app/dist /app/public

EXPOSE 3000

CMD ["node", "server.js"]