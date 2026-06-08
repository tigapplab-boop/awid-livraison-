@echo off
git add CHANGELOG.md
git add README.md
git add docker-compose.yml
git add mini-services/socket-service/Dockerfile
git add mini-services/socket-service/index.ts
git add next.config.ts
git add package-lock.json
git add package.json
git add prisma/schema.prisma
git add prisma/seed.ts
git add src/app/api/auth/route.ts
git add src/app/api/auth/verify/
git add src/app/api/notifications/subscribe/route.ts
git add src/app/api/orders-temp/
git add src/app/api/orders/
git add src/app/api/products/route.ts
git add src/bm/lib/
git add src/middleware.ts
git add tsconfig.json

git commit -F commit_message.txt
git push origin main
