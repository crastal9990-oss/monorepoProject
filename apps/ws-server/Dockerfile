FROM node:20-slim

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 monorepo 根配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 复制所有 workspace 包的 package.json（pnpm 安装时需要）
COPY apps/ws-server/package.json ./apps/ws-server/package.json

# 安装依赖（只安装 ws-server 相关的）
RUN pnpm install --filter=ws-server --frozen-lockfile

# 复制 ws-server 源码
COPY apps/ws-server/ ./apps/ws-server/

WORKDIR /app/apps/ws-server

EXPOSE 1234

CMD ["npx", "tsx", "src/index.ts"]
