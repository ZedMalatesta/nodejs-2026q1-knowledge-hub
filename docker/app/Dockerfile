FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy the whole project (including the locally generated Prisma client which was un-ignored in .dockerignore)
COPY . .

# Generate Prisma client for the Docker environment
RUN npx prisma generate

RUN npm run build

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache curl bash git

COPY package*.json ./
RUN npm install --omit=dev

# Copy build artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

# Copy the pre-generated Prisma client from the build stage
# (avoids downloading engines during the build process)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/@prisma/client-runtime-utils ./node_modules/@prisma/client-runtime-utils

COPY docker/app/entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["sh", "entrypoint.sh"]