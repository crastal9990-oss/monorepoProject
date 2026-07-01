FROM node:20-slim

WORKDIR /app

# 用 corepack 激活 pnpm（Node.js 内置，不需要额外安装，省内存）
RUN corepack enable && corepack prepare pnpm@8.6.0 --activate

# 复制 monorepo 根配置（不含 .npmrc，ws-server 不依赖私有 TipTap Pro 包）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 复制所有 workspace 包的 package.json（pnpm 安装时需要）
COPY apps/ws-server/package.json ./apps/ws-server/package.json

# 安装依赖（只安装 ws-server 相关的）
RUN pnpm install --filter=ws-server --frozen-lockfile

# 复制 ws-server 源码
COPY apps/ws-server/ ./apps/ws-server/

WORKDIR /app/apps/ws-server

EXPOSE 1234

CMD ["npx", "tsx", "src/index.ts"]
